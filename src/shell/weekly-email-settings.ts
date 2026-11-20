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

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "Thursday 26 Nov, 09:00 (UTC)": Announce's line, in the schedule's own time zone.
export function describeNextSend(at: Date, timeZone: string) {
  const local = readLocalParts(at, timeZone);
  const [, month = "1", day = "1"] = local.date.split("-");
  return `${WEEKDAYS[local.weekday] ?? ""} ${Number(day)} ${MONTHS[Number(month) - 1] ?? ""}, ${String(local.hour).padStart(2, "0")}:00 (${timeZone.replace(/_/g, " ")})`;
}

// The weekly email on Announce: on or off, its schedule, and when the next one goes out (null while off).
export async function readWeeklyEmailPlan(database: Database, now = new Date()) {
  const [schedule, isEnabled] = await Promise.all([readWeeklySchedule(database), readWeeklyEmailEnabled(database)]);
  const next = isEnabled ? readNextSend(now, schedule) : null;
  return { schedule, isEnabled, nextLabel: next ? describeNextSend(next.at, schedule.timeZone) : null };
}
