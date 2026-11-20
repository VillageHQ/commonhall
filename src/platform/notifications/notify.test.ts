import { randomUUID } from "node:crypto";

import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { sendMessage } from "@/modules/messages/service";
import { createRequestContext } from "@/platform/http/request-context";
import { INSTANCE_SETTING_KEYS, instanceSettings } from "@/platform/settings/schema";
import { clearDatabase, createTestDatabase } from "@/test/database";
import { makeFakeSubscription, startFakePushServer } from "@/test/fake-push-server";
import { seedMember } from "@/test/members";
import { seedConversation } from "@/test/messages";
import { DEFAULT_PREFERENCES, DEVICE_TYPES, NOTIFICATION_KINDS, PAUSE_CHOICES, registerDeviceBodySchema } from "./contract";
import { notify } from "./notify";
import { notificationDevice } from "./schema";
import { pauseAlerts, registerDevice, savePreferences, setMute } from "./service";
import { readVapidKeys } from "./vapid";

const EVENTUALLY = { timeout: 5_000, interval: 50 };
// Monday 16 November 2026, 12:00 UTC.
const NOON_UTC = new Date("2026-11-16T12:00:00Z");

describe("notify()", () => {
  const database = createTestDatabase();
  let push: Awaited<ReturnType<typeof startFakePushServer>>;

  function environment() {
    return { APP_URL: "http://localhost:3000", EXPO_PUSH_URL: push.expoUrl, PUSH_TEST_ORIGIN: push.url };
  }

  function send(userIds: string[], overrides: Partial<Parameters<typeof notify>[0]> = {}) {
    return notify(
      { userIds, kind: NOTIFICATION_KINDS.message, title: "Message from Ada", body: "Ada sent you a message.", url: "/inbox/1", ...overrides },
      { database, environment: environment(), now: NOON_UTC },
    );
  }

  async function memberWithBrowser(name: string, path = `/push/${randomUUID()}`) {
    const id = await seedMember(database, { name });
    await registerDevice(database, environment(), id, { type: DEVICE_TYPES.webpush, subscription: makeFakeSubscription(`${push.url}${path}`) });
    return id;
  }

  async function deviceCount(userId: string) {
    return (await database.select().from(notificationDevice).where(eq(notificationDevice.userId, userId))).length;
  }

  beforeAll(async () => {
    push = await startFakePushServer();
  });

  beforeEach(async () => {
    await clearDatabase(database);
    push.reset();
  });

  afterAll(async () => {
    await push.close();
    await database.$client.end();
  });

  it("sends an encrypted, VAPID-signed Web Push to every device", async () => {
    const first = await memberWithBrowser("Ada Example");
    const second = await memberWithBrowser("Ben Example");

    expect(await send([first, second])).toEqual({ sent: 2, skipped: 0, failed: 0, removed: 0 });
    expect(push.state.webPushes).toHaveLength(2);
    for (const { headers, bytes } of push.state.webPushes) {
      expect(headers["content-encoding"]).toBe("aes128gcm");
      expect(headers.authorization).toMatch(/^vapid t=.+, k=.+/);
      expect(bytes).toBeGreaterThan(0);
    }
  });

  it("holds back portfolio alerts in a member's quiet time, in their own time zone, and counts them", async () => {
    const sleeping = await memberWithBrowser("Chloe Example");
    const awake = await memberWithBrowser("Dev Example");
    // Noon UTC is 21:00 in Tokyo: inside 20:00–08:00 there.
    const nights = { from: "20:00", to: "08:00", allDay: false, days: [0, 1, 2, 3, 4, 5, 6] };
    await savePreferences(database, sleeping, { ...DEFAULT_PREFERENCES, quietTimes: [nights], timeZone: "Asia/Tokyo" });
    await savePreferences(database, awake, { ...DEFAULT_PREFERENCES, quietTimes: [nights], timeZone: "Europe/London" });

    expect(await send([sleeping, awake], { kind: NOTIFICATION_KINDS.voiceRoom })).toMatchObject({ sent: 1, skipped: 1 });
    expect(push.state.webPushes).toHaveLength(1);
  });

  it("lets an intro ask through a quiet time unless Let through is off, and a pause holds back everything", async () => {
    const letting = await memberWithBrowser("Iris Example");
    const strict = await memberWithBrowser("Jon Example");
    const paused = await memberWithBrowser("Kim Example");
    // Monday noon UTC is inside Working hours in London.
    const working = { from: "09:00", to: "18:00", allDay: false, days: [1, 2, 3, 4, 5] };
    await savePreferences(database, letting, { ...DEFAULT_PREFERENCES, quietTimes: [working], timeZone: "Europe/London" });
    await savePreferences(database, strict, { ...DEFAULT_PREFERENCES, quietTimes: [working], timeZone: "Europe/London", letDirectThrough: false });
    expect(await pauseAlerts(database, paused, { until: PAUSE_CHOICES.hour }, NOON_UTC)).toEqual(new Date(NOON_UTC.getTime() + 60 * 60_000));

    expect(await send([letting, strict, paused], { kind: NOTIFICATION_KINDS.intro })).toMatchObject({ sent: 1, skipped: 2 });
    expect(await send([letting, strict, paused], { kind: NOTIFICATION_KINDS.voiceRoom })).toMatchObject({ sent: 0, skipped: 3 });
    // Resume ends the pause at once.
    expect(await pauseAlerts(database, paused, { until: null }, NOON_UTC)).toBeNull();
    expect(await send([paused], { kind: NOTIFICATION_KINDS.voiceRoom })).toMatchObject({ sent: 1, skipped: 0 });
  });

  it("keeps a muted person's broadcasts away, but not their other alerts", async () => {
    const broadcaster = await seedMember(database, { name: "Eve Example" });
    const listener = await memberWithBrowser("Finn Example");
    await setMute(database, listener, broadcaster, true);

    expect(await send([listener], { kind: NOTIFICATION_KINDS.voiceBroadcast, fromUserId: broadcaster })).toMatchObject({ sent: 0, skipped: 1 });
    expect(await send([listener], { kind: NOTIFICATION_KINDS.message, fromUserId: broadcaster })).toMatchObject({ sent: 1, skipped: 0 });
  });

  it("sends nothing to a member who turned alerts off", async () => {
    const quiet = await memberWithBrowser("Gia Example");
    await savePreferences(database, quiet, { ...DEFAULT_PREFERENCES, isOn: false });

    expect(await send([quiet])).toMatchObject({ sent: 0, skipped: 1 });
    expect(push.state.webPushes).toEqual([]);
  });

  it("removes a subscription the push service says is gone (410)", async () => {
    const member = await memberWithBrowser("Hugo Example", "/push/gone");

    expect(await send([member])).toMatchObject({ sent: 0, removed: 1 });
    expect(await deviceCount(member)).toBe(0);
  });

  it("refuses a subscription that points anywhere but a browser's push service", async () => {
    const member = await seedMember(database, { name: "Lea Example" });
    const register = (endpoint: string) => registerDevice(database, environment(), member, { type: DEVICE_TYPES.webpush, subscription: makeFakeSubscription(endpoint) });

    await expect(register("http://127.0.0.1:5432/internal")).rejects.toThrow("push service");
    await expect(register("https://fcm.googleapis.com.example.com/x")).rejects.toThrow("push service");
    await register("https://fcm.googleapis.com/fcm/send/abc");
    expect(await deviceCount(member)).toBe(1);
  });

  it("keeps a brand-new subscription the push service doesn't know yet (404), and drops an old one", async () => {
    const member = await memberWithBrowser("Ivo Example", "/push/unknown");
    const alert = { userIds: [member], kind: NOTIFICATION_KINDS.message, title: "t", body: "b", url: "/" };

    expect(await notify(alert, { database, environment: environment(), now: new Date() })).toMatchObject({ failed: 1, removed: 0 });
    expect(await deviceCount(member)).toBe(1);
    expect(await notify(alert, { database, environment: environment(), now: new Date(Date.now() + 60 * 60_000) })).toMatchObject({ removed: 1 });
    expect(await deviceCount(member)).toBe(0);
  });

  it("sends to the store app's Expo tokens, and drops one Expo says is unregistered", async () => {
    const member = await seedMember(database, { name: "Ines Example" });
    for (const token of ["ExponentPushToken[workingToken123]", "ExponentPushToken[GoneToken12345]"]) {
      await registerDevice(database, environment(), member, registerDeviceBodySchema.parse({ type: DEVICE_TYPES.expo, token }));
    }

    expect(await send([member])).toMatchObject({ sent: 1, removed: 1 });
    expect(push.state.expoMessages.map(({ to, data }) => ({ to, url: data.url, origin: data.origin }))).toEqual([
      { to: "ExponentPushToken[workingToken123]", url: "/inbox/1", origin: "http://localhost:3000" },
      { to: "ExponentPushToken[GoneToken12345]", url: "/inbox/1", origin: "http://localhost:3000" },
    ]);
    expect(await deviceCount(member)).toBe(1);
  });

  it("makes this server's VAPID keys once and keeps them", async () => {
    const first = await readVapidKeys(database);
    const second = await readVapidKeys(database);

    expect(second).toEqual(first);
    const [stored] = await database.select().from(instanceSettings).where(eq(instanceSettings.key, INSTANCE_SETTING_KEYS.vapidKeys));
    expect(JSON.parse(stored?.value ?? "{}")).toEqual(first);
  });

  it("alerts the recipient of a new message, beside its email", async () => {
    const sender = await seedMember(database, { name: "Jo Example" });
    const recipient = await memberWithBrowser("Kai Example");
    const conversationId = await seedConversation(database, sender, recipient);
    const context = createRequestContext(database, environment(), { id: sender, email: "jo@example.com" });

    await sendMessage(context, { conversationId, clientKey: randomUUID(), body: "Hi there" }, async () => true);

    await vi.waitFor(() => expect(push.state.webPushes).toHaveLength(1), EVENTUALLY);
  });
});
