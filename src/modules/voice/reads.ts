import "server-only";

import { and, asc, desc, eq, ilike, inArray, ne, or, sql } from "drizzle-orm";

import { user } from "@/platform/database/auth-schema";
import type { Database } from "@/platform/database/client";
import type { Environment } from "@/platform/environment";
import { isListedInDirectory, toContainsPattern } from "@/modules/members/reads-directory";
import { shownFaceColumns, toShownFaceUrl } from "@/modules/members/reads-pictures";

import { readParticipantCounts } from "./client";
import { isOnStage, ROOM_ACCESS, ROOM_ROLES, ROOM_STATUSES, VOICE_LIMITS, type RoomAccess, type RoomCard, type RoomFace, type RoomPeople, type RoomRole, type RoomStatus } from "./contract";
import { countBroadcastsToday, toLiveKitRoomName } from "./service";
import { readVoiceConfig } from "./service-settings";
import { voiceRoom, voiceRoomMember, voiceRoomReminder } from "./schema";

const SEARCH_RESULTS = 20;
const ROOM_LIST_LENGTH = 50;
const ROLE_ORDER: Record<RoomRole, number> = { host: 0, cohost: 1, speaker: 2, listener: 3 };

// A room the viewer may see: open to everyone, or invite only with the viewer on its list.
function visibleTo(viewerId: string) {
  return or(
    eq(voiceRoom.access, ROOM_ACCESS.open),
    sql`exists (select 1 from ${voiceRoomMember} where ${voiceRoomMember.roomId} = ${voiceRoom.id} and ${voiceRoomMember.memberId} = ${viewerId} and ${voiceRoomMember.isInvited})`,
  );
}

async function readStages(database: Database, roomIds: string[]) {
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

function toIso(value: Date | null) {
  return value ? value.toISOString() : null;
}

export type AvailableToTalkState = { broadcastsLeft: number; isConfigured: boolean };
export type RoomsPage = { live: RoomCard[]; scheduled: RoomCard[] } & AvailableToTalkState;

function toBroadcastsLeft(broadcastsToday: number) {
  return Math.max(0, VOICE_LIMITS.broadcastsPerDay - broadcastsToday);
}

// What "I'm available to talk" needs outside Rooms (the Inbox, a conversation): no room list, no LiveKit call.
export async function readAvailableToTalk(database: Database, environment: Environment, viewerId: string, now = new Date()): Promise<AvailableToTalkState> {
  const [config, broadcasts] = await Promise.all([readVoiceConfig(database, environment), countBroadcastsToday(database, viewerId, now)]);
  return { broadcastsLeft: toBroadcastsLeft(broadcasts), isConfigured: config !== null };
}

// Live rooms now (newest first) and scheduled rooms (soonest first), with their stage faces and how many are in.
export async function readRoomsPage(database: Database, environment: Environment, viewerId: string, now = new Date()): Promise<RoomsPage> {
  const rows = await database
    .select({
      id: voiceRoom.id,
      title: voiceRoom.title,
      access: voiceRoom.access,
      status: voiceRoom.status,
      scheduledFor: voiceRoom.scheduledFor,
      startedAt: voiceRoom.startedAt,
      isBroadcast: voiceRoom.isBroadcast,
      hostId: voiceRoom.hostId,
      hostName: user.name,
      hasReminder: sql<boolean>`exists (select 1 from ${voiceRoomReminder} where ${voiceRoomReminder.roomId} = ${voiceRoom.id} and ${voiceRoomReminder.memberId} = ${viewerId})`,
      isInvited: sql<boolean>`exists (select 1 from ${voiceRoomMember} where ${voiceRoomMember.roomId} = ${voiceRoom.id} and ${voiceRoomMember.memberId} = ${viewerId} and ${voiceRoomMember.isInvited})`,
    })
    .from(voiceRoom)
    .innerJoin(user, eq(user.id, voiceRoom.hostId))
    .where(and(inArray(voiceRoom.status, [ROOM_STATUSES.live, ROOM_STATUSES.scheduled]), visibleTo(viewerId)))
    .orderBy(desc(voiceRoom.startedAt), asc(voiceRoom.scheduledFor))
    .limit(ROOM_LIST_LENGTH);
  const config = await readVoiceConfig(database, environment);
  const liveIds = rows.filter((row) => row.status === ROOM_STATUSES.live).map(({ id }) => id);
  const [stages, counts, broadcasts] = await Promise.all([
    readStages(database, rows.map(({ id }) => id)),
    config ? readParticipantCounts(config, liveIds.map(toLiveKitRoomName)) : Promise.resolve(new Map<string, number>()),
    countBroadcastsToday(database, viewerId, now),
  ]);
  const cards: RoomCard[] = rows.map((row) => {
    const stage = stages.get(row.id) ?? [];
    const inRoom = counts.get(toLiveKitRoomName(row.id)) ?? 0;
    return {
      ...row,
      access: row.access as RoomAccess,
      status: row.status as RoomStatus,
      scheduledFor: toIso(row.scheduledFor),
      startedAt: toIso(row.startedAt),
      stage,
      listenerCount: inRoom,
    };
  });
  return {
    live: cards.filter((card) => card.status === ROOM_STATUSES.live),
    scheduled: cards.filter((card) => card.status === ROOM_STATUSES.scheduled).sort((first, second) => (first.scheduledFor ?? "").localeCompare(second.scheduledFor ?? "")),
    broadcastsLeft: toBroadcastsLeft(broadcasts),
    isConfigured: config !== null,
  };
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
};

// One room for its page, or null when the viewer may not see it (an invite-only room they're not on).
export async function readRoomView(database: Database, viewerId: string, roomId: string): Promise<RoomView | null> {
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
  const stage = (await readStages(database, [roomId])).get(roomId) ?? [];
  return {
    ...row,
    access: row.access as RoomAccess,
    status: row.status as RoomStatus,
    scheduledFor: toIso(row.scheduledFor),
    viewerRole: (seat?.role as RoomRole | undefined) ?? null,
    isViewerInvited: Boolean(seat?.isInvited),
    stage: stage.filter((face) => isOnStage(face.role)),
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
