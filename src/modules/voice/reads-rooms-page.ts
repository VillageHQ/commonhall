import "server-only";

import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

import { user } from "@/platform/database/auth-schema";
import type { Database } from "@/platform/database/client";
import type { Environment } from "@/platform/environment";

import { ROOM_STATUSES, type RoomAccess, type RoomCard, type RoomsPageData, type RoomStatus } from "./contract";
import { readStages, toIso, visibleTo } from "./reads";
import { readLiveRooms } from "./reads-live";
import { readNotifyAllowance, readNotifyChoice } from "./service";
import { readVoiceConfig } from "./service-settings";
import { voiceFollow, voiceRoom, voiceRoomMember, voiceRoomReminder } from "./schema";

const ROOM_LIST_LENGTH = 50;

// The Rooms page: live rooms (newest first) with the faces of the people in each, rooms coming up (soonest first)
// with their host, and what "Start a room"'s Notify needs (today's allowance, the last choice).
export async function readRoomsPage(database: Database, environment: Environment, viewerId: string, now = new Date()): Promise<RoomsPageData> {
  const rows = await database
    .select({
      id: voiceRoom.id,
      title: voiceRoom.title,
      access: voiceRoom.access,
      status: voiceRoom.status,
      scheduledFor: voiceRoom.scheduledFor,
      startedAt: voiceRoom.startedAt,
      hostId: voiceRoom.hostId,
      hostName: user.name,
      hasReminder: sql<boolean>`exists (select 1 from ${voiceRoomReminder} where ${voiceRoomReminder.roomId} = ${voiceRoom.id} and ${voiceRoomReminder.memberId} = ${viewerId})`,
      isInvited: sql<boolean>`exists (select 1 from ${voiceRoomMember} where ${voiceRoomMember.roomId} = ${voiceRoom.id} and ${voiceRoomMember.memberId} = ${viewerId} and ${voiceRoomMember.isInvited})`,
      isFollowingHost: sql<boolean>`exists (select 1 from ${voiceFollow} where ${voiceFollow.followerId} = ${viewerId} and ${voiceFollow.followedId} = ${voiceRoom.hostId})`,
    })
    .from(voiceRoom)
    .innerJoin(user, eq(user.id, voiceRoom.hostId))
    .where(and(inArray(voiceRoom.status, [ROOM_STATUSES.live, ROOM_STATUSES.scheduled]), visibleTo(viewerId)))
    .orderBy(desc(voiceRoom.startedAt), asc(voiceRoom.scheduledFor))
    .limit(ROOM_LIST_LENGTH);
  const scheduledIds = rows.filter((row) => row.status === ROOM_STATUSES.scheduled).map(({ id }) => id);
  const [config, liveRooms, stages, allowance, choice] = await Promise.all([
    readVoiceConfig(database, environment),
    readLiveRooms(database, viewerId, ROOM_LIST_LENGTH, environment),
    readStages(database, scheduledIds),
    readNotifyAllowance(database, viewerId, now),
    readNotifyChoice(database, viewerId),
  ]);
  const live = new Map(liveRooms.map((room) => [room.id, room]));
  const cards: RoomCard[] = rows.map((row) => {
    const inRoom = live.get(row.id);
    const faces = inRoom ? inRoom.faces.map(({ name, image }) => ({ name, faceUrl: image })) : (stages.get(row.id) ?? []).map(({ name, faceUrl }) => ({ name, faceUrl }));
    return {
      ...row,
      access: row.access as RoomAccess,
      status: row.status as RoomStatus,
      scheduledFor: toIso(row.scheduledFor),
      startedAt: toIso(row.startedAt),
      faces,
      count: inRoom?.count ?? 0,
    };
  });
  return {
    live: cards.filter((card) => card.status === ROOM_STATUSES.live),
    scheduled: cards.filter((card) => card.status === ROOM_STATUSES.scheduled).sort((first, second) => (first.scheduledFor ?? "").localeCompare(second.scheduledFor ?? "")),
    isConfigured: config !== null,
    notify: { ...allowance, choice },
  };
}
