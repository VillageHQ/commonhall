import "server-only";

import { and, eq, inArray, ne, notExists, notLike, or, sql } from "drizzle-orm";

import { memberBlock } from "@/modules/members/schema";
import { NOTIFY_AUDIENCES, ROOM_NOTIFY_BODY, toRoomHref, toRoomNotifyTitle, type NotifyAudience } from "@/modules/voice/contract";
import { voiceManifest } from "@/modules/voice/manifest";
import { claimDueReminders, recordReached, type ClaimedNotify } from "@/modules/voice/service";
import { claimNotifyReceipts, readFollowerIds, readNotifyRoom, resolveAudience } from "@/modules/voice/service-notify";
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

// Voice rooms' alerts, through notify(): a room notify ("Maya started “Pricing”", to her followers, people she picked
// or everyone) and "Starting now" to those who tapped Remind me. notify() skips members who turned alerts or that kind
// off, are in quiet times, or muted the sender (room notifies). Here we also leave out banned and deleted accounts and
// anyone either side of a block, and a room notify reaches each member once per room and at most 5 times a day.

export type RoomNotify = { roomId: string; senderId: string; audience: NotifyAudience; memberIds?: string[]; isStart?: boolean };
export type RoomNotifyResult = NotifyResult & { capped: number };
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

// Sends one room notify: the audience resolved for the room (invite-only rooms reach only their invited; nobody in
// the room gets one), the receipts claimed, then notify(). Returns notify()'s counts plus how many the daily cap skipped.
export async function sendRoomNotify(database: Database, environment: Environment, { roomId, senderId, audience, memberIds = [], isStart = true }: RoomNotify): Promise<RoomNotifyResult> {
  const room = await readNotifyRoom(database, environment, roomId, senderId);
  if (!room) return { ...NOTHING_SENT, capped: 0 };
  const followerIds = audience === NOTIFY_AUDIENCES.followers ? await readFollowerIds(database, senderId) : [];
  const { among, exclude } = resolveAudience({ audience, senderId, followerIds, pickedIds: memberIds, invitedIds: room.invitedIds, inRoomIds: room.inRoomIds });
  const reachable = (await readReachableMemberIds(database, senderId, among ?? undefined)).filter((id) => !exclude.has(id));
  const { claimed, capped } = await claimNotifyReceipts(database, { roomId, senderId, memberIds: reachable });
  // Counted in the server log: the members past their 5 a day.
  if (capped > 0) console.log(JSON.stringify({ level: "info", scope: "voice-notify-capped", roomId, capped }));
  if (claimed.length === 0) return { ...NOTHING_SENT, capped };
  const result = await notify(
    {
      userIds: claimed,
      kind: NOTIFICATION_KINDS.voiceBroadcast,
      title: toRoomNotifyTitle(removeBidiControls(room.senderName), removeBidiControls(room.title), isStart),
      body: ROOM_NOTIFY_BODY,
      url: toRoomHref(roomId),
      fromUserId: senderId,
    },
    { database, environment },
  );
  return { ...result, capped };
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

// A claimed notify, after the response; its row records how many it reached.
export function sendRoomNotifySoon(database: Database, environment: Environment, claimed: ClaimedNotify) {
  soon("voice-room-notify", async () => {
    const result = await sendRoomNotify(database, environment, claimed);
    await recordReached(database, claimed.broadcastId, result.sent);
  });
}

export function sendRoomRemindersSoon(database: Database, environment: Environment, reminders: RoomReminder[]) {
  soon("voice-reminder-alert", () => sendRoomReminders(database, environment, reminders));
}

// The minute job: scheduled rooms whose time has come send their reminders once. Runs only while Rooms is on.
export async function runVoiceReminders(database: Database, environment: Environment, now = new Date()) {
  if (!(await isModuleEnabled(database, voiceManifest))) return NOTHING_SENT;
  return sendRoomReminders(database, environment, await claimDueReminders(database, now));
}
