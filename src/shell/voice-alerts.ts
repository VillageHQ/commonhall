import "server-only";

import { and, eq, inArray, ne, notExists, notLike, or, sql } from "drizzle-orm";

import { memberBlock } from "@/modules/members/schema";
import { ROOM_NOTIFY_BODY, toRoomHref, toRoomNotifyTitle } from "@/modules/voice/contract";
import { voiceManifest } from "@/modules/voice/manifest";
import { claimDueReminders, NOTIFY_AUDIENCES, recordReached, type ClaimedNotify, type NotifyAudience } from "@/modules/voice/service";
import { claimNotifyReceipts, readFollowerIds, readNotifyRoom, resolveAudience } from "@/modules/voice/service-notify";
import { isActiveMember } from "@/platform/auth/member-status";
import { RECLAIMED_EMAIL_DOMAIN } from "@/platform/auth/reclaimed-email";
import { user } from "@/platform/database/auth-schema";
import type { Database } from "@/platform/database/client";
import type { Environment } from "@/platform/environment";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { NOTIFICATION_KINDS } from "@/platform/notifications/contract";
import { notify, type NotifyResult } from "@/platform/notifications/notify";
import { readMutersOf, readPreferencesFor } from "@/platform/notifications/reads";
import { readSkipReason } from "@/platform/notifications/rules";
import { notificationDevice } from "@/platform/notifications/schema";
import { runAfterResponse } from "@/platform/observability/after-response";
import { logError } from "@/platform/observability/route-logging";
import { removeBidiControls } from "@/platform/text/safe-text";

// Voice rooms' alerts, through notify(): a room start ("Maya started “Pricing”", to every member) and "Starting now"
// to those who tapped Remind me. notify() skips members who turned alerts or room alerts off, are in quiet times or a
// pause, or muted the host. Here we also leave out banned and deleted accounts and anyone either side of a block, and
// a start reaches each member once per room and at most 5 times a day.

// `audience` is "everyone" for every room made since round 7; older scheduled rooms keep their host's saved choice.
export type RoomNotify = { roomId: string; senderId: string; audience: NotifyAudience; memberIds?: string[] };
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

// The members notify() would hold back now (room alerts off, quiet times, a pause, a mute of the host). They claim no
// receipt, so a quiet evening never uses up their 5 a day, but notify() still sees them and logs why they were skipped.
async function readHeldBack(database: Database, memberIds: string[], senderId: string, now: Date) {
  const [preferences, muters] = await Promise.all([readPreferencesFor(database, memberIds), readMutersOf(database, memberIds, senderId)]);
  const kind = NOTIFICATION_KINDS.voiceBroadcast;
  return new Set(
    memberIds.filter((memberId) => {
      const state = preferences.get(memberId);
      return state ? readSkipReason(state, { kind, fromUserId: senderId, mutedUserIds: muters.has(memberId) ? new Set([senderId]) : new Set(), now }) !== null : false;
    }),
  );
}

// Sends one room start alert: the audience resolved for the room (everyone, minus the host, anyone in the room and
// anyone who tapped Remind me; an older room keeps its saved audience and invite list), the receipts claimed for the
// members it will really reach, then notify(). Returns notify()'s counts plus how many the daily cap skipped.
export async function sendRoomNotify(database: Database, environment: Environment, { roomId, senderId, audience, memberIds = [] }: RoomNotify, now = new Date()): Promise<RoomNotifyResult> {
  const room = await readNotifyRoom(database, environment, roomId, senderId);
  if (!room) return { ...NOTHING_SENT, capped: 0 };
  const followerIds = audience === NOTIFY_AUDIENCES.followers ? await readFollowerIds(database, senderId) : [];
  const { among, exclude } = resolveAudience({ audience, senderId, followerIds, pickedIds: memberIds, invitedIds: room.invitedIds, inRoomIds: room.inRoomIds, remindedIds: room.remindedIds });
  const reachable = (await readReachableMemberIds(database, senderId, among ?? undefined)).filter((id) => !exclude.has(id));
  const heldBack = await readHeldBack(database, reachable, senderId, now);
  const { claimed, capped } = await claimNotifyReceipts(database, { roomId, senderId, memberIds: reachable.filter((id) => !heldBack.has(id)) }, now);
  // Counted in the server log: the members past their 5 a day.
  if (capped > 0) console.log(JSON.stringify({ level: "info", scope: "voice-notify-capped", roomId, capped }));
  const userIds = [...claimed, ...heldBack];
  if (userIds.length === 0) return { ...NOTHING_SENT, capped };
  const result = await notify(
    {
      userIds,
      kind: NOTIFICATION_KINDS.voiceBroadcast,
      title: toRoomNotifyTitle(removeBidiControls(room.senderName), removeBidiControls(room.title)),
      body: ROOM_NOTIFY_BODY,
      url: toRoomHref(roomId),
      fromUserId: senderId,
    },
    { database, environment, now },
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
