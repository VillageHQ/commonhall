import { MUTABLE_KINDS, type AlertPreferences, type NotificationKind, type QuietHours } from "./contract.ts";

// Pure rules: is this member in quiet hours now, and does this alert reach them.

const MINUTES_PER_HOUR = 60;
const DAYS_IN_WEEK = 7;
const WEEKDAY_NUMBERS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

function toMinutes(clock: string) {
  const [hours = 0, minutes = 0] = clock.split(":").map(Number);
  return hours * MINUTES_PER_HOUR + minutes;
}

// The wall clock in a time zone: the weekday (0 = Sunday) and minutes since midnight.
export function readLocalClock(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? "";
  return { weekday: WEEKDAY_NUMBERS[part("weekday")] ?? 0, minutes: Number(part("hour")) * MINUTES_PER_HOUR + Number(part("minute")) };
}

// A spell runs from `from` to `to` on each chosen day. When `to` is earlier than `from` it runs overnight, and the
// morning part belongs to the day before: quiet Friday 22:00–07:00 covers Saturday until seven.
export function isInQuietHours(quiet: QuietHours, now: Date) {
  if (!quiet.isOn || quiet.days.length === 0) return false;
  const from = toMinutes(quiet.from);
  const to = toMinutes(quiet.to);
  if (from === to) return false;
  const { weekday, minutes } = readLocalClock(now, quiet.timeZone);
  if (from < to) return quiet.days.includes(weekday) && minutes >= from && minutes < to;
  const yesterday = (weekday + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK;
  return (minutes >= from && quiet.days.includes(weekday)) || (minutes < to && quiet.days.includes(yesterday));
}

export const SKIP_REASONS = { off: "off", kindOff: "kind_off", quietHours: "quiet_hours", muted: "muted" } as const;

export type SkipReason = (typeof SKIP_REASONS)[keyof typeof SKIP_REASONS];

type AlertFacts = { kind: NotificationKind; fromUserId?: string | null; mutedUserIds: ReadonlySet<string>; now: Date };

// Why this alert should not reach the member, or null when it should.
export function readSkipReason(preferences: AlertPreferences, { kind, fromUserId, mutedUserIds, now }: AlertFacts): SkipReason | null {
  if (!preferences.isOn) return SKIP_REASONS.off;
  if (preferences.offKinds.includes(kind)) return SKIP_REASONS.kindOff;
  if (fromUserId && MUTABLE_KINDS.includes(kind) && mutedUserIds.has(fromUserId)) return SKIP_REASONS.muted;
  if (isInQuietHours(preferences.quietHours, now)) return SKIP_REASONS.quietHours;
  return null;
}
