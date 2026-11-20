import { isDirectKind, MUTABLE_KINDS, type AlertPreferences, type NotificationKind, type QuietTime } from "./contract.ts";

// Pure rules: is this member in a quiet time or a pause now, until when, and does this alert reach them.

const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;
const DAYS_IN_WEEK = 7;
const MINUTES_PER_WEEK = DAYS_IN_WEEK * MINUTES_PER_DAY;
const MS_PER_MINUTE = 60_000;
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

// Whether a quiet time covers a wall-clock moment. All day covers its days from 00:00 to 24:00. Otherwise it runs from
// `from` to `to` on each chosen day; when `to` is earlier than `from` it runs overnight, and the morning part belongs
// to the day before: quiet Friday 22:00–07:00 covers Saturday until seven.
function coversClock(quiet: QuietTime, weekday: number, minutes: number) {
  if (quiet.allDay) return quiet.days.includes(weekday);
  const from = toMinutes(quiet.from);
  const to = toMinutes(quiet.to);
  if (from === to) return false;
  if (from < to) return quiet.days.includes(weekday) && minutes >= from && minutes < to;
  const yesterday = (weekday + DAYS_IN_WEEK - 1) % DAYS_IN_WEEK;
  return (minutes >= from && quiet.days.includes(weekday)) || (minutes < to && quiet.days.includes(yesterday));
}

function coversAny(quietTimes: readonly QuietTime[], weekday: number, minutes: number) {
  return quietTimes.some((quiet) => coversClock(quiet, weekday, minutes));
}

export function isInQuietTime(quietTimes: readonly QuietTime[], timeZone: string, now: Date) {
  if (quietTimes.length === 0) return false;
  const { weekday, minutes } = readLocalClock(now, timeZone);
  return coversAny(quietTimes, weekday, minutes);
}

// When the quiet times covering now end (joined ones count as one), or null when none covers now. A week that is
// quiet all through has no end: it answers with the moment a week on.
export function readQuietUntil(quietTimes: readonly QuietTime[], timeZone: string, now: Date) {
  if (quietTimes.length === 0) return null;
  const { weekday, minutes } = readLocalClock(now, timeZone);
  if (!coversAny(quietTimes, weekday, minutes)) return null;
  const start = weekday * MINUTES_PER_DAY + minutes;
  let ahead = 1;
  for (; ahead < MINUTES_PER_WEEK; ahead += 1) {
    const moment = (start + ahead) % MINUTES_PER_WEEK;
    if (!coversAny(quietTimes, Math.floor(moment / MINUTES_PER_DAY), moment % MINUTES_PER_DAY)) break;
  }
  // From the start of the current minute, so "until 18:00" reads 18:00 sharp.
  const minuteStart = now.getTime() - (now.getTime() % MS_PER_MINUTE);
  return new Date(minuteStart + ahead * MS_PER_MINUTE);
}

// A pause in force at `now`.
export function isPaused(pausedUntil: Date | null | undefined, now: Date) {
  return pausedUntil != null && pausedUntil.getTime() > now.getTime();
}

// The wall clock in a time zone as if it were UTC, in milliseconds: its distance from the instant is the zone's offset.
function readWallTime(instant: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(instant);
  const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value ?? 0);
  return Date.UTC(part("year"), part("month") - 1, part("day"), part("hour"), part("minute"));
}

// The instant of `clock` (like "08:00") on the date `dayOffset` days after now's, in a time zone.
export function readLocalMoment(now: Date, timeZone: string, dayOffset: number, clock: string) {
  const today = new Date(readWallTime(now.getTime(), timeZone));
  const wanted = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + dayOffset) + toMinutes(clock) * MS_PER_MINUTE;
  // Guess with the offset at the wanted wall time, then correct once with the offset at the guess (DST moves it).
  const guess = wanted - (readWallTime(wanted, timeZone) - wanted);
  return new Date(wanted - (readWallTime(guess, timeZone) - guess));
}

export const SKIP_REASONS = { off: "off", kindOff: "kind_off", quietHours: "quiet_hours", muted: "muted", paused: "paused" } as const;

export type SkipReason = (typeof SKIP_REASONS)[keyof typeof SKIP_REASONS];

// A member's saved choices plus their pause, as notify() reads them.
export type AlertState = AlertPreferences & { pausedUntil: Date | null };

type AlertFacts = { kind: NotificationKind; fromUserId?: string | null; mutedUserIds: ReadonlySet<string>; now: Date };

// Why this alert should not reach the member, or null when it should. A pause holds back every kind; a quiet time
// holds back portfolio kinds, and direct ones too when Let through is off.
export function readSkipReason(state: AlertState, { kind, fromUserId, mutedUserIds, now }: AlertFacts): SkipReason | null {
  if (!state.isOn) return SKIP_REASONS.off;
  if (state.offKinds.includes(kind)) return SKIP_REASONS.kindOff;
  if (fromUserId && MUTABLE_KINDS.includes(kind) && mutedUserIds.has(fromUserId)) return SKIP_REASONS.muted;
  if (isPaused(state.pausedUntil, now)) return SKIP_REASONS.paused;
  if (state.letDirectThrough && isDirectKind(kind)) return null;
  if (isInQuietTime(state.quietTimes, state.timeZone, now)) return SKIP_REASONS.quietHours;
  return null;
}
