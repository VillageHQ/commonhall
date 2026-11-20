import "server-only";

import { and, asc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";

import { user } from "@/platform/database/auth-schema";
import type { Database } from "@/platform/database/client";
import { isListedInDirectory, toContainsPattern } from "@/modules/members/reads-directory";
import { shownFaceColumns, toShownFaceUrl } from "@/modules/members/reads-pictures";

import { isOnStage, ROOM_ACCESS, ROOM_ROLES, type NotifyAllowance, type RoomAccess, type RoomFace, type RoomPeople, type RoomRole, type RoomStatus } from "./contract";
import { hasNotified, readNotifyAllowance } from "./service";
import { voiceRoom, voiceRoomMember, voiceRoomReminder } from "./schema";

const SEARCH_RESULTS = 20;
const ROLE_ORDER: Record<RoomRole, number> = { host: 0, cohost: 1, speaker: 2, listener: 3 };

// A room the viewer may see: open to everyone, or invite only with the viewer on its list.
export function visibleTo(viewerId: string) {
  return or(
    eq(voiceRoom.access, ROOM_ACCESS.open),
    sql`exists (select 1 from ${voiceRoomMember} where ${voiceRoomMember.roomId} = ${voiceRoom.id} and ${voiceRoomMember.memberId} = ${viewerId} and ${voiceRoomMember.isInvited})`,
  );
}

// Each room's host, co-hosts and speakers, host first.
export async function readStages(database: Database, roomIds: string[]) {
  if (roomIds.length === 0) return new Map<string, RoomFace[]>();
  const rows = await database
    .select({ roomId: voiceRoomMember.roomId, id: user.id, name: user.name, role: voiceRoomMember.role, ...shownFaceColumns(user.id) })
    .from(voiceRoomMember)
    .innerJoin(user, eq(user.id, voiceRoomMember.memberId))
    .where(and(inArray(voiceRoomMember.roomId, roomIds), ne(voiceRoomMember.role, ROOM_ROLES.listener)));
  const stages = new Map<string, RoomFace[]>();
  for (const row of rows) {
    const face = { id: row.id, name: row.name, faceUrl: toShownFaceUrl(row.id, row.avatarUpdatedAt, row.filledFace), role: row.role as RoomRole };
    stages.set(row.roomId, [...(stages.get(row.roomId) ?? []), face]);
  }
  for (const faces of stages.values()) faces.sort((first, second) => ROLE_ORDER[first.role] - ROLE_ORDER[second.role]);
  return stages;
}

export function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

export type RoomView = {
  id: string;
  title: string;
  access: RoomAccess;
  status: RoomStatus;
  scheduledFor: string | null;
  hostId: string;
  hostName: string;
  viewerRole: RoomRole | null;
  isViewerInvited: boolean;
  hasReminder: boolean;
  stage: RoomFace[];
  // For "Tell people I'm here": whether the viewer told people about this room already, and what's left today.
  hasNotified: boolean;
  notify: NotifyAllowance;
};

// One room for its page, or null when the viewer may not see it (an invite-only room they're not on).
export async function readRoomView(database: Database, viewerId: string, roomId: string, now = new Date()): Promise<RoomView | null> {
  const [row] = await database
    .select({
      id: voiceRoom.id,
      title: voiceRoom.title,
      access: voiceRoom.access,
      status: voiceRoom.status,
      scheduledFor: voiceRoom.scheduledFor,
      hostId: voiceRoom.hostId,
      hostName: user.name,
      hasReminder: sql<boolean>`exists (select 1 from ${voiceRoomReminder} where ${voiceRoomReminder.roomId} = ${voiceRoom.id} and ${voiceRoomReminder.memberId} = ${viewerId})`,
    })
    .from(voiceRoom)
    .innerJoin(user, eq(user.id, voiceRoom.hostId))
    .where(eq(voiceRoom.id, roomId));
  if (!row) return null;
  const [seat] = await database
    .select({ role: voiceRoomMember.role, isInvited: voiceRoomMember.isInvited })
    .from(voiceRoomMember)
    .where(and(eq(voiceRoomMember.roomId, roomId), eq(voiceRoomMember.memberId, viewerId)));
  if (row.access === ROOM_ACCESS.invite && !seat?.isInvited) return null;
  const [stages, notified, notify] = await Promise.all([readStages(database, [roomId]), hasNotified(database, roomId, viewerId), readNotifyAllowance(database, viewerId, now)]);
  const stage = stages.get(roomId) ?? [];
  return {
    ...row,
    access: row.access as RoomAccess,
    status: row.status as RoomStatus,
    scheduledFor: toIso(row.scheduledFor),
    viewerRole: (seat?.role as RoomRole | undefined) ?? null,
    isViewerInvited: Boolean(seat?.isInvited),
    stage: stage.filter((face) => isOnStage(face.role)),
    hasNotified: notified,
    notify,
  };
}

// Members to invite, by name, among those the directory lists. Never their email.
export async function searchRoomPeople(database: Database, viewerId: string, search: string, now = new Date()): Promise<RoomPeople> {
  const words = search.replace(/[%_\\]/g, "").trim();
  const rows = await database
    .select({ id: user.id, name: user.name, ...shownFaceColumns(user.id) })
    .from(user)
    .where(and(isListedInDirectory(now), ne(user.id, viewerId), words ? ilike(user.name, toContainsPattern(words)) : undefined))
    .orderBy(asc(user.name))
    .limit(SEARCH_RESULTS);
  return rows.map((row) => ({ id: row.id, name: row.name, faceUrl: toShownFaceUrl(row.id, row.avatarUpdatedAt, row.filledFace) }));
}
