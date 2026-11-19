import { inArray } from "drizzle-orm";

import { getDatabase, type Database } from "../database/client.ts";
import type { Environment } from "../environment.ts";
import { logError } from "../observability/route-logging.ts";
import { runAfterResponse } from "../observability/after-response.ts";
import { DEVICE_TYPES, type NotificationKind } from "./contract.ts";
import { readDevices, readMutersOf, readPreferencesFor } from "./reads.ts";
import { readSkipReason } from "./rules.ts";
import { notificationDevice } from "./schema.ts";
import { DELIVERY_RESULTS, sendExpoPush, sendWebPush, type AlertPayload, type DeliveryResult } from "./send.ts";
import { readVapidKeys } from "./vapid.ts";

// notify(): the one way any part of the app alerts members on their phones and browsers. The names are a contract
// (.ai/features/notifications/SPEC.md): voice rooms and the store app build on them.
//
// Each member's own choices decide. Alerts off, the kind off, a mute of `fromUserId` (broadcasts only) or quiet hours
// in their time zone skip them, counted in `skipped`. Every device of everyone else gets the alert; a device the push
// service says is gone (404/410, or Expo's DeviceNotRegistered) is removed.

const MAXIMUM_TITLE_LENGTH = 120;
const MAXIMUM_BODY_LENGTH = 240;
// A push service can answer "not found" for a subscription made seconds ago; only an older one is dropped for it.
const NEW_DEVICE_GRACE_MS = 10 * 60_000;

export type NotifyInput = {
  userIds: string[];
  kind: NotificationKind;
  title: string;
  body: string;
  // An app path, like /intros/<id>: where tapping the alert opens.
  url: string;
  fromUserId?: string | null;
};

export type NotifyResult = { sent: number; skipped: number; failed: number; removed: number };

export type NotifyDependencies = { database?: Database; environment?: Environment; now?: Date };

type Device = Awaited<ReturnType<typeof readDevices>>[number];

function clip(text: string, length: number) {
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function toAppPath(url: string) {
  return url.startsWith("/") && !url.startsWith("//") ? url : "/";
}

async function deliver(database: Database, environment: Environment, devices: Device[], payload: AlertPayload) {
  const webDevices = devices.filter(({ type }) => type === DEVICE_TYPES.webpush);
  const expoDevices = devices.filter(({ type }) => type === DEVICE_TYPES.expo);
  const keys = webDevices.length > 0 ? await readVapidKeys(database) : null;
  const webResults = keys
    ? await Promise.all(
        webDevices.map((device) =>
          sendWebPush(device, payload, keys, environment).catch((error: unknown) => {
            logError("notify-webpush", error);
            return DELIVERY_RESULTS.failed;
          }),
        ),
      )
    : [];
  const expoResults = await sendExpoPush(
    expoDevices.map(({ address }) => address),
    payload,
    environment,
  ).catch((error: unknown): DeliveryResult[] => {
    logError("notify-expo", error);
    return expoDevices.map(() => DELIVERY_RESULTS.failed);
  });
  const results = [...webResults, ...expoResults];
  return [...webDevices, ...expoDevices].map((device, index) => ({ device, result: results[index] ?? DELIVERY_RESULTS.failed }));
}

// Drops the gone devices (and ones the push service hasn't known for a while), stamps the reached ones, and counts.
async function settle(database: Database, results: Awaited<ReturnType<typeof deliver>>, now: Date) {
  const idsWith = (wanted: DeliveryResult) => results.filter(({ result }) => result === wanted).map(({ device }) => device.id);
  const isLongUnknown = ({ result, device }: (typeof results)[number]) => result === DELIVERY_RESULTS.unknown && now.getTime() - device.createdAt.getTime() > NEW_DEVICE_GRACE_MS;
  const goneIds = [...idsWith(DELIVERY_RESULTS.gone), ...results.filter(isLongUnknown).map(({ device }) => device.id)];
  const sentIds = idsWith(DELIVERY_RESULTS.sent);
  if (goneIds.length > 0) await database.delete(notificationDevice).where(inArray(notificationDevice.id, goneIds));
  if (sentIds.length > 0) await database.update(notificationDevice).set({ lastSentAt: now }).where(inArray(notificationDevice.id, sentIds));
  return { sent: sentIds.length, failed: results.length - sentIds.length - goneIds.length, removed: goneIds.length };
}

export async function notify(input: NotifyInput, dependencies: NotifyDependencies = {}): Promise<NotifyResult> {
  const database = dependencies.database ?? getDatabase();
  const environment = dependencies.environment ?? process.env;
  const now = dependencies.now ?? new Date();
  const userIds = [...new Set(input.userIds)].filter((id) => id !== input.fromUserId);
  const fromUserId = input.fromUserId ?? null;
  const [preferences, muters] = await Promise.all([
    readPreferencesFor(database, userIds),
    fromUserId ? readMutersOf(database, userIds, fromUserId) : Promise.resolve(new Set<string>()),
  ]);

  const wanted = userIds.filter((userId) => {
    const mutedUserIds = fromUserId && muters.has(userId) ? new Set([fromUserId]) : new Set<string>();
    return readSkipReason(preferences.get(userId)!, { kind: input.kind, fromUserId, mutedUserIds, now }) === null;
  });

  const devices = await readDevices(database, wanted);
  const payload = { title: clip(input.title, MAXIMUM_TITLE_LENGTH), body: clip(input.body, MAXIMUM_BODY_LENGTH), url: toAppPath(input.url), kind: input.kind };
  const counts = await settle(database, await deliver(database, environment, devices, payload), now);
  return { ...counts, skipped: userIds.length - wanted.length };
}

// For a change that must not wait on, or fail because of, alerts: they go after the response, and a failure is logged.
// `input` may be a function, so the words (a sender's name, say) are read after the response too; null sends nothing.
export function notifySoon(input: NotifyInput | (() => Promise<NotifyInput | null>), dependencies: NotifyDependencies = {}) {
  runAfterResponse(async () => {
    try {
      const resolved = typeof input === "function" ? await input() : input;
      if (resolved) await notify(resolved, dependencies);
    } catch (error) {
      logError("notify", error);
    }
  });
}

// The test button: straight to this member's own devices, whatever their choices say, to prove the device works.
export async function sendTestAlert(database: Database, environment: Environment, userId: string, payload: Omit<AlertPayload, "kind">) {
  const devices = await readDevices(database, [userId]);
  const counts = await settle(database, await deliver(database, environment, devices, { ...payload, kind: "test" }), new Date());
  return { devices: devices.length, ...counts };
}
