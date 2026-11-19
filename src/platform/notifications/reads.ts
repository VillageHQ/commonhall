import { and, asc, eq, inArray } from "drizzle-orm";

import { user } from "../database/auth-schema.ts";
import type { DatabaseOrTransaction } from "../database/client.ts";
import { DEFAULT_PREFERENCES, type AlertPreferences } from "./contract.ts";
import { notificationDevice, notificationMute, notificationPreference } from "./schema.ts";

type PreferenceRow = typeof notificationPreference.$inferSelect;

function toPreferences(row: PreferenceRow | undefined): AlertPreferences {
  if (!row) return DEFAULT_PREFERENCES;
  return {
    isOn: row.isOn,
    offKinds: row.offKinds as AlertPreferences["offKinds"],
    quietHours: { isOn: row.quietIsOn, from: row.quietFrom, to: row.quietTo, days: row.quietDays, timeZone: row.timeZone },
  };
}

export async function readPreferences(database: DatabaseOrTransaction, userId: string) {
  const [row] = await database.select().from(notificationPreference).where(eq(notificationPreference.userId, userId));
  return toPreferences(row);
}

export async function readPreferencesFor(database: DatabaseOrTransaction, userIds: string[]) {
  const rows = userIds.length === 0 ? [] : await database.select().from(notificationPreference).where(inArray(notificationPreference.userId, userIds));
  const byUser = new Map(rows.map((row) => [row.userId, row]));
  return new Map(userIds.map((id) => [id, toPreferences(byUser.get(id))]));
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

export async function readPreferenceSaved(database: DatabaseOrTransaction, userId: string) {
  const [row] = await database.select({ userId: notificationPreference.userId }).from(notificationPreference).where(eq(notificationPreference.userId, userId));
  return row !== undefined;
}
