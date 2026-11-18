import { toCsv } from "../members/contract-bulk-invites.ts";
import { COMMUNITY_ROLE_LABELS, type CommunityRole } from "../members/contract-community-roles.ts";

// Calls requested: each "Book a call" click, counted per person and per week. Pure, so the page, the CSV and the tests
// share it. Commonhall doesn't see confirmed bookings (the owner chose click counts).

export type CallRow = { id: string; createdAt: Date; requesterName: string; memberId: string | null; memberName: string; memberRole: CommunityRole };

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_DAYS = 30;
export const WEEKS_SHOWN = 12;

// The Monday (UTC) that starts a date's week, as YYYY-MM-DD.
export function toWeekStart(date: Date) {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const sinceMonday = (day.getUTCDay() + 6) % 7;
  return new Date(day.getTime() - sinceMonday * DAY_MS).toISOString().slice(0, 10);
}

export function countCalls(rows: readonly CallRow[], now = new Date()) {
  const byPerson = new Map<string, { memberId: string | null; name: string; role: CommunityRole; calls: number }>();
  for (const row of rows) {
    const key = row.memberId ?? `deleted:${row.memberName}`;
    const person = byPerson.get(key) ?? { memberId: row.memberId, name: row.memberName, role: row.memberRole, calls: 0 };
    person.calls += 1;
    byPerson.set(key, person);
  }
  const thisWeek = toWeekStart(now);
  const weeks = Array.from({ length: WEEKS_SHOWN }, (_, index) => toWeekStart(new Date(Date.parse(thisWeek) - index * 7 * DAY_MS)));
  const perWeek = new Map(weeks.map((week) => [week, 0]));
  for (const row of rows) {
    const week = toWeekStart(row.createdAt);
    if (perWeek.has(week)) perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }
  return {
    total: rows.length,
    lastThirtyDays: rows.filter(({ createdAt }) => now.getTime() - createdAt.getTime() <= RECENT_DAYS * DAY_MS).length,
    perPerson: [...byPerson.values()].sort((first, second) => second.calls - first.calls || first.name.localeCompare(second.name)),
    perWeek: weeks.map((week) => ({ week, calls: perWeek.get(week) ?? 0 })),
  };
}

export function renderCallsCsv(rows: readonly CallRow[]) {
  const lines = rows.map((row) => [row.createdAt.toISOString(), toWeekStart(row.createdAt), row.requesterName, row.memberName, COMMUNITY_ROLE_LABELS[row.memberRole]]);
  return `${toCsv([["requested_at", "week_of", "asked_by", "call_with", "their_role"], ...lines])}\r\n`;
}

export const CALLS_CSV_FILE_NAME = "calls-requested.csv";
export const CALLS_CSV_API_ROUTE = "/api/admin/calls";
