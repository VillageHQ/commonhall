import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { clearDatabase, createTestDatabase } from "@/test/database";
import { makeFakeSubscription, startFakePushServer } from "@/test/fake-push-server";
import { seedMember } from "@/test/members";
import { DEFAULT_PREFERENCES, DEVICE_TYPES, NOTIFICATION_KINDS } from "./contract";
import { readAlertLog } from "./log";
import { notify, sendTestAlert } from "./notify";
import { notificationLog } from "./schema";
import { registerDevice, savePreferences } from "./service";

// Monday 16 November 2026, 12:00 UTC.
const NOON_UTC = new Date("2026-11-16T12:00:00Z");
const DEMO = { APP_URL: "http://localhost:3000", DEMO_MODE: "true", NODE_ENV: "production" };
const PRODUCTION = { APP_URL: "http://localhost:3000", NODE_ENV: "production" };

describe("the alert log", () => {
  const database = createTestDatabase();
  let push: Awaited<ReturnType<typeof startFakePushServer>>;

  function send(userIds: string[], environment: Record<string, string>, now = NOON_UTC) {
    return notify({ userIds, kind: NOTIFICATION_KINDS.message, title: "Message from Ada", body: "Ada sent you a message.", url: "/inbox/1" }, { database, environment, now });
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

  it("in demo mode, logs each member's alert as sent or skipped, with the reason", async () => {
    const awake = await seedMember(database, { name: "Ada Example" });
    const off = await seedMember(database, { name: "Ben Example" });
    await savePreferences(database, off, { ...DEFAULT_PREFERENCES, isOn: false });

    await send([awake, off], DEMO);

    expect(await readAlertLog(database, awake)).toEqual([expect.objectContaining({ kind: "message", title: "Message from Ada", url: "/inbox/1", status: "sent", reason: null })]);
    expect(await readAlertLog(database, off)).toEqual([expect.objectContaining({ status: "skipped", reason: "off" })]);
  });

  it("logs the test alert as sent once the member has a device, and not before", async () => {
    const environment = { ...DEMO, PUSH_TEST_ORIGIN: push.url };
    const member = await seedMember(database, { name: "Ada Example" });
    const alert = { title: "Demo: a test alert", body: "Alerts work on this device.", url: "/me/alerts" };
    await sendTestAlert(database, environment, member, alert);
    expect(await readAlertLog(database, member)).toEqual([]);

    await registerDevice(database, environment, member, { type: DEVICE_TYPES.webpush, subscription: makeFakeSubscription(`${push.url}/push/ada`) });
    await sendTestAlert(database, environment, member, alert);
    expect(await readAlertLog(database, member)).toEqual([expect.objectContaining({ kind: "test", status: "sent" })]);
  });

  it("writes nothing in production without demo mode", async () => {
    const member = await seedMember(database, { name: "Ada Example" });
    await send([member], PRODUCTION);
    await sendTestAlert(database, PRODUCTION, member, { title: "A test alert", body: "Alerts work on this device.", url: "/me/alerts" });
    expect(await database.select().from(notificationLog)).toEqual([]);
  });

  it("keeps 7 days, and lists the last 20, newest first", async () => {
    const member = await seedMember(database, { name: "Ada Example" });
    await send([member], DEMO, new Date("2026-11-01T12:00:00Z"));
    for (let minute = 0; minute < 21; minute += 1) await send([member], DEMO, new Date(NOON_UTC.getTime() + minute * 60_000));

    expect(await database.select().from(notificationLog)).toHaveLength(21);
    const listed = await readAlertLog(database, member);
    expect(listed).toHaveLength(20);
    expect(listed[0]!.createdAt.getTime()).toBeGreaterThan(listed[19]!.createdAt.getTime());
  });
});
