import { and, eq } from "drizzle-orm";

import { user } from "../database/auth-schema.ts";
import type { Database } from "../database/client.ts";
import type { Environment } from "../environment.ts";
import { RequestError } from "../http/request-error.ts";
import { DEVICE_TYPES, type AlertPreferences, type RegisterDeviceBody } from "./contract.ts";
import { isAllowedPushEndpoint } from "./push-hosts.ts";
import { notificationDevice, notificationMute, notificationPreference } from "./schema.ts";

const NOT_FOUND_STATUS = 404;
const UNPROCESSABLE_STATUS = 422;

// A device registers once per browser or phone. Registering again (a new sign-in on that device) moves it to the
// member signed in now, so alerts never reach the previous one.
export async function registerDevice(database: Database, environment: Environment, userId: string, body: RegisterDeviceBody) {
  if (body.type === DEVICE_TYPES.webpush && !isAllowedPushEndpoint(body.subscription.endpoint, environment)) {
    throw new RequestError(UNPROCESSABLE_STATUS, "notification_endpoint_refused", "This browser’s push service isn’t one we can send to.");
  }
  const columns =
    body.type === DEVICE_TYPES.webpush
      ? { type: body.type, address: body.subscription.endpoint, p256dh: body.subscription.keys.p256dh, auth: body.subscription.keys.auth }
      : { type: body.type, address: body.token, p256dh: null, auth: null };
  await database
    .insert(notificationDevice)
    .values({ userId, ...columns })
    .onConflictDoUpdate({ target: notificationDevice.address, set: { userId, type: columns.type, p256dh: columns.p256dh, auth: columns.auth, createdAt: new Date() } });
}

export async function forgetDevice(database: Database, userId: string, address: string) {
  await database.delete(notificationDevice).where(and(eq(notificationDevice.address, address), eq(notificationDevice.userId, userId)));
}

export async function savePreferences(database: Database, userId: string, preferences: AlertPreferences) {
  const { quietHours } = preferences;
  const values = {
    isOn: preferences.isOn,
    offKinds: [...new Set(preferences.offKinds)],
    quietIsOn: quietHours.isOn,
    quietFrom: quietHours.from,
    quietTo: quietHours.to,
    quietDays: [...new Set(quietHours.days)].toSorted(),
    timeZone: quietHours.timeZone,
    updatedAt: new Date(),
  };
  await database
    .insert(notificationPreference)
    .values({ userId, ...values })
    .onConflictDoUpdate({ target: notificationPreference.userId, set: values });
}

export async function setMute(database: Database, userId: string, mutedUserId: string, isMuted: boolean) {
  if (!isMuted) {
    await database.delete(notificationMute).where(and(eq(notificationMute.userId, userId), eq(notificationMute.mutedUserId, mutedUserId)));
    return;
  }
  if (mutedUserId === userId) throw new RequestError(UNPROCESSABLE_STATUS, "notification_mute_self", "You can’t mute yourself.");
  const [person] = await database.select({ id: user.id }).from(user).where(eq(user.id, mutedUserId));
  if (!person) throw new RequestError(NOT_FOUND_STATUS, "notification_mute_unknown", "That member is no longer here.");
  await database.insert(notificationMute).values({ userId, mutedUserId }).onConflictDoNothing();
}

