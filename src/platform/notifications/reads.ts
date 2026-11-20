import { and, asc, eq, inArray } from "drizzle-orm";

import { user } from "../database/auth-schema.ts";
import type { DatabaseOrTransaction } from "../database/client.ts";
import { DEFAULT_PREFERENCES, type AlertPreferences, type QuietTime } from "./contract.ts";
import { isPaused, readQuietUntil, type AlertState } from "./rules.ts";
import { notificationDevice, notificationMute, notificationPreference, notificationQuietTime } from "./schema.ts";

type PreferenceRow = typeof notificationPreference.$inferSelect;

function toState(row: PreferenceRow | undefined, quietTimes: QuietTime[]): AlertState {
  if (!row) return { ...DEFAULT_PREFERENCES, quietTimes, pausedUntil: null };
  return {
    isOn: row.isOn,
    offKinds: row.offKinds as AlertPreferences["offKinds"],
    quietTimes,
    timeZone: row.timeZone,
    letDirectThrough: row.letDirectThrough,
    pausedUntil: row.pausedUntil,
  };
}

// Each member's choices, quiet times (in the order saved) and pause.
export async function readPreferencesFor(database: DatabaseOrTransaction, userIds: string[]): Promise<Map<string, AlertState>> {
  if (userIds.length === 0) return new Map();
  const [rows, quietRows] = await Promise.all([
    database.select().from(notificationPreference).where(inArray(notificationPreference.userId, userIds)),
    database.select().from(notificationQuietTime).where(inArray(notificationQuietTime.userId, userIds)).orderBy(asc(notificationQuietTime.createdAt), asc(notificationQuietTime.id)),
  ]);
  const byUser = new Map(rows.map((row) => [row.userId, row]));
  const quietByUser = new Map<string, QuietTime[]>();
  for (const { userId, from, to, allDay, days } of quietRows) quietByUser.set(userId, [...(quietByUser.get(userId) ?? []), { from, to, allDay, days }]);
  return new Map(userIds.map((id) => [id, toState(byUser.get(id), quietByUser.get(id) ?? [])]));
}

export async function readPreferences(database: DatabaseOrTransaction, userId: string) {
  return (await readPreferencesFor(database, [userId])).get(userId)!;
}

// For the bell and the page: alerts on or off, the pause in force (null once over), and when the quiet time covering
// now ends (null outside quiet times).
export async function readAlertState(database: DatabaseOrTransaction, userId: string, now: Date) {
  const state = await readPreferences(database, userId);
  return {
    isOn: state.isOn,
    pausedUntil: isPaused(state.pausedUntil, now) ? state.pausedUntil : null,
    quietUntil: readQuietUntil(state.quietTimes, state.timeZone, now),
    timeZone: state.timeZone,
  };
}

// Who, among these members, muted `fromUserId`'s broadcasts.
export async function readMutersOf(database: DatabaseOrTransaction, userIds: string[], fromUserId: string) {
  if (userIds.length === 0) return new Set<string>();
  const rows = await database
    .select({ userId: notificationMute.userId })
    .from(notificationMute)
    .where(and(inArray(notificationMute.userId, userIds), eq(notificationMute.mutedUserId, fromUserId)));
  return new Set(rows.map(({ userId }) => userId));
}

export async function readMutedPeople(database: DatabaseOrTransaction, userId: string) {
  return database
    .select({ id: user.id, name: user.name })
    .from(notificationMute)
    .innerJoin(user, eq(user.id, notificationMute.mutedUserId))
    .where(eq(notificationMute.userId, userId))
    .orderBy(asc(user.name));
}

export async function readDevices(database: DatabaseOrTransaction, userIds: string[]) {
  if (userIds.length === 0) return [];
  return database
    .select({
      id: notificationDevice.id,
      userId: notificationDevice.userId,
      type: notificationDevice.type,
      address: notificationDevice.address,
      p256dh: notificationDevice.p256dh,
      auth: notificationDevice.auth,
      createdAt: notificationDevice.createdAt,
    })
    .from(notificationDevice)
    .where(inArray(notificationDevice.userId, userIds));
}

// Whether the member ever saved a choice or a pause: until then their zone is the browser's, not yet stored.
export async function readPreferenceSaved(database: DatabaseOrTransaction, userId: string) {
  const [row] = await database.select({ userId: notificationPreference.userId }).from(notificationPreference).where(eq(notificationPreference.userId, userId));
  return row !== undefined;
}
