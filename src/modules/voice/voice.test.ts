import { TokenVerifier } from "livekit-server-sdk";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postAvailable } from "@/app/api/voice/available/route";
import { POST as postCreate } from "@/app/api/voice/create/route";
import { POST as postEnd } from "@/app/api/voice/end/route";
import { POST as postHand } from "@/app/api/voice/hand/route";
import { POST as postJoin } from "@/app/api/voice/join/route";
import { POST as postRemind } from "@/app/api/voice/remind/route";
import { POST as postLeave } from "@/app/api/voice/leave/route";
import { POST as postRole } from "@/app/api/voice/role/route";
import { POST as postRooms } from "@/app/api/voice/rooms/route";
import { POST as postStart } from "@/app/api/voice/start/route";
import { ROLE_ACTIONS, ROOM_ROLES, VOICE_ERROR_CODES, VOICE_LIMITS, VOICE_MESSAGES, type RoomJoin } from "@/modules/voice/contract";
import { voiceManifest } from "@/modules/voice/manifest";
import { checkRoom, toLiveKitRoomName } from "@/modules/voice/service";
import { memberBlock } from "@/modules/members/schema";
import { saveModuleState } from "@/platform/modules/enablement";
import { DEFAULT_PREFERENCES, DEVICE_TYPES, NOTIFICATION_KINDS } from "@/platform/notifications/contract";
import { registerDevice, savePreferences, setMute } from "@/platform/notifications/service";
import { readChatAvailableAction } from "@/shell/chat-available";
import { runVoiceReminders } from "@/shell/voice-alerts";
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

  async function openRoom(host: Member, access: "open" | "invite" = "open", inviteeIds: string[] = []) {
    const response = await call(postCreate, host.cookie, { title: "Pricing for seed founders", access, scheduledFor: null, inviteeIds });
    expect(response.status).toBe(200);
    return ((await response.json()) as { roomId: string }).roomId;
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

  it("issues tokens only to signed-in members, and an invite-only room only to its list", async () => {
    const [host, invited, stranger] = await Promise.all([createSignedInMember(database), createSignedInMember(database), createSignedInMember(database)]);
    const roomId = await openRoom(host, "invite", [invited.userId]);

    expect((await call(postJoin, null, { roomId })).status).toBe(401);
    const refused = await call(postJoin, stranger.cookie, { roomId });
    expect(refused.status).toBe(403);
    expect(await refused.json()).toMatchObject({ code: VOICE_ERROR_CODES.notInvited });
    expect((await join(invited, roomId)).role).toBe(ROOM_ROLES.listener);

    const strangerRooms = (await (await call(postRooms, stranger.cookie, {})).json()) as { live: unknown[] };
    expect(strangerRooms.live).toEqual([]);

    // A reminder on an invite-only scheduled room would carry its title to someone off the list.
    const later = new Date(Date.now() + 60 * 60_000).toISOString();
    const scheduled = await call(postCreate, host.cookie, { title: "Board prep", access: "invite", scheduledFor: later, inviteeIds: [invited.userId] });
    const scheduledId = ((await scheduled.json()) as { roomId: string }).roomId;
    expect((await call(postRemind, stranger.cookie, { roomId: scheduledId, isOn: true })).status).toBe(404);
    expect((await call(postRemind, invited.cookie, { roomId: scheduledId, isOn: true })).status).toBe(200);
  });

  it("opens one room when Start the room is tapped twice", async () => {
    const host = await createSignedInMember(database);
    const body = { title: "Hiring a first designer", access: "open", scheduledFor: null, inviteeIds: [] };
    const answers = await Promise.all([call(postCreate, host.cookie, body), call(postCreate, host.cookie, body)]);
    const [first, second] = (await Promise.all(answers.map((answer) => answer.json()))) as { roomId: string }[];
    expect(first?.roomId).toBe(second?.roomId);
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

  it("refuses a 4th 'I'm available' in a day with a plain message, and a double tap opens one room", async () => {
    const member = await createSignedInMember(database);
    for (let tap = 0; tap < VOICE_LIMITS.broadcastsPerDay; tap += 1) {
      const [first, second] = await Promise.all([call(postAvailable, member.cookie, {}), call(postAvailable, member.cookie, {})]);
      expect([first.status, second.status]).toEqual([200, 200]);
      const { roomId } = (await first.json()) as { roomId: string };
      expect(((await second.json()) as { roomId: string }).roomId).toBe(roomId);
      expect((await join(member, roomId)).role).toBe(ROOM_ROLES.host);
      await call(postEnd, member.cookie, { roomId });
    }

    const fourth = await call(postAvailable, member.cookie, {});
    expect(fourth.status).toBe(429);
    expect(await fourth.json()).toMatchObject({ code: VOICE_ERROR_CODES.broadcastLimit, message: VOICE_MESSAGES.broadcastLimit });
  });

  it("puts 'I'm available' in chat only while Rooms is on, with the day's count the Rooms page shows", async () => {
    const member = await createSignedInMember(database);
    const readChatInitial = async () => {
      const action = await readChatAvailableAction(database, process.env, member.userId);
      return action ? (action.props as { initial: { broadcastsLeft: number } }).initial : null;
    };
    expect(await readChatInitial()).toEqual({ broadcastsLeft: VOICE_LIMITS.broadcastsPerDay, isConfigured: true });

    const { roomId } = (await (await call(postAvailable, member.cookie, {})).json()) as { roomId: string };
    expect((await join(member, roomId)).role).toBe(ROOM_ROLES.host);
    expect((await readChatInitial())?.broadcastsLeft).toBe(VOICE_LIMITS.broadcastsPerDay - 1);
    const rooms = (await (await call(postRooms, member.cookie, {})).json()) as { broadcastsLeft: number };
    expect(rooms.broadcastsLeft).toBe(VOICE_LIMITS.broadcastsPerDay - 1);

    await saveModuleState(database, voiceManifest, false);
    expect(await readChatInitial()).toBeNull();
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
      return { ...DEFAULT_PREFERENCES, quietHours: { isOn: true, from: at(-1), to: at(2), days: [0, 1, 2, 3, 4, 5, 6], timeZone: "UTC" } };
    }

    it("'I'm available' alerts every member but those in quiet hours, who muted the host, turned it off or blocked", async () => {
      const [host, awake, sleeping, muting, off, blocking, noPhone] = await members(7);
      for (const member of [host, awake, sleeping, muting, off, blocking]) await withPhone(member!);
      await savePreferences(database, sleeping!.userId, quietNow());
      await setMute(database, muting!.userId, host!.userId, true);
      await savePreferences(database, off!.userId, { ...DEFAULT_PREFERENCES, offKinds: [NOTIFICATION_KINDS.voiceBroadcast] });
      await database.insert(memberBlock).values({ blockerId: blocking!.userId, blockedId: host!.userId });
      void noPhone; // A member with no device on file is simply not read.

      const [first, second] = await Promise.all([call(postAvailable, host!.cookie, {}), call(postAvailable, host!.cookie, {})]);
      const { roomId } = (await first.json()) as { roomId: string };
      await second.json();

      await vi.waitFor(() => expect(push.state.expoMessages).toHaveLength(1), EVENTUALLY);
      expect(push.state.expoMessages[0]).toMatchObject({
        title: "Test Member is available to talk",
        data: { url: `/rooms/${roomId}`, kind: NOTIFICATION_KINDS.voiceBroadcast },
      });
      // The double tap opened one room and sent one alert.
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(push.state.expoMessages).toHaveLength(1);
    });

    it("reminds the members who tapped Remind me when the room starts, once, early or on time", async () => {
      const [host, keen, uninterested] = await members(3);
      for (const member of [host, keen, uninterested]) await withPhone(member!);
      const schedule = async (title: string) => {
        const scheduledFor = new Date(Date.now() + 60 * 60_000).toISOString();
        const response = await call(postCreate, host!.cookie, { title, access: "open", scheduledFor, inviteeIds: [] });
        const { roomId } = (await response.json()) as { roomId: string };
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
