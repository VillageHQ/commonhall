import { TokenVerifier } from "livekit-server-sdk";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { eq } from "drizzle-orm";

import { POST as postAlerts } from "@/app/api/voice/alerts/route";
import { POST as postCreate } from "@/app/api/voice/create/route";
import { POST as postEnd } from "@/app/api/voice/end/route";
import { POST as postHand } from "@/app/api/voice/hand/route";
import { POST as postJoin } from "@/app/api/voice/join/route";
import { POST as postRemind } from "@/app/api/voice/remind/route";
import { POST as postLeave } from "@/app/api/voice/leave/route";
import { POST as postRename } from "@/app/api/voice/rename/route";
import { POST as postRole } from "@/app/api/voice/role/route";
import { POST as postRooms } from "@/app/api/voice/rooms/route";
import { POST as postStart } from "@/app/api/voice/start/route";
import { ROLE_ACTIONS, ROOM_NOTIFY_BODY, ROOM_ROLES, VOICE_ERROR_CODES, VOICE_LIMITS, type RoomJoin, type RoomsPageData, type StartedRoom } from "@/modules/voice/contract";
import { voiceManifest } from "@/modules/voice/manifest";
import { voiceBroadcast, voiceFollow, voiceNotifyReceipt, voiceRoom, voiceRoomMember } from "@/modules/voice/schema";
import { checkRoom, NOTIFY_AUDIENCES, toLiveKitRoomName } from "@/modules/voice/service";
import { resolveAudience } from "@/modules/voice/service-notify";
import { memberBlock } from "@/modules/members/schema";
import { user } from "@/platform/database/auth-schema";
import { isModuleEnabled, saveModuleState } from "@/platform/modules/enablement";
import { DEFAULT_PREFERENCES, DEVICE_TYPES, NOTIFICATION_KINDS, ROOM_ALERT_KINDS } from "@/platform/notifications/contract";
import { readPreferences } from "@/platform/notifications/reads";
import { pauseAlerts, registerDevice, savePreferences, setMute } from "@/platform/notifications/service";
import { readMemberExport } from "@/shell/member-export";
import { runVoiceReminders, sendRoomNotify } from "@/shell/voice-alerts";
import { clearDatabase, createTestDatabase } from "@/test/database";
import { FAKE_LIVEKIT_KEY, FAKE_LIVEKIT_SECRET, startFakeLiveKitServer } from "@/test/fake-livekit-server";
import { startFakePushServer } from "@/test/fake-push-server";
import { createSignedInMember } from "@/test/signed-in-member";

const APP_URL = "http://localhost:3000";

type Member = Awaited<ReturnType<typeof createSignedInMember>>;

