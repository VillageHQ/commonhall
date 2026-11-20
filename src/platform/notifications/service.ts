import { and, eq } from "drizzle-orm";

import { user } from "../database/auth-schema.ts";
import type { Database } from "../database/client.ts";
import type { Environment } from "../environment.ts";
import { RequestError } from "../http/request-error.ts";
import { DEFAULT_TIME_ZONE, DEVICE_TYPES, PAUSE_CHOICES, type AlertPreferences, type PauseBody, type RegisterDeviceBody } from "./contract.ts";
import { isAllowedPushEndpoint } from "./push-hosts.ts";
import { readLocalMoment } from "./rules.ts";
import { notificationDevice, notificationMute, notificationPreference, notificationQuietTime } from "./schema.ts";

const NOT_FOUND_STATUS = 404;
const UNPROCESSABLE_STATUS = 422;
const HOUR_MS = 60 * 60_000;
const PAUSE_TOMORROW_AT = "08:00";

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

// The choices and the quiet times (the schema allows at most 3) replace what was saved, in one transaction. A pause
// stays as it is.
export async function savePreferences(database: Database, userId: string, preferences: AlertPreferences) {
  const values = {
    isOn: preferences.isOn,
    offKinds: [...new Set(preferences.offKinds)],
    timeZone: preferences.timeZone,
    letDirectThrough: preferences.letDirectThrough,
    updatedAt: new Date(),
  };
  await database.transaction(async (transaction) => {
    await transaction
      .insert(notificationPreference)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: notificationPreference.userId, set: values });
    await transaction.delete(notificationQuietTime).where(eq(notificationQuietTime.userId, userId));
    if (preferences.quietTimes.length === 0) return;
    await transaction.insert(notificationQuietTime).values(
      preferences.quietTimes.map(({ from, to, allDay, days }, index) => ({
        userId,
        from,
        to,
        allDay,
        days: [...new Set(days)].toSorted(),
        // One millisecond apart, so they read back in the order given.
        createdAt: new Date(values.updatedAt.getTime() + index),
      })),
    );
  });
}

// Pause for an hour, until 08:00 tomorrow in the member's time zone, or resume (null). For a member who never saved,
// the browser's zone becomes theirs, as a first save does.
export async function pauseAlerts(database: Database, userId: string, { until, timeZone: browserZone }: PauseBody, now: Date) {
  const [row] = await database.select({ timeZone: notificationPreference.timeZone }).from(notificationPreference).where(eq(notificationPreference.userId, userId));
  const timeZone = row?.timeZone ?? browserZone ?? DEFAULT_TIME_ZONE;
  const pausedUntil = until === PAUSE_CHOICES.hour ? new Date(now.getTime() + HOUR_MS) : until === PAUSE_CHOICES.tomorrow ? readLocalMoment(now, timeZone, 1, PAUSE_TOMORROW_AT) : null;
  await database
    .insert(notificationPreference)
    .values({ userId, pausedUntil, timeZone, updatedAt: now })
    .onConflictDoUpdate({ target: notificationPreference.userId, set: { pausedUntil, timeZone, updatedAt: now } });
  return pausedUntil;
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

