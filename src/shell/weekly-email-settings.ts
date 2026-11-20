import "server-only";

import type { Database, DatabaseOrTransaction } from "../platform/database/client.ts";
import { readSettings, saveSettings } from "../platform/settings/store.ts";
import { readLocalParts, readNextSend, WEEKDAYS } from "../platform/weekly-email/schedule.ts";
import { readWeeklySchedule } from "../platform/weekly-email/schedule-store.ts";

// Commonhall's "Send the weekly digest" switch (Asks & digest). On unless an admin switched it off; while off, the
// timed job sends nobody a digest. The schedule itself stays in the platform's weekly email settings.
export const WEEKLY_EMAIL_ENABLED_SETTING = "weekly_email_enabled";
const OFF = "false";

export async function readWeeklyEmailEnabled(database: DatabaseOrTransaction) {
  const settings = await readSettings(database, [WEEKLY_EMAIL_ENABLED_SETTING]);
  return settings.get(WEEKLY_EMAIL_ENABLED_SETTING) !== OFF;
}

export async function saveWeeklyEmailEnabled(connection: DatabaseOrTransaction, isEnabled: boolean) {
  await saveSettings(connection, { [WEEKLY_EMAIL_ENABLED_SETTING]: isEnabled ? "true" : OFF });
}

// "Thursday 2026-11-12, 09:00 UTC": when the next digest goes out, in the schedule's own time zone.
export function describeNextDigest(at: Date, timeZone: string) {
  const local = readLocalParts(at, timeZone);
  return `${WEEKDAYS[local.weekday] ?? ""} ${local.date}, ${String(local.hour).padStart(2, "0")}:00 ${timeZone}`;
}

// The weekly email on Announce: on or off, its schedule, and when the next one goes out (null while off).
export async function readWeeklyEmailPlan(database: Database, now = new Date()) {
  const [schedule, isEnabled] = await Promise.all([readWeeklySchedule(database), readWeeklyEmailEnabled(database)]);
  const next = isEnabled ? readNextSend(now, schedule) : null;
  return { schedule, isEnabled, nextLabel: next ? describeNextDigest(next.at, schedule.timeZone) : null };
}
