import { TokenVerifier } from "livekit-server-sdk";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST as postCreate } from "@/app/api/voice/create/route";
import { POST as postEnd } from "@/app/api/voice/end/route";
import { POST as postFollow } from "@/app/api/voice/follow/route";
import { POST as postHand } from "@/app/api/voice/hand/route";
import { POST as postJoin } from "@/app/api/voice/join/route";
import { POST as postRemind } from "@/app/api/voice/remind/route";
import { POST as postLeave } from "@/app/api/voice/leave/route";
import { POST as postNotify } from "@/app/api/voice/notify/route";
import { POST as postRole } from "@/app/api/voice/role/route";
import { POST as postRooms } from "@/app/api/voice/rooms/route";
import { POST as postStart } from "@/app/api/voice/start/route";
import { NOTIFY_AUDIENCES, NOTIFY_OFF, ROLE_ACTIONS, ROOM_NOTIFY_BODY, ROOM_ROLES, VOICE_ERROR_CODES, VOICE_LIMITS, VOICE_MESSAGES, type RoomJoin, type RoomsPageData } from "@/modules/voice/contract";
import { voiceManifest } from "@/modules/voice/manifest";
import { voiceBroadcast } from "@/modules/voice/schema";
import { checkRoom, toLiveKitRoomName } from "@/modules/voice/service";
import { resolveAudience } from "@/modules/voice/service-notify";
import { memberBlock } from "@/modules/members/schema";
import { isModuleEnabled, saveModuleState } from "@/platform/modules/enablement";
import { DEFAULT_PREFERENCES, DEVICE_TYPES, NOTIFICATION_KINDS } from "@/platform/notifications/contract";
import { registerDevice, savePreferences, setMute } from "@/platform/notifications/service";
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

  type Notify = { audience: "followers" | "picked" | "everyone"; memberIds?: string[] } | null;

  async function openRoom(host: Member, access: "open" | "invite" = "open", inviteeIds: string[] = [], notify: Notify = null, title = "Pricing for seed founders") {
    const response = await call(postCreate, host.cookie, { title, access, scheduledFor: null, inviteeIds, notify });
    expect(response.status).toBe(200);
    return ((await response.json()) as { roomId: string }).roomId;
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

  it("counts Notify against 3 a day, refuses a 4th with when it resets, and remembers the last choice", async () => {
    const member = await createSignedInMember(database);
    expect((await readRooms(member)).notify).toEqual({ left: VOICE_LIMITS.broadcastsPerDay, resetsAt: null, choice: NOTIFY_OFF });

    for (let room = 0; room < VOICE_LIMITS.broadcastsPerDay; room += 1) {
      const roomId = await openRoom(member, "open", [], { audience: NOTIFY_AUDIENCES.followers }, `Room ${room}`);
      await call(postEnd, member.cookie, { roomId });
    }
    const page = await readRooms(member);
    expect(page.notify).toMatchObject({ left: 0, choice: NOTIFY_AUDIENCES.followers });
    expect(page.notify.resetsAt).not.toBeNull();

    const fourth = await call(postCreate, member.cookie, { title: "One more", access: "open", scheduledFor: null, inviteeIds: [], notify: { audience: NOTIFY_AUDIENCES.everyone } });
    expect(fourth.status).toBe(429);
    expect(await fourth.json()).toMatchObject({ code: VOICE_ERROR_CODES.broadcastLimit, message: VOICE_MESSAGES.broadcastLimit });
    // Starting without notifying still works, and is remembered as off.
    await openRoom(member, "open", [], null, "Quiet room");
    expect((await readRooms(member)).notify.choice).toBe(NOTIFY_OFF);
    // "People I pick" needs someone picked.
    const nobody = await call(postCreate, member.cookie, { title: "Picked", access: "open", scheduledFor: null, inviteeIds: [], notify: { audience: NOTIFY_AUDIENCES.picked, memberIds: [] } });
    expect(nobody.status).toBe(422);
  });

  it("lets someone who joined tell up to 10 people they're here, once per room", async () => {
    const [host, guest, friend] = await Promise.all([createSignedInMember(database), createSignedInMember(database), createSignedInMember(database)]);
    const roomId = await openRoom(host);

    const early = await call(postNotify, guest.cookie, { roomId, memberIds: [friend.userId] });
    expect(early.status).toBe(403);
    expect(await early.json()).toMatchObject({ code: VOICE_ERROR_CODES.notInRoom });

    await join(guest, roomId);
    expect((await call(postNotify, guest.cookie, { roomId, memberIds: Array.from({ length: VOICE_LIMITS.pickedOnJoin + 1 }, () => friend.userId) })).status).toBe(422);
    expect((await call(postNotify, guest.cookie, { roomId, memberIds: [friend.userId] })).status).toBe(200);
    const again = await call(postNotify, guest.cookie, { roomId, memberIds: [friend.userId] });
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ code: VOICE_ERROR_CODES.notifiedAlready });
    const rows = await database.select({ audience: voiceBroadcast.audience }).from(voiceBroadcast);
    expect(rows).toEqual([{ audience: NOTIFY_AUDIENCES.picked }]);
  });

  it("follows and unfollows from a room card or profile, and lists follows in Your data's export", async () => {
    const [fan, host] = await Promise.all([createSignedInMember(database), createSignedInMember(database)]);
    await openRoom(host);
    expect((await readRooms(fan)).live[0]?.isFollowingHost).toBe(false);

    expect((await call(postFollow, fan.cookie, { memberId: host.userId, isFollowing: true })).status).toBe(200);
    expect((await call(postFollow, fan.cookie, { memberId: host.userId, isFollowing: true })).status).toBe(200);
    expect((await readRooms(fan)).live[0]?.isFollowingHost).toBe(true);
    const exported = await readMemberExport(database, fan.userId);
    expect(exported.roomsYouFollow).toEqual([expect.objectContaining({ memberId: host.userId })]);

    expect((await call(postFollow, fan.cookie, { memberId: host.userId, isFollowing: false })).status).toBe(200);
    expect((await readRooms(fan)).live[0]?.isFollowingHost).toBe(false);
    expect((await call(postFollow, fan.cookie, { memberId: "no-such-member", isFollowing: true })).status).toBe(404);
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

  describe("who a notify reaches", () => {
    const base = { senderId: "sender", followerIds: ["a", "b", "sender"], pickedIds: ["c", "d"], invitedIds: null, inRoomIds: [] };

    it("resolves followers, people picked and everyone, never the sender", () => {
      expect(resolveAudience({ ...base, audience: NOTIFY_AUDIENCES.followers }).among).toEqual(["a", "b"]);
      expect(resolveAudience({ ...base, audience: NOTIFY_AUDIENCES.picked }).among).toEqual(["c", "d"]);
      const everyone = resolveAudience({ ...base, audience: NOTIFY_AUDIENCES.everyone });
      expect(everyone.among).toBeNull();
      expect(everyone.exclude.has("sender")).toBe(true);
    });

    it("narrows an invite-only room to its invited, Everyone included", () => {
      const invitedIds = ["b", "d", "e"];
      expect(resolveAudience({ ...base, invitedIds, audience: NOTIFY_AUDIENCES.followers }).among).toEqual(["b"]);
      expect(resolveAudience({ ...base, invitedIds, audience: NOTIFY_AUDIENCES.picked }).among).toEqual(["d"]);
      expect(resolveAudience({ ...base, invitedIds, audience: NOTIFY_AUDIENCES.everyone }).among).toEqual(["b", "d", "e"]);
    });

    it("leaves out anyone already in the room", () => {
      const resolved = resolveAudience({ ...base, inRoomIds: ["a"], audience: NOTIFY_AUDIENCES.followers });
      expect(resolved.among).toEqual(["b"]);
      expect(resolved.exclude.has("a")).toBe(true);
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

    it("Notify → My followers alerts followers only, but not those muting, in quiet hours, blocked or with it off", async () => {
      const [host, follower, stranger, sleeping, muting, off, blocking] = await members(7);
      for (const member of [host, follower, stranger, sleeping, muting, off, blocking]) await withPhone(member!);
      for (const member of [follower, sleeping, muting, off, blocking]) expect((await call(postFollow, member!.cookie, { memberId: host!.userId, isFollowing: true })).status).toBe(200);
      await savePreferences(database, sleeping!.userId, quietNow());
      await setMute(database, muting!.userId, host!.userId, true);
      await savePreferences(database, off!.userId, { ...DEFAULT_PREFERENCES, offKinds: [NOTIFICATION_KINDS.voiceBroadcast] });
      await database.insert(memberBlock).values({ blockerId: host!.userId, blockedId: blocking!.userId });

      const roomId = await openRoom(host!, "open", [], { audience: NOTIFY_AUDIENCES.followers }, "Agents in production");

      await vi.waitFor(() => expect(push.state.expoMessages).toHaveLength(1), EVENTUALLY);
      expect(push.state.expoMessages[0]).toMatchObject({
        title: "Test Member started \u201cAgents in production\u201d",
        body: ROOM_NOTIFY_BODY,
        data: { url: `/rooms/${roomId}`, kind: NOTIFICATION_KINDS.voiceBroadcast },
      });
      await vi.waitFor(async () => expect(await database.select({ reached: voiceBroadcast.reached }).from(voiceBroadcast)).toEqual([{ reached: 1 }]), EVENTUALLY);
    });

    it("sends nothing with Notify off, and a scheduled room's Notify when the host starts it", async () => {
      const [host, follower] = await members(2);
      for (const member of [host, follower]) await withPhone(member!);
      await call(postFollow, follower!.cookie, { memberId: host!.userId, isFollowing: true });

      await openRoom(host!, "open", [], null, "No alert");
      const scheduledFor = new Date(Date.now() + 60 * 60_000).toISOString();
      const scheduled = await call(postCreate, host!.cookie, { title: "Later", access: "open", scheduledFor, inviteeIds: [], notify: { audience: NOTIFY_AUDIENCES.followers } });
      const { roomId } = (await scheduled.json()) as { roomId: string };
      await new Promise((resolve) => setTimeout(resolve, 200));
      expect(push.state.expoMessages).toHaveLength(0);
      expect((await readRooms(host!)).notify.left).toBe(VOICE_LIMITS.broadcastsPerDay);

      expect((await call(postStart, host!.cookie, { roomId })).status).toBe(200);
      await vi.waitFor(() => expect(push.state.expoMessages).toHaveLength(1), EVENTUALLY);
      expect(push.state.expoMessages[0]).toMatchObject({ title: "Test Member started \u201cLater\u201d", data: { url: `/rooms/${roomId}` } });
    });

    it("in an invite-only room, Everyone reaches only the invited, and nobody already in the room", async () => {
      const [host, invited, listening, outsider] = await members(4);
      for (const member of [host, invited, listening, outsider]) await withPhone(member!);
      const roomId = await openRoom(host!, "invite", [invited!.userId, listening!.userId]);
      livekit.connect(toLiveKitRoomName(roomId), host!.userId, listening!.userId);

      const result = await sendRoomNotify(database, process.env, { roomId, senderId: host!.userId, audience: NOTIFY_AUDIENCES.everyone });
      expect(result).toMatchObject({ sent: 1, capped: 0 });
      expect(push.state.expoMessages).toHaveLength(1);
    });

    it("alerts a member once per room, and at most 5 a day from others' notifies (the 6th is skipped and counted)", async () => {
      const [receiver, ...senders] = await members(VOICE_LIMITS.notifiesReceivedPerDay + 2);
      await withPhone(receiver!);
      const send = (roomId: string, senderId: string, isStart = true) => sendRoomNotify(database, process.env, { roomId, senderId, audience: NOTIFY_AUDIENCES.picked, memberIds: [receiver!.userId], isStart });

      const first = await openRoom(senders[0]!);
      expect(await send(first, senders[0]!.userId)).toMatchObject({ sent: 1 });
      // Someone else in the same room telling them too: still one alert for that room.
      await join(senders[1]!, first);
      expect(await send(first, senders[1]!.userId, false)).toMatchObject({ sent: 0, capped: 0 });

      for (const sender of senders.slice(1, VOICE_LIMITS.notifiesReceivedPerDay)) {
        expect(await send(await openRoom(sender!, "open", [], null, `Room of ${sender!.userId}`), sender!.userId)).toMatchObject({ sent: 1 });
      }
      const sixth = senders[VOICE_LIMITS.notifiesReceivedPerDay]!;
      expect(await send(await openRoom(sixth), sixth.userId)).toMatchObject({ sent: 0, capped: 1 });
      expect(push.state.expoMessages).toHaveLength(VOICE_LIMITS.notifiesReceivedPerDay);
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
