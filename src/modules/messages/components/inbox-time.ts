import { readMessageDayKey } from "@/modules/messages/rules-time";

// The Inbox's times (ui-polish Part 3): "14:05" today, "Tue" this week, "21 Nov" before that (with the year when it
// isn't this year), in the reader's own time zone.
const LOCALE = "en-GB";
const WEEKDAY_SPAN_DAYS = 7;

function format(timestamp: string, timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(LOCALE, { ...options, timeZone }).format(new Date(timestamp));
}

function readDaysAgo(timestamp: string, timeZone: string, now: Date) {
  return Number(readMessageDayKey(now.toISOString(), timeZone)) - Number(readMessageDayKey(timestamp, timeZone));
}

function readYear(date: string | Date, timeZone: string) {
  return format(new Date(date).toISOString(), timeZone, { year: "numeric" });
}

export function formatClock(timestamp: string, timeZone: string) {
  return format(timestamp, timeZone, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

function formatDate(timestamp: string, timeZone: string, now: Date, options: Intl.DateTimeFormatOptions) {
  const isThisYear = readYear(timestamp, timeZone) === readYear(now, timeZone);
  return format(timestamp, timeZone, isThisYear ? options : { ...options, year: "numeric" });
}

// A row's time: "14:05", "Tue", "21 Nov".
export function formatRowTime(timestamp: string, timeZone: string, now = new Date()) {
  const daysAgo = readDaysAgo(timestamp, timeZone, now);
  if (daysAgo <= 0) return formatClock(timestamp, timeZone);
  if (daysAgo < WEEKDAY_SPAN_DAYS) return format(timestamp, timeZone, { weekday: "short" });
  return formatDate(timestamp, timeZone, now, { day: "numeric", month: "short" });
}

// A day's divider in a thread: "Today", "Yesterday", "Mon 17 Nov".
export function formatDayDivider(timestamp: string, timeZone: string, now = new Date()) {
  const daysAgo = readDaysAgo(timestamp, timeZone, now);
  if (daysAgo <= 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  return formatDate(timestamp, timeZone, now, { weekday: "short", day: "numeric", month: "short" }).replace(",", "");
}

// A message's own line when it is tapped: "Mon 17 Nov, 14:05".
export function formatMessageMoment(timestamp: string, timeZone: string, now = new Date()) {
  return `${formatDayDivider(timestamp, timeZone, now)}, ${formatClock(timestamp, timeZone)}`;
}
