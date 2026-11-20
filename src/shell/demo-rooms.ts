import "server-only";

import { ROOM_ACCESS, ROOM_ROLES, ROOM_STATUSES, type RoomRole } from "@/modules/voice/contract";
import { voiceFollow, voiceRoom, voiceRoomMember } from "@/modules/voice/schema";
import type { Transaction } from "@/platform/database/client";

// The demo's Rooms: one room live now, with people on stage and listening, and one coming up. Made-up titles, the
// demo people only. The upkeep leaves these rooms as they are until the nightly reset (service.ts, demo mode), so the
// live one stays live. Sam follows two hosts, so "My followers" has someone to reach.

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;

type DemoRoom = {
  title: string;
  host: string;
  // Live rooms: started this many minutes ago. Scheduled rooms: start this many hours from now (on the hour).
  startedMinutesAgo?: number;
  startsInHours?: number;
  people: readonly (readonly [key: string, role: RoomRole])[];
};

const DEMO_ROOMS: readonly DemoRoom[] = [
  {
    title: "Pricing your first enterprise deal",
    host: "priya.shah",
    startedMinutesAgo: 12,
    people: [
      ["ada.okafor", ROOM_ROLES.cohost],
      ["marcus.webb", ROOM_ROLES.listener],
      ["elena.rossi", ROOM_ROLES.listener],
      ["tomas.novak", ROOM_ROLES.listener],
    ],
  },
  { title: "Hiring your first salesperson", host: "elena.rossi", startsInHours: 26, people: [["oliver.grant", ROOM_ROLES.speaker]] },
];

const DEMO_FOLLOWS: readonly (readonly [follower: string, followed: string])[] = [
  ["sam.lee", "priya.shah"],
  ["sam.lee", "elena.rossi"],
  ["marcus.webb", "sam.lee"],
  ["ada.okafor", "sam.lee"],
];

function onTheHour(time: number) {
  return new Date(Math.ceil(time / HOUR_MS) * HOUR_MS);
}

export async function seedRooms(transaction: Transaction, ids: ReadonlyMap<string, string>, now: Date) {
  const idOf = (key: string) => ids.get(key) ?? "";
  for (const room of DEMO_ROOMS) {
    const isLive = room.startedMinutesAgo !== undefined;
    const startedAt = isLive ? new Date(now.getTime() - (room.startedMinutesAgo ?? 0) * MINUTE_MS) : null;
    const scheduledFor = isLive ? null : onTheHour(now.getTime() + (room.startsInHours ?? 0) * HOUR_MS);
    const [created] = await transaction
      .insert(voiceRoom)
      .values({
        title: room.title,
        hostId: idOf(room.host),
        createdById: idOf(room.host),
        access: ROOM_ACCESS.open,
        status: isLive ? ROOM_STATUSES.live : ROOM_STATUSES.scheduled,
        scheduledFor,
        startedAt,
        createdAt: startedAt ?? now,
      })
      .returning({ id: voiceRoom.id });
    if (!created) continue;
    const seats = [[room.host, ROOM_ROLES.host] as const, ...room.people];
    await transaction.insert(voiceRoomMember).values(
      seats.map(([key, role], index) => ({
        roomId: created.id,
        memberId: idOf(key),
        role,
        isInvited: role === ROOM_ROLES.host,
        joinedAt: startedAt ? new Date(startedAt.getTime() + index * MINUTE_MS) : null,
      })),
    );
  }
  await transaction.insert(voiceFollow).values(DEMO_FOLLOWS.map(([follower, followed]) => ({ followerId: idOf(follower), followedId: idOf(followed), createdAt: now })));
}
