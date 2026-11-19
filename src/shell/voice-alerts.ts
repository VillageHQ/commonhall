import "server-only";

import { and, eq, inArray, ne, notExists, notLike, or, sql } from "drizzle-orm";

import { memberBlock } from "@/modules/members/schema";
import { toRoomHref } from "@/modules/voice/contract";
import { voiceManifest } from "@/modules/voice/manifest";
import { claimDueReminders } from "@/modules/voice/service";
import { isActiveMember } from "@/platform/auth/member-status";
import { RECLAIMED_EMAIL_DOMAIN } from "@/platform/auth/reclaimed-email";
import { user } from "@/platform/database/auth-schema";
import type { Database } from "@/platform/database/client";
import type { Environment } from "@/platform/environment";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { NOTIFICATION_KINDS } from "@/platform/notifications/contract";
import { notify, type NotifyResult } from "@/platform/notifications/notify";
import { notificationDevice } from "@/platform/notifications/schema";
import { runAfterResponse } from "@/platform/observability/after-response";
import { logError } from "@/platform/observability/route-logging";
import { removeBidiControls } from "@/platform/text/safe-text";

// Voice rooms' alerts, through notify(): "Maya is available to talk" to every member, and "Starting now" to those
// who tapped Remind me. notify() skips members who turned alerts or that kind off, are in quiet hours, or muted the
// sender (broadcasts only). Here we also leave out banned and deleted accounts and anyone either side of a block.

export type AvailableAlert = { roomId: string; hostId: string; hostName: string };
export type RoomReminder = { id: string; title: string; hostId: string; memberIds: string[] };

const NOTHING_SENT: NotifyResult = { sent: 0, skipped: 0, failed: 0, removed: 0 };

// Either side of a block: the blocker never hears from the blocked, and the blocked never learns of the blocker.
function noBlockBetween(database: Database, senderId: string) {
  const between = or(
    and(eq(memberBlock.blockerId, user.id), eq(memberBlock.blockedId, senderId)),
    and(eq(memberBlock.blockerId, senderId), eq(memberBlock.blockedId, user.id)),
  );
  return notExists(database.select({ one: sql`1` }).from(memberBlock).where(between));
}

// The members an alert from `senderId` may reach: active, not deleted, no block either way, with a device on file
// (no device, no alert, so the rest needn't be read). `among` narrows it to a list, like a room's reminders.
async function readReachableMemberIds(database: Database, senderId: string, among?: string[]) {
  if (among && among.length === 0) return [];
  const rows = await database
    .selectDistinct({ id: user.id })
    .from(user)
    .innerJoin(notificationDevice, eq(notificationDevice.userId, user.id))
    .where(
      and(
        isActiveMember(),
        notLike(user.email, `%@${RECLAIMED_EMAIL_DOMAIN}`),
        ne(user.id, senderId),
        noBlockBetween(database, senderId),
        among ? inArray(user.id, among) : undefined,
      ),
    );
  return rows.map(({ id }) => id);
}

export async function sendAvailableAlert(database: Database, environment: Environment, { roomId, hostId, hostName }: AvailableAlert) {
  const userIds = await readReachableMemberIds(database, hostId);
  if (userIds.length === 0) return NOTHING_SENT;
  const name = removeBidiControls(hostName);
  return notify(
    {
      userIds,
      kind: NOTIFICATION_KINDS.voiceBroadcast,
      title: `${name} is available to talk`,
      body: `${name} opened a room. Tap to join them.`,
      url: toRoomHref(roomId),
      fromUserId: hostId,
    },
    { database, environment },
  );
}

export async function sendRoomReminders(database: Database, environment: Environment, reminders: RoomReminder[]) {
  const totals = { ...NOTHING_SENT };
  for (const { id, title, hostId, memberIds } of reminders) {
    const userIds = await readReachableMemberIds(database, hostId, memberIds);
    if (userIds.length === 0) continue;
    const result = await notify(
      {
        userIds,
        kind: NOTIFICATION_KINDS.voiceRoom,
        title: `Starting now: ${removeBidiControls(title)}`,
        body: "The room you asked to be reminded about is open. Tap to join.",
        url: toRoomHref(id),
        fromUserId: hostId,
      },
      { database, environment },
    );
    for (const key of Object.keys(totals) as (keyof NotifyResult)[]) totals[key] += result[key];
  }
  return totals;
}

// For routes: the alerts go after the response, and a failure is only logged.
function soon(label: string, task: () => Promise<unknown>) {
  runAfterResponse(async () => {
    try {
      await task();
    } catch (error) {
      logError(label, error);
    }
  });
}

export function sendAvailableAlertSoon(database: Database, environment: Environment, alert: AvailableAlert) {
  soon("voice-available-alert", () => sendAvailableAlert(database, environment, alert));
}

export function sendRoomRemindersSoon(database: Database, environment: Environment, reminders: RoomReminder[]) {
  soon("voice-reminder-alert", () => sendRoomReminders(database, environment, reminders));
}

// The minute job: scheduled rooms whose time has come send their reminders once. Runs only while Rooms is on.
export async function runVoiceReminders(database: Database, environment: Environment, now = new Date()) {
  if (!(await isModuleEnabled(database, voiceManifest))) return NOTHING_SENT;
  return sendRoomReminders(database, environment, await claimDueReminders(database, now));
}
