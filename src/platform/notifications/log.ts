import { desc, eq, lt } from "drizzle-orm";

import type { Database } from "../database/client.ts";
import { isDemoMode } from "../demo/mode.ts";
import type { Environment } from "../environment.ts";
import { logError } from "../observability/route-logging.ts";
import type { SkipReason } from "./rules.ts";
import { notificationLog } from "./schema.ts";

// The alert log, for checking who got which alert. Only in demo mode and development: a real community never
// keeps it, and its page (/me/alerts/log) is a 404 there.

const KEPT_DAYS = 7;
const DAY_MS = 24 * 60 * 60_000;
export const ALERT_LOG_LENGTH = 20;

export const ALERT_LOG_STATUSES = { sent: "sent", skipped: "skipped" } as const;

export type AlertLogEntry = { userId: string; kind: string; title: string; url: string; reason: SkipReason | null };

export function isAlertLogOn(environment: Environment) {
  return isDemoMode(environment) || environment.NODE_ENV === "development";
}

// One row per entry (a null reason means sent), and rows older than 7 days go. A failure is logged, never thrown:
// the log must not stop an alert.
export async function writeAlertLog(database: Database, environment: Environment, entries: AlertLogEntry[], now: Date) {
  if (!isAlertLogOn(environment) || entries.length === 0) return;
  try {
    await database.delete(notificationLog).where(lt(notificationLog.createdAt, new Date(now.getTime() - KEPT_DAYS * DAY_MS)));
    await database.insert(notificationLog).values(
      entries.map(({ reason, ...entry }) => ({
        ...entry,
        status: reason ? ALERT_LOG_STATUSES.skipped : ALERT_LOG_STATUSES.sent,
        reason,
        createdAt: now,
      })),
    );
  } catch (error) {
    logError("notify-log", error);
  }
}

// This member's last 20 alerts, newest first.
export async function readAlertLog(database: Database, userId: string) {
  return database
    .select({ id: notificationLog.id, kind: notificationLog.kind, title: notificationLog.title, url: notificationLog.url, status: notificationLog.status, reason: notificationLog.reason, createdAt: notificationLog.createdAt })
    .from(notificationLog)
    .where(eq(notificationLog.userId, userId))
    .orderBy(desc(notificationLog.createdAt))
    .limit(ALERT_LOG_LENGTH);
}