describe("voice rooms", () => {
  const database = createTestDatabase();
  let livekit: Awaited<ReturnType<typeof startFakeLiveKitServer>>;
  let push: Awaited<ReturnType<typeof startFakePushServer>>;
  const saved = { url: process.env.LIVEKIT_URL, key: process.env.LIVEKIT_API_KEY, secret: process.env.LIVEKIT_API_SECRET, expo: process.env.EXPO_PUSH_URL };

  beforeAll(async () => {
    livekit = await startFakeLiveKitServer();
    process.env.LIVEKIT_URL = livekit.url;
    process.env.LIVEKIT_API_KEY = FAKE_LIVEKIT_KEY;
    process.env.LIVEKIT_API_SECRET = FAKE_LIVEKIT_SECRET;
    push = await startFakePushServer();
    process.env.EXPO_PUSH_URL = push.expoUrl;
  });

  beforeEach(async () => {
    livekit.reset();
    push.reset();
    await clearDatabase(database);
    await saveModuleState(database, voiceManifest, true);
  });

  afterAll(async () => {
    process.env.LIVEKIT_URL = saved.url;
    process.env.LIVEKIT_API_KEY = saved.key;
    process.env.LIVEKIT_API_SECRET = saved.secret;
    process.env.EXPO_PUSH_URL = saved.expo;
    await livekit.close();
    await push.close();
    await database.$client.end();
  });

  function call(handler: (request: Request) => Promise<Response>, cookie: string | null, body: unknown) {
    const headers: Record<string, string> = { "content-type": "application/json", origin: APP_URL };
    if (cookie) headers.cookie = cookie;
    return handler(new Request(`${APP_URL}/api/voice`, { method: "POST", headers, body: JSON.stringify(body) }));
  }

  // One tap: no title gives "<first name>'s room". Starting alerts everyone (after the response).
  async function startRoom(host: Member, title?: string) {
    const response = await call(postCreate, host.cookie, title === undefined ? {} : { title });
    expect(response.status).toBe(200);
    return (await response.json()) as StartedRoom;
  }

  async function openRoom(host: Member, title = "Pricing for seed founders") {
    return (await startRoom(host, title)).roomId;
  }

  async function scheduleRoom(host: Member, title: string, hoursAhead = 1) {
    const response = await call(postCreate, host.cookie, { title, scheduledFor: new Date(Date.now() + hoursAhead * 60 * 60_000).toISOString() });
    expect(response.status).toBe(200);
    return ((await response.json()) as StartedRoom).roomId;
  }

  // A room written straight to the database: a live open room, or one as hosts made them before round 7 (invite only,
  // or scheduled with a saved audience; null is nobody).
  async function insertRoom(host: Member, values: { access?: "open" | "invite"; invitedIds?: string[]; notifyAudience?: "followers" | "picked" | "everyone" | null; notifyMemberIds?: string[] }) {
    const isScheduled = values.notifyAudience !== undefined;
    const [room] = await database
      .insert(voiceRoom)
      .values({
        title: "Older room",
        hostId: host.userId,
        createdById: host.userId,
        access: values.access ?? "open",
        status: isScheduled ? "scheduled" : "live",
        scheduledFor: isScheduled ? new Date(Date.now() + 60 * 60_000) : null,
        startedAt: isScheduled ? null : new Date(),
        notifyAudience: values.notifyAudience ?? null,
        notifyMemberIds: values.notifyMemberIds ?? null,
        createdAt: new Date(Date.now() - 60 * 60_000),
      })
      .returning({ id: voiceRoom.id });
    const roomId = room!.id;
    await database.insert(voiceRoomMember).values([
      { roomId, memberId: host.userId, role: ROOM_ROLES.host, isInvited: true },
      ...(values.invitedIds ?? []).map((memberId) => ({ roomId, memberId, role: ROOM_ROLES.listener, isInvited: true })),
    ]);
    return roomId;
  }

  async function readRooms(member: Member) {
    return (await (await call(postRooms, member.cookie, {})).json()) as RoomsPageData;
  }

  async function join(member: Member, roomId: string) {
    const response = await call(postJoin, member.cookie, { roomId });
    expect(response.status).toBe(200);
    const joined = (await response.json()) as RoomJoin;
    return { ...joined, grants: await new TokenVerifier(FAKE_LIVEKIT_KEY, FAKE_LIVEKIT_SECRET).verify(joined.token) };
  }

  it("gives a listener a short-lived token that can't publish, and the host one for the microphone only", async () => {
    const [host, listener] = await Promise.all([createSignedInMember(database), createSignedInMember(database)]);
    const roomId = await openRoom(host);

    const listenerJoin = await join(listener, roomId);
    const hostJoin = await join(host, roomId);

    expect(listenerJoin.role).toBe(ROOM_ROLES.listener);
    expect(listenerJoin.grants.sub).toBe(listener.userId);
    expect(listenerJoin.grants.video).toMatchObject({ room: toLiveKitRoomName(roomId), roomJoin: true, canPublish: false, canSubscribe: true, canPublishData: true });
    expect(hostJoin.grants.video).toMatchObject({ canPublish: true, canPublishSources: ["microphone"] });
    for (const { grants } of [listenerJoin, hostJoin]) {
      expect(grants.video?.roomRecord).toBeFalsy();
      expect(grants.video?.roomAdmin).toBeFalsy();
      expect(grants.video?.canUpdateOwnMetadata).toBe(false);
      expect(Number(grants.exp) - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(VOICE_LIMITS.tokenTtlSeconds);
    }
  });

  it("issues tokens only to signed-in members, and an older invite-only room only to its list", async () => {
    const [host, invited, stranger] = await Promise.all([createSignedInMember(database), createSignedInMember(database), createSignedInMember(database)]);
    const roomId = await insertRoom(host, { access: "invite", invitedIds: [invited.userId] });

    expect((await call(postJoin, null, { roomId })).status).toBe(401);
    const refused = await call(postJoin, stranger.cookie, { roomId });
    expect(refused.status).toBe(403);
    expect(await refused.json()).toMatchObject({ code: VOICE_ERROR_CODES.notInvited });
    expect((await join(invited, roomId)).role).toBe(ROOM_ROLES.listener);

    const strangerRooms = (await (await call(postRooms, stranger.cookie, {})).json()) as { live: unknown[] };
    expect(strangerRooms.live).toEqual([]);

    // A reminder on an invite-only scheduled room would carry its title to someone off the list.
    const scheduledId = await insertRoom(host, { access: "invite", invitedIds: [invited.userId], notifyAudience: null });
    expect((await call(postRemind, stranger.cookie, { roomId: scheduledId, isOn: true })).status).toBe(404);
    expect((await call(postRemind, invited.cookie, { roomId: scheduledId, isOn: true })).status).toBe(200);
  });

  it("opens one room when Start a room is tapped twice", async () => {
    const host = await createSignedInMember(database);
    const answers = await Promise.all([call(postCreate, host.cookie, {}), call(postCreate, host.cookie, {})]);
    const [first, second] = (await Promise.all(answers.map((answer) => answer.json()))) as StartedRoom[];
    expect(first?.roomId).toBe(second?.roomId);
  });

  it("reopens the host's live room when they start again, and makes a new one once it ended", async () => {
    const host = await createSignedInMember(database);
    const first = await startRoom(host);
    const again = await startRoom(host, "A different title");
    expect(again.roomId).toBe(first.roomId);
    expect(await database.select({ id: voiceRoom.id }).from(voiceRoom)).toHaveLength(1);
    // Scheduling for later still makes its own room.
    expect((await call(postCreate, host.cookie, { title: "Later", scheduledFor: new Date(Date.now() + 60 * 60_000).toISOString() })).status).toBe(200);
    await call(postEnd, host.cookie, { roomId: first.roomId });
    expect((await startRoom(host)).roomId).not.toBe(first.roomId);
  });

  it("starts a room with one tap as '<first name>'s room', open to everyone, and lets only its host rename it", async () => {
    const [host, guest] = await Promise.all([createSignedInMember(database), createSignedInMember(database)]);
    await database.update(user).set({ name: "Sam Lee" }).where(eq(user.id, host.userId));
    const { roomId, isQuiet } = await startRoom(host);
    expect(isQuiet).toBe(false);
    const [room] = await database.select({ title: voiceRoom.title, access: voiceRoom.access, status: voiceRoom.status }).from(voiceRoom).where(eq(voiceRoom.id, roomId));
    expect(room).toEqual({ title: "Sam's room", access: "open", status: "live" });

    // The old choices are refused, not ignored.
    expect((await call(postCreate, host.cookie, { title: "Old sheet", access: "invite", scheduledFor: null, inviteeIds: [] })).status).toBe(422);
    // A room for later needs a title.
    const untitled = await call(postCreate, host.cookie, { scheduledFor: new Date(Date.now() + 60 * 60_000).toISOString() });
    expect(untitled.status).toBe(422);
    expect(await untitled.json()).toMatchObject({ code: VOICE_ERROR_CODES.needsTitle });

    expect((await call(postRename, guest.cookie, { roomId, title: "Mine now" })).status).toBe(403);
    expect((await call(postRename, host.cookie, { roomId, title: "  " })).status).toBe(422);
    expect((await call(postRename, host.cookie, { roomId, title: "Closing a seed round" })).status).toBe(200);
    expect((await readRooms(guest)).live[0]?.title).toBe("Closing a seed round");
  });

  it("runs the stage: raise hand, invite up, co-host, move down, and pushes each change live", async () => {
    const [host, guest, other] = await Promise.all([createSignedInMember(database), createSignedInMember(database), createSignedInMember(database)]);
    const roomId = await openRoom(host);
    await Promise.all([join(host, roomId), join(guest, roomId), join(other, roomId)]);
    livekit.connect(toLiveKitRoomName(roomId), host.userId, guest.userId, other.userId);

    expect((await call(postHand, guest.cookie, { roomId, isRaised: true })).status).toBe(200);
    const raised = livekit.calls.find(({ method }) => method === "UpdateParticipant");
    expect(raised?.body).toMatchObject({ identity: guest.userId, attributes: { role: "listener", hand: "1" } });

    // A listener can't bring someone up.
    expect((await call(postRole, other.cookie, { roomId, memberId: guest.userId, action: ROLE_ACTIONS.inviteUp })).status).toBe(403);

    livekit.calls.length = 0;
    expect((await call(postRole, host.cookie, { roomId, memberId: guest.userId, action: ROLE_ACTIONS.inviteUp })).status).toBe(200);
    expect(livekit.calls[0]?.body).toMatchObject({ identity: guest.userId, attributes: { role: "speaker", hand: "" }, permission: { canPublish: true } });
    expect((await join(guest, roomId)).grants.video?.canPublish).toBe(true);

    expect((await call(postRole, host.cookie, { roomId, memberId: guest.userId, action: ROLE_ACTIONS.makeCohost })).status).toBe(200);
    // A co-host brings people up but can't change the host or another co-host's role.
    expect((await call(postRole, guest.cookie, { roomId, memberId: other.userId, action: ROLE_ACTIONS.inviteUp })).status).toBe(200);
    expect((await call(postRole, guest.cookie, { roomId, memberId: host.userId, action: ROLE_ACTIONS.moveDown })).status).toBe(403);

    livekit.calls.length = 0;
    expect((await call(postRole, host.cookie, { roomId, memberId: other.userId, action: ROLE_ACTIONS.moveDown })).status).toBe(200);
    const movedDown = livekit.calls[0]?.body as { identity: string; attributes: Record<string, string>; permission: Record<string, unknown> };
    expect(movedDown).toMatchObject({ identity: other.userId, attributes: { role: "listener" } });
    // LiveKit's JSON leaves out a false permission.
    expect(movedDown.permission.canPublish ?? false).toBe(false);
    expect((await join(other, roomId)).grants.video?.canPublish).toBe(false);
  });

  it("ends the room for everyone when the host ends it", async () => {
    const [host, guest] = await Promise.all([createSignedInMember(database), createSignedInMember(database)]);
    const roomId = await openRoom(host);
    await join(guest, roomId);

    expect((await call(postEnd, guest.cookie, { roomId })).status).toBe(403);
    expect((await call(postEnd, host.cookie, { roomId })).status).toBe(200);

    expect(livekit.calls.some(({ method, body }) => method === "DeleteRoom" && body.room === toLiveKitRoomName(roomId))).toBe(true);
    const late = await call(postJoin, guest.cookie, { roomId });
    expect(late.status).toBe(409);
    expect(await late.json()).toMatchObject({ code: VOICE_ERROR_CODES.ended });
  });

  it("hands the room to a co-host when the host leaves", async () => {
    const [host, cohost] = await Promise.all([createSignedInMember(database), createSignedInMember(database)]);
    const roomId = await openRoom(host);
    await Promise.all([join(host, roomId), join(cohost, roomId)]);
    livekit.connect(toLiveKitRoomName(roomId), host.userId, cohost.userId);
    await call(postRole, host.cookie, { roomId, memberId: cohost.userId, action: ROLE_ACTIONS.makeCohost });

    livekit.disconnect(toLiveKitRoomName(roomId), host.userId);
    expect((await call(postLeave, host.cookie, { roomId })).status).toBe(200);

    expect((await join(cohost, roomId)).role).toBe(ROOM_ROLES.host);
    expect((await join(host, roomId)).role).toBe(ROOM_ROLES.listener);
    // The new host may end it.
    expect((await call(postEnd, cohost.cookie, { roomId })).status).toBe(200);
  });

  it("ends a room 2 minutes after nobody is left on stage, and never while LiveKit is unreachable", async () => {
    const [host, listener] = await Promise.all([createSignedInMember(database), createSignedInMember(database)]);
    const roomId = await openRoom(host);
    const roomName = toLiveKitRoomName(roomId);
    livekit.connect(roomName, listener.userId);
    const start = Date.now() + 60_000;

    await checkRoom(database, process.env, roomId, new Date(start));
    livekit.setDown(true);
    await checkRoom(database, process.env, roomId, new Date(start + VOICE_LIMITS.emptyStageMs + 1_000));
    livekit.setDown(false);
    expect((await call(postJoin, listener.cookie, { roomId })).status).toBe(200);

    await checkRoom(database, process.env, roomId, new Date(start + VOICE_LIMITS.emptyStageMs + 1_000));
    expect((await call(postJoin, listener.cookie, { roomId })).status).toBe(409);
  });

  async function readStatus(roomId: string) {
    const [room] = await database.select({ status: voiceRoom.status }).from(voiceRoom).where(eq(voiceRoom.id, roomId));
    return room?.status;
  }

  // The host taps Leave instead of End room. Both the web room and the store app call leave before they disconnect, so
  // LiveKit still lists the host when the leave arrives.
  it("stops counting a member the moment they leave, and ends a room a minute after nobody is connected", async () => {
    const [host, viewer] = await Promise.all([createSignedInMember(database), createSignedInMember(database)]);
    const roomId = await openRoom(host);
    const roomName = toLiveKitRoomName(roomId);
    await join(host, roomId);
    livekit.connect(roomName, host.userId);
    expect((await readRooms(viewer)).live.find(({ id }) => id === roomId)?.count).toBe(1);

    const left = Date.now();
    expect((await call(postLeave, host.cookie, { roomId })).status).toBe(200);
    expect((await readRooms(viewer)).live.find(({ id }) => id === roomId)?.count).toBe(0);
    expect((await readRooms(host)).live.find(({ id }) => id === roomId)?.count).toBe(0);

    await checkRoom(database, process.env, roomId, new Date(left + VOICE_LIMITS.emptyRoomMs - 1_000));
    expect(await readStatus(roomId)).toBe("live");
    await checkRoom(database, process.env, roomId, new Date(left + VOICE_LIMITS.emptyRoomMs + 1_000));
    expect(await readStatus(roomId)).toBe("ended");
    expect(livekit.calls.some(({ method, body }) => method === "DeleteRoom" && body.room === roomName)).toBe(true);
  });

  it("keeps an empty room going when someone comes back within the minute, and never ends one while LiveKit is unreachable", async () => {
    const [host, listener] = await Promise.all([createSignedInMember(database), createSignedInMember(database)]);
    const roomId = await openRoom(host);
    const roomName = toLiveKitRoomName(roomId);
    const start = Date.now();

    await checkRoom(database, process.env, roomId, new Date(start));
    livekit.setDown(true);
    await checkRoom(database, process.env, roomId, new Date(start + VOICE_LIMITS.emptyRoomMs + 1_000));
    livekit.setDown(false);
    expect(await readStatus(roomId)).toBe("live");

    // Back with seconds to spare: the minute starts again the next time the room is seen empty.
    livekit.connect(roomName, listener.userId);
    await checkRoom(database, process.env, roomId, new Date(start + VOICE_LIMITS.emptyRoomMs - 5_000));
    livekit.disconnect(roomName, listener.userId);
    await checkRoom(database, process.env, roomId, new Date(start + VOICE_LIMITS.emptyRoomMs + 1_000));
    expect(await readStatus(roomId)).toBe("live");
    await checkRoom(database, process.env, roomId, new Date(start + 2 * VOICE_LIMITS.emptyRoomMs + 2_000));
    expect(await readStatus(roomId)).toBe("ended");
  });

  it("alerts on 3 starts a day; a 4th starts quietly and says so", async () => {
    const member = await createSignedInMember(database);
    for (let room = 0; room < VOICE_LIMITS.broadcastsPerDay; room += 1) {
      const started = await startRoom(member, `Room ${room}`);
      expect(started.isQuiet).toBe(false);
      await call(postEnd, member.cookie, { roomId: started.roomId });
    }
    // Tapped twice: one room, and both answers say it was quiet.
    const answers = await Promise.all([call(postCreate, member.cookie, { title: "One more" }), call(postCreate, member.cookie, { title: "One more" })]);
    const [fourth, again] = (await Promise.all(answers.map((answer) => answer.json()))) as StartedRoom[];
    expect(again).toEqual(fourth);
    expect(fourth!.isQuiet).toBe(true);
    const rows = await database.select({ roomId: voiceBroadcast.roomId, audience: voiceBroadcast.audience }).from(voiceBroadcast);
    expect(rows).toHaveLength(VOICE_LIMITS.broadcastsPerDay);
    expect(rows.every(({ audience }) => audience === NOTIFY_AUDIENCES.everyone)).toBe(true);
    expect(rows.some(({ roomId }) => roomId === fourth!.roomId)).toBe(false);
  });

  it("keeps the follows made before round 7 in Your data's export", async () => {
    const [fan, host] = await Promise.all([createSignedInMember(database), createSignedInMember(database)]);
    await database.insert(voiceFollow).values({ followerId: fan.userId, followedId: host.userId });
    const exported = await readMemberExport(database, fan.userId);
    expect(exported.roomsYouFollow).toEqual([expect.objectContaining({ memberId: host.userId })]);
  });

  it("turns both room alert kinds on or off with the Rooms page's switch, keeping the other choices", async () => {
    const member = await createSignedInMember(database);
    await savePreferences(database, member.userId, { ...DEFAULT_PREFERENCES, offKinds: [NOTIFICATION_KINDS.voiceRoom, NOTIFICATION_KINDS.library], timeZone: "Europe/Paris" });
    expect((await call(postAlerts, member.cookie, { isOn: false, timeZone: "Asia/Tokyo" })).status).toBe(200);
    const off = await readPreferences(database, member.userId);
    expect(off.offKinds.toSorted()).toEqual([NOTIFICATION_KINDS.library, ...ROOM_ALERT_KINDS].toSorted());
    // A member who saved keeps their own zone.
    expect(off.timeZone).toBe("Europe/Paris");
    expect((await call(postAlerts, member.cookie, { isOn: true })).status).toBe(200);
    expect((await readPreferences(database, member.userId)).offKinds).toEqual([NOTIFICATION_KINDS.library]);
  });

  it("starts on with a fresh install's ROOMS_ON_BY_DEFAULT, and an admin's stored choice always wins", async () => {
    const savedDefault = process.env.ROOMS_ON_BY_DEFAULT;
    try {
      await clearDatabase(database);
      delete process.env.ROOMS_ON_BY_DEFAULT;
      expect(await isModuleEnabled(database, voiceManifest)).toBe(false);
      process.env.ROOMS_ON_BY_DEFAULT = "true";
      expect(await isModuleEnabled(database, voiceManifest)).toBe(true);
      await saveModuleState(database, voiceManifest, false);
      expect(await isModuleEnabled(database, voiceManifest)).toBe(false);
    } finally {
      if (savedDefault === undefined) delete process.env.ROOMS_ON_BY_DEFAULT;
      else process.env.ROOMS_ON_BY_DEFAULT = savedDefault;
    }
  });

  describe("who a start reaches", () => {
    const base = { senderId: "sender", followerIds: ["a", "b", "sender"], pickedIds: ["c", "d"], invitedIds: null, inRoomIds: [] };

    it("reaches everyone but the host, anyone in the room and anyone who tapped Remind me", () => {
      const everyone = resolveAudience({ ...base, audience: NOTIFY_AUDIENCES.everyone, inRoomIds: ["a"], remindedIds: ["b"] });
      expect(everyone.among).toBeNull();
      expect([...everyone.exclude].toSorted()).toEqual(["a", "b", "sender"]);
    });

    it("keeps an older scheduled room's saved followers or people picked, never the sender", () => {
      expect(resolveAudience({ ...base, audience: NOTIFY_AUDIENCES.followers }).among).toEqual(["a", "b"]);
      expect(resolveAudience({ ...base, audience: NOTIFY_AUDIENCES.picked }).among).toEqual(["c", "d"]);
    });

    it("narrows an older invite-only room to its invited", () => {
      const invitedIds = ["b", "d", "e"];
      expect(resolveAudience({ ...base, invitedIds, audience: NOTIFY_AUDIENCES.followers }).among).toEqual(["b"]);
      expect(resolveAudience({ ...base, invitedIds, audience: NOTIFY_AUDIENCES.everyone }).among).toEqual(["b", "d", "e"]);
    });
  });

  describe("alerts", () => {
    const EVENTUALLY = { timeout: 5_000, interval: 50 };
    let tokenCount = 0;

    async function withPhone(member: Member) {
      tokenCount += 1;
      await registerDevice(database, process.env, member.userId, { type: DEVICE_TYPES.expo, token: `ExponentPushToken[voiceTest${String(tokenCount).padStart(4, "0")}]` });
      return member;
    }

    async function members(count: number) {
      return Promise.all(Array.from({ length: count }, () => createSignedInMember(database)));
    }

    // Quiet right now, in UTC: from the hour before to two hours on.
    function quietNow() {
      const hour = new Date().getUTCHours();
      const at = (offset: number) => `${String((hour + offset + 24) % 24).padStart(2, "0")}:00`;
      return { ...DEFAULT_PREFERENCES, quietTimes: [{ from: at(-1), to: at(2), allDay: false, days: [0, 1, 2, 3, 4, 5, 6] }] };
    }

    it("a start alerts every member with a device, but not the host, anyone in the room, or those muting, quiet, paused, blocked or with room alerts off", async () => {
      // One more member has no device: nothing to send to.
      const [host, other, inRoom, sleeping, paused, muting, off, blocking] = await members(9);
      for (const member of [host, other, inRoom, sleeping, paused, muting, off, blocking]) await withPhone(member!);
      await savePreferences(database, sleeping!.userId, quietNow());
      await pauseAlerts(database, paused!.userId, { until: "1h" }, new Date());
      await setMute(database, muting!.userId, host!.userId, true);
      await savePreferences(database, off!.userId, { ...DEFAULT_PREFERENCES, offKinds: [...ROOM_ALERT_KINDS] });
      await database.insert(memberBlock).values({ blockerId: host!.userId, blockedId: blocking!.userId });

      // Someone already in another of the host's rooms is still told; someone in this one is not (LiveKit's list).
      const roomId = await insertRoom(host!, {});
      livekit.connect(toLiveKitRoomName(roomId), host!.userId, inRoom!.userId);
      const result = await sendRoomNotify(database, process.env, { roomId, senderId: host!.userId, audience: NOTIFY_AUDIENCES.everyone });
      expect(result).toMatchObject({ sent: 1, capped: 0 });
      expect(push.state.expoMessages).toHaveLength(1);

      // Only the member who got it holds a receipt: the quiet, paused, muting and off members keep their 5 for later.
      const receipts = await database.select({ memberId: voiceNotifyReceipt.memberId }).from(voiceNotifyReceipt);
      expect(receipts).toEqual([{ memberId: other!.userId }]);
    });

    it("one tap alerts everyone after the response, in the alert's words", async () => {
      const [host, other] = await members(2);
      for (const member of [host, other]) await withPhone(member!);
      const { roomId } = await startRoom(host!, "Agents in production");

      await vi.waitFor(() => expect(push.state.expoMessages).toHaveLength(1), EVENTUALLY);
      expect(push.state.expoMessages[0]).toMatchObject({
        title: "Test Member started \u201cAgents in production\u201d",
        body: ROOM_NOTIFY_BODY,
        data: { url: `/rooms/${roomId}`, kind: NOTIFICATION_KINDS.voiceBroadcast },
      });
      await vi.waitFor(async () => expect(await database.select({ reached: voiceBroadcast.reached }).from(voiceBroadcast)).toEqual([{ reached: 1 }]), EVENTUALLY);
    });

    it("a member in a quiet time gets nothing and holds no receipt; once it ends, the next start reaches them", async () => {
      const [host, sleeper] = await members(2);
      for (const member of [host, sleeper]) await withPhone(member!);
      await savePreferences(database, sleeper!.userId, quietNow());
      const first = await insertRoom(host!, {});
      expect(await sendRoomNotify(database, process.env, { roomId: first, senderId: host!.userId, audience: NOTIFY_AUDIENCES.everyone })).toMatchObject({ sent: 0, skipped: 1 });
      expect(await database.select().from(voiceNotifyReceipt)).toEqual([]);

      await savePreferences(database, sleeper!.userId, DEFAULT_PREFERENCES);
      const second = await insertRoom(host!, {});
      expect(await sendRoomNotify(database, process.env, { roomId: second, senderId: host!.userId, audience: NOTIFY_AUDIENCES.everyone })).toMatchObject({ sent: 1 });
    });

    it("Start now on a new scheduled room alerts everyone, and a member who tapped Remind me gets only the reminder", async () => {
      const [host, keen, other] = await members(3);
      for (const member of [host, keen, other]) await withPhone(member!);
      const roomId = await scheduleRoom(host!, "Later");
      expect((await call(postRemind, keen!.cookie, { roomId, isOn: true })).status).toBe(200);
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(push.state.expoMessages).toHaveLength(0);

      const started = await call(postStart, host!.cookie, { roomId });
      expect(await started.json()).toEqual({ roomId, isQuiet: false });
      await vi.waitFor(() => expect(push.state.expoMessages).toHaveLength(2), EVENTUALLY);
      expect(push.state.expoMessages.map(({ title }) => title).toSorted()).toEqual(["Starting now: Later", "Test Member started \u201cLater\u201d"]);
    });

    it("a room scheduled before round 7 alerts the audience its host saved: followers, or nobody", async () => {
      const [host, follower, stranger] = await members(3);
      for (const member of [host, follower, stranger]) await withPhone(member!);
      await database.insert(voiceFollow).values({ followerId: follower!.userId, followedId: host!.userId });

      const silent = await insertRoom(host!, { notifyAudience: null });
      expect(await (await call(postStart, host!.cookie, { roomId: silent })).json()).toEqual({ roomId: silent, isQuiet: false });
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(push.state.expoMessages).toHaveLength(0);

      const forFollowers = await insertRoom(host!, { notifyAudience: "followers" });
      expect((await call(postStart, host!.cookie, { roomId: forFollowers })).status).toBe(200);
      await vi.waitFor(() => expect(push.state.expoMessages).toHaveLength(1), EVENTUALLY);
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(push.state.expoMessages).toHaveLength(1);
    });

    it("an older invite-only room alerts only its invited, and nobody already in the room", async () => {
      const [host, invited, listening, outsider] = await members(4);
      for (const member of [host, invited, listening, outsider]) await withPhone(member!);
      const roomId = await insertRoom(host!, { access: "invite", invitedIds: [invited!.userId, listening!.userId] });
      livekit.connect(toLiveKitRoomName(roomId), host!.userId, listening!.userId);

      const result = await sendRoomNotify(database, process.env, { roomId, senderId: host!.userId, audience: NOTIFY_AUDIENCES.everyone });
      expect(result).toMatchObject({ sent: 1, capped: 0 });
      expect(push.state.expoMessages).toHaveLength(1);
    });

    it("alerts a member once per room, and at most 5 starts a day (the 6th is skipped and counted)", async () => {
      const [receiver, ...senders] = await members(VOICE_LIMITS.notifiesReceivedPerDay + 2);
      await withPhone(receiver!);
      const send = (roomId: string, senderId: string) => sendRoomNotify(database, process.env, { roomId, senderId, audience: NOTIFY_AUDIENCES.everyone });

      const first = await insertRoom(senders[0]!, {});
      expect(await send(first, senders[0]!.userId)).toMatchObject({ sent: 1 });
      // The same room again: still one alert for it.
      expect(await send(first, senders[0]!.userId)).toMatchObject({ sent: 0, capped: 0 });

      for (const sender of senders.slice(1, VOICE_LIMITS.notifiesReceivedPerDay)) {
        expect(await send(await insertRoom(sender!, {}), sender!.userId)).toMatchObject({ sent: 1 });
      }
      const sixth = senders[VOICE_LIMITS.notifiesReceivedPerDay]!;
      expect(await send(await insertRoom(sixth, {}), sixth.userId)).toMatchObject({ sent: 0, capped: 1 });
      expect(push.state.expoMessages).toHaveLength(VOICE_LIMITS.notifiesReceivedPerDay);
    });

    it("reminds the members who tapped Remind me when the room starts, once, early or on time", async () => {
      // Only the keen member has a device: everyone else's start alert has nowhere to go.
      const [host, keen] = await members(2);
      for (const member of [host, keen]) await withPhone(member!);
      const schedule = async (title: string) => {
        const roomId = await scheduleRoom(host!, title);
        expect((await call(postRemind, keen!.cookie, { roomId, isOn: true })).status).toBe(200);
        return roomId;
      };
      const onTime = await schedule("Pricing office hours");
      const early = await schedule("Hiring office hours");

      // Nothing before its time.
      expect(await runVoiceReminders(database, process.env)).toMatchObject({ sent: 0 });

      // The host starts one early: its reminder goes now.
      expect((await call(postStart, host!.cookie, { roomId: early })).status).toBe(200);
      await vi.waitFor(() => expect(push.state.expoMessages).toHaveLength(1), EVENTUALLY);
      expect(push.state.expoMessages[0]).toMatchObject({ title: "Starting now: Hiring office hours", data: { url: `/rooms/${early}`, kind: NOTIFICATION_KINDS.voiceRoom } });

      // The minute job sends the other at its time, and neither again.
      const inTwoHours = new Date(Date.now() + 2 * 60 * 60_000);
      expect(await runVoiceReminders(database, process.env, inTwoHours)).toMatchObject({ sent: 1 });
      expect(push.state.expoMessages.map(({ title, data }) => ({ title, url: data.url }))).toEqual([
        { title: "Starting now: Hiring office hours", url: `/rooms/${early}` },
        { title: "Starting now: Pricing office hours", url: `/rooms/${onTime}` },
      ]);
      expect(await runVoiceReminders(database, process.env, inTwoHours)).toMatchObject({ sent: 0 });
      expect(push.state.expoMessages).toHaveLength(2);
    });
  });
});
