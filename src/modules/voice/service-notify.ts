import "server-only";

import { and, count, eq, gte, inArray } from "drizzle-orm";

import { user } from "@/platform/database/auth-schema";
import type { Database } from "@/platform/database/client";
import type { Environment } from "@/platform/environment";

import { readConnectedIdentities } from "./client";
import { ROOM_ACCESS, VOICE_LIMITS } from "./contract";
import { NOTIFY_AUDIENCES, toLiveKitRoomName, type NotifyAudience } from "./service";
import { readVoiceConfig } from "./service-settings";
import { voiceFollow, voiceNotifyReceipt, voiceRoom, voiceRoomMember, voiceRoomReminder } from "./schema";

// Who a room start may reach (.ai/features/room-start-instant/SPEC.md): every active member, minus the host, anyone
// in the room and anyone who tapped Remind me (they get "Starting now" instead). The alert itself goes through
// notify() from src/shell/voice-alerts.ts, which also leaves out blocks, banned and deleted accounts.

const DAY_MS = 24 * 60 * 60_000;


export type AudienceInput = {
  audience: NotifyAudience;
  senderId: string;
  followerIds: readonly string[];
  pickedIds: readonly string[];
  // An invite-only room's list; null for an open room.
  invitedIds: readonly string[] | null;
  // Who is in the room now, and who tapped Remind me: they never get one.
  inRoomIds: readonly string[];
  remindedIds?: readonly string[];
};

// `among` null means every member (Everyone in an open room); `exclude` always applies.
export type ResolvedAudience = { among: string[] | null; exclude: Set<string> };

export function resolveAudience({ audience, senderId, followerIds, pickedIds, invitedIds, inRoomIds, remindedIds = [] }: AudienceInput): ResolvedAudience {
  const exclude = new Set([senderId, ...inRoomIds, ...remindedIds]);
  const chosen = audience === NOTIFY_AUDIENCES.followers ? followerIds : audience === NOTIFY_AUDIENCES.picked ? pickedIds : null;
  // An invite-only room notifies only its invited: Everyone means them, and the others narrow to them.
  const invited = invitedIds ? new Set(invitedIds) : null;
  const narrowed = chosen === null ? (invitedIds ? [...invitedIds] : null) : chosen.filter((id) => invited === null || invited.has(id));
  return { among: narrowed === null ? null : [...new Set(narrowed)].filter((id) => !exclude.has(id)), exclude };
}

export type NotifyRoom = { id: string; title: string; senderName: string; invitedIds: string[] | null; inRoomIds: string[]; remindedIds: string[] };

// The room and sender's words, the invite list, who is in it now (LiveKit's list; without it, who has joined), and who
// tapped Remind me.
export async function readNotifyRoom(database: Database, environment: Environment, roomId: string, senderId: string): Promise<NotifyRoom | null> {
  const [[room], [sender]] = await Promise.all([
    database.select({ id: voiceRoom.id, title: voiceRoom.title, access: voiceRoom.access }).from(voiceRoom).where(eq(voiceRoom.id, roomId)),
    database.select({ name: user.name }).from(user).where(eq(user.id, senderId)),
  ]);
  if (!room || !sender) return null;
  const [seats, reminders] = await Promise.all([
    database
      .select({ memberId: voiceRoomMember.memberId, isInvited: voiceRoomMember.isInvited, joinedAt: voiceRoomMember.joinedAt })
      .from(voiceRoomMember)
      .where(eq(voiceRoomMember.roomId, roomId)),
    database.select({ memberId: voiceRoomReminder.memberId }).from(voiceRoomReminder).where(eq(voiceRoomReminder.roomId, roomId)),
  ]);
  const config = await readVoiceConfig(database, environment);
  const connected = config ? await readConnectedIdentities(config, toLiveKitRoomName(roomId)) : null;
  const inRoomIds = connected ?? seats.filter(({ joinedAt }) => joinedAt !== null).map(({ memberId }) => memberId);
  return {
    id: room.id,
    title: room.title,
    senderName: sender.name,
    invitedIds: room.access === ROOM_ACCESS.invite ? seats.filter(({ isInvited }) => isInvited).map(({ memberId }) => memberId) : null,
    inRoomIds,
    remindedIds: reminders.map(({ memberId }) => memberId),
  };
}

// Only for a scheduled room saved before round 7 for its host's followers: Follow is gone, its rows stay until the
// owner decides.
export async function readFollowerIds(database: Database, memberId: string) {
  const rows = await database.select({ id: voiceFollow.followerId }).from(voiceFollow).where(eq(voiceFollow.followedId, memberId));
  return rows.map(({ id }) => id);
}

// Claims one receipt per member for this room: a member gets at most one alert per room, and at most 5 a day from
// other people's starts. Pass only members the alert will really reach (src/shell/voice-alerts.ts reads their alert
// state first), so a quiet evening never uses up the day's 5. Returns who may get it now, and how many the cap skipped.
export async function claimNotifyReceipts(database: Database, { roomId, senderId, memberIds }: { roomId: string; senderId: string; memberIds: string[] }, now = new Date()) {
  if (memberIds.length === 0) return { claimed: [] as string[], capped: 0 };
  const today = await database
    .select({ memberId: voiceNotifyReceipt.memberId, total: count() })
    .from(voiceNotifyReceipt)
    .where(and(inArray(voiceNotifyReceipt.memberId, memberIds), gte(voiceNotifyReceipt.createdAt, new Date(now.getTime() - DAY_MS))))
    .groupBy(voiceNotifyReceipt.memberId);
  const full = new Set(today.filter(({ total }) => total >= VOICE_LIMITS.notifiesReceivedPerDay).map(({ memberId }) => memberId));
  const open = memberIds.filter((id) => !full.has(id));
  const claimed =
    open.length === 0
      ? []
      : await database
          .insert(voiceNotifyReceipt)
          .values(open.map((memberId) => ({ roomId, memberId, senderId, createdAt: now })))
          .onConflictDoNothing()
          .returning({ memberId: voiceNotifyReceipt.memberId });
  return { claimed: claimed.map(({ memberId }) => memberId), capped: memberIds.length - open.length };
}
