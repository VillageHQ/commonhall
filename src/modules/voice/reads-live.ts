import "server-only";

import { and, count, desc, eq, gte, inArray } from "drizzle-orm";

import { user } from "@/platform/database/auth-schema";
import type { Database } from "@/platform/database/client";
import type { Environment } from "@/platform/environment";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { shownFaceColumns, toShownFaceUrl } from "@/modules/members/reads-pictures";

import { readConnectedIdentities } from "./client";
import { ROOM_STATUSES, type RoomRole } from "./contract";
import { voiceManifest } from "./manifest";
import { visibleTo } from "./reads";
import { readDemoSeededAt, toLiveKitRoomName } from "./service";
import { readVoiceConfig } from "./service-settings";
import { voiceRoom, voiceRoomMember } from "./schema";

// The live-room reads other screens use (Today's live strip, the Rooms tab's dot, admin Home's room joins). A
// contract for round 6 (.ai/features/simplify-round6/SPEC.md, part 0): screens outside Rooms read rooms only through
// these. Each answers empty or 0 while Rooms is off.

const FACES_PER_ROOM = 5;
const ROLE_ORDER: Record<RoomRole, number> = { host: 0, cohost: 1, speaker: 2, listener: 3 };

export type LiveRoomFace = { name: string; image: string | null };
export type LiveRoom = { id: string; title: string; hostName: string; faces: LiveRoomFace[]; count: number };

function isRoomsOn(database: Database) {
  return isModuleEnabled(database, voiceManifest);
}

// Everyone who has joined each room, stage first, then in the order they came in.
async function readJoined(database: Database, roomIds: string[]) {
  const rows = await database
    .select({ roomId: voiceRoomMember.roomId, id: user.id, name: user.name, role: voiceRoomMember.role, joinedAt: voiceRoomMember.joinedAt, ...shownFaceColumns(user.id) })
    .from(voiceRoomMember)
    .innerJoin(user, eq(user.id, voiceRoomMember.memberId))
    .where(inArray(voiceRoomMember.roomId, roomIds));
  const joined = rows
    .filter((row): row is typeof row & { joinedAt: Date } => row.joinedAt !== null)
    .sort((first, second) => ROLE_ORDER[first.role as RoomRole] - ROLE_ORDER[second.role as RoomRole] || first.joinedAt.getTime() - second.joinedAt.getTime());
  const byRoom = new Map<string, typeof joined>();
  for (const row of joined) byRoom.set(row.roomId, [...(byRoom.get(row.roomId) ?? []), row]);
  return byRoom;
}

// Live rooms looked at before picking the busiest: enough for any real community, and LiveKit is asked once per room.
const LIVE_ROOMS_RANKED = 50;

// The live rooms the viewer may see, busiest first (the newest on a tie), with the faces of the people in each and
// how many are in. The viewer's own face is left out ("who else is there"); the count is everyone. Who is in comes
// from LiveKit: someone who joined and left is gone from the card. While LiveKit can't say (no server set up, or out
// of reach), everyone who joined counts. In demo mode the seeded people count as in too, since nobody really connects
// for them (src/shell/demo-rooms.ts): their seats were taken before the demo was last seeded; a visitor's seat counts
// only while LiveKit lists them.
export async function readLiveRooms(database: Database, viewerId: string, limit: number, environment: Environment = process.env): Promise<LiveRoom[]> {
  if (limit <= 0 || !(await isRoomsOn(database))) return [];
  const rooms = await database
    .select({ id: voiceRoom.id, title: voiceRoom.title, hostName: user.name })
    .from(voiceRoom)
    .innerJoin(user, eq(user.id, voiceRoom.hostId))
    .where(and(eq(voiceRoom.status, ROOM_STATUSES.live), visibleTo(viewerId)))
    .orderBy(desc(voiceRoom.startedAt))
    .limit(LIVE_ROOMS_RANKED);
  if (rooms.length === 0) return [];
  const roomIds = rooms.map(({ id }) => id);
  const [config, joined, seededAt] = await Promise.all([readVoiceConfig(database, environment), readJoined(database, roomIds), readDemoSeededAt(database, environment)]);
  const connected = config ? await Promise.all(roomIds.map((id) => readConnectedIdentities(config, toLiveKitRoomName(id)))) : roomIds.map(() => null);
  const isSeeded = (joinedAt: Date) => seededAt !== null && joinedAt <= seededAt;
  const read = rooms.map((room, index) => {
    const present = connected[index] ?? null;
    const everyone = joined.get(room.id) ?? [];
    const people = present === null ? everyone : everyone.filter(({ id, joinedAt }) => present.includes(id) || isSeeded(joinedAt));
    // Someone connected with no join row yet (a race with the join call) counts, with no face.
    const count = present === null ? people.length : new Set([...people.map(({ id }) => id), ...present]).size;
    const others = people.filter(({ id }) => id !== viewerId);
    return {
      ...room,
      faces: others.slice(0, FACES_PER_ROOM).map((person) => ({ name: person.name, image: toShownFaceUrl(person.id, person.avatarUpdatedAt, person.filledFace) })),
      count,
    };
  });
  // A stable sort keeps the newest first among rooms with as many people.
  return read.toSorted((first, second) => second.count - first.count).slice(0, limit);
}

// How many live rooms the viewer may see: the Rooms tab's live dot.
export async function countLiveRooms(database: Database, viewerId: string): Promise<number> {
  if (!(await isRoomsOn(database))) return 0;
  const [row] = await database
    .select({ total: count() })
    .from(voiceRoom)
    .where(and(eq(voiceRoom.status, ROOM_STATUSES.live), visibleTo(viewerId)));
  return row?.total ?? 0;
}

// Room joins since a moment, for admin Home: each member counts once per room (a rejoin moves their time, it doesn't
// add a join).
export async function countRoomJoins(database: Database, since: Date): Promise<number> {
  if (!(await isRoomsOn(database))) return 0;
  const [row] = await database.select({ total: count() }).from(voiceRoomMember).where(gte(voiceRoomMember.joinedAt, since));
  return row?.total ?? 0;
}
