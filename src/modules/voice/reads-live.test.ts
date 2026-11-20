import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { POST as postCreate } from "@/app/api/voice/create/route";
import { POST as postJoin } from "@/app/api/voice/join/route";
import { voiceManifest } from "@/modules/voice/manifest";
import { countLiveRooms, countRoomJoins, readLiveRooms } from "@/modules/voice/reads-live";
import { voiceRoom, voiceRoomMember } from "@/modules/voice/schema";
import { toLiveKitRoomName } from "@/modules/voice/service";
import { user } from "@/platform/database/auth-schema";
import { saveModuleState } from "@/platform/modules/enablement";
import { clearDatabase, createTestDatabase } from "@/test/database";
import { FAKE_LIVEKIT_KEY, FAKE_LIVEKIT_SECRET, startFakeLiveKitServer } from "@/test/fake-livekit-server";
import { createSignedInMember } from "@/test/signed-in-member";

const APP_URL = "http://localhost:3000";

type Member = Awaited<ReturnType<typeof createSignedInMember>>;

describe("the live-room reads", () => {
  const database = createTestDatabase();
  let livekit: Awaited<ReturnType<typeof startFakeLiveKitServer>>;
  const saved = { url: process.env.LIVEKIT_URL, key: process.env.LIVEKIT_API_KEY, secret: process.env.LIVEKIT_API_SECRET };

  beforeAll(async () => {
    livekit = await startFakeLiveKitServer();
    process.env.LIVEKIT_URL = livekit.url;
    process.env.LIVEKIT_API_KEY = FAKE_LIVEKIT_KEY;
    process.env.LIVEKIT_API_SECRET = FAKE_LIVEKIT_SECRET;
  });

  beforeEach(async () => {
    livekit.reset();
    await clearDatabase(database);
    await saveModuleState(database, voiceManifest, true);
  });

  afterAll(async () => {
    process.env.LIVEKIT_URL = saved.url;
    process.env.LIVEKIT_API_KEY = saved.key;
    process.env.LIVEKIT_API_SECRET = saved.secret;
    await livekit.close();
    await database.$client.end();
  });

  function call(handler: (request: Request) => Promise<Response>, member: Member, body: unknown) {
    const headers = { "content-type": "application/json", origin: APP_URL, cookie: member.cookie };
    return handler(new Request(`${APP_URL}/api/voice`, { method: "POST", headers, body: JSON.stringify(body) }));
  }

  async function member(name: string) {
    const signedIn = await createSignedInMember(database);
    await database.update(user).set({ name }).where(eq(user.id, signedIn.userId));
    return signedIn;
  }

  async function openRoom(host: Member, title: string) {
    const response = await call(postCreate, host, { title });
    expect(response.status).toBe(200);
    return ((await response.json()) as { roomId: string }).roomId;
  }

  // New rooms are open to everyone; an invite-only room as hosts made them before round 7.
  async function openInviteOnlyRoom(host: Member, title: string, inviteeIds: string[]) {
    const roomId = await openRoom(host, title);
    await database.update(voiceRoom).set({ access: "invite" }).where(eq(voiceRoom.id, roomId));
    await database.insert(voiceRoomMember).values(inviteeIds.map((memberId) => ({ roomId, memberId, role: "listener", isInvited: true })));
    return roomId;
  }

  async function join(who: Member, roomId: string) {
    expect((await call(postJoin, who, { roomId })).status).toBe(200);
  }

  it("returns the faces of the people in a live room, and only the rooms the viewer may see", async () => {
    const [maya, sam, lina] = await Promise.all([member("Maya Example"), member("Sam Example"), member("Lina Example")]);
    const roomId = await openRoom(maya, "Pricing for seed founders");
    await openInviteOnlyRoom(maya, "Board prep", [sam.userId]);
    await join(maya, roomId);
    await join(sam, roomId);
    livekit.connect(toLiveKitRoomName(roomId), maya.userId, sam.userId);

    expect(await readLiveRooms(database, lina.userId, 3)).toEqual([
      {
        id: roomId,
        title: "Pricing for seed founders",
        hostName: "Maya Example",
        faces: [
          { name: "Maya Example", image: null },
          { name: "Sam Example", image: null },
        ],
        count: 2,
      },
    ]);
    expect(await countLiveRooms(database, lina.userId)).toBe(1);
    expect(await countLiveRooms(database, sam.userId)).toBe(2);

    // Sam left: LiveKit no longer has them, so their face goes.
    livekit.disconnect(toLiveKitRoomName(roomId), sam.userId);
    const [room] = await readLiveRooms(database, lina.userId, 3);
    expect(room?.faces.map(({ name }) => name)).toEqual(["Maya Example"]);
    expect(room?.count).toBe(1);
    expect(await readLiveRooms(database, lina.userId, 0)).toEqual([]);
  });

  it("counts everyone who joined while LiveKit can't say who is in", async () => {
    const [maya, sam] = await Promise.all([member("Maya Example"), member("Sam Example")]);
    const roomId = await openRoom(maya, "Pricing for seed founders");
    await join(maya, roomId);
    await join(sam, roomId);
    livekit.setDown(true);

    // Sam is in too, but sees only who else is there; the count is everyone.
    const [room] = await readLiveRooms(database, sam.userId, 3);
    expect(room?.faces.map(({ name }) => name)).toEqual(["Maya Example"]);
    expect(room?.count).toBe(2);
  });

  it("ranks the busiest room first among every live room, the newest on a tie", async () => {
    const people = await Promise.all(["Maya", "Sam", "Lina", "Omar", "Nadia", "Rafael", "Hannah", "Viewer"].map((name) => member(`${name} Example`)));
    const viewer = people.at(-1)!;
    // Seven rooms; the oldest one has three people in, every newer one only its host.
    const roomIds: string[] = [];
    for (const [index, host] of people.slice(0, 7).entries()) {
      roomIds.push(await openRoom(host, `Room ${index}`));
      await join(host, roomIds[index]!);
    }
    await join(people[1]!, roomIds[0]!);
    await join(people[2]!, roomIds[0]!);
    livekit.setDown(true);

    const [busiest, next] = await readLiveRooms(database, viewer.userId, 2);
    expect(busiest?.title).toBe("Room 0");
    expect(busiest?.count).toBe(3);
    expect(next?.title).toBe("Room 6");
  });

  it("counts room joins since a moment, once per member and room", async () => {
    const [maya, sam] = await Promise.all([member("Maya Example"), member("Sam Example")]);
    const before = new Date(Date.now() - 1000);
    const roomId = await openRoom(maya, "Pricing for seed founders");
    await join(maya, roomId);
    await join(sam, roomId);
    await join(sam, roomId);

    expect(await countRoomJoins(database, before)).toBe(2);
    expect(await countRoomJoins(database, new Date(Date.now() + 60_000))).toBe(0);
  });

  it("answers empty and 0 while Rooms is off", async () => {
    const [maya, sam] = await Promise.all([member("Maya Example"), member("Sam Example")]);
    const roomId = await openRoom(maya, "Pricing for seed founders");
    await join(sam, roomId);
    await saveModuleState(database, voiceManifest, false);

    expect(await readLiveRooms(database, sam.userId, 3)).toEqual([]);
    expect(await countLiveRooms(database, sam.userId)).toBe(0);
    expect(await countRoomJoins(database, new Date(0))).toBe(0);
  });
});
