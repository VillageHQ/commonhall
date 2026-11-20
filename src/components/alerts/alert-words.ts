import { ALL_DAYS, DAY_LABELS, type QuietTime } from "@/platform/notifications/contract";

// The words the Alerts page and the bell on Rooms share: a quiet time in one line, and "until when".

const MS_PER_DAY = 86_400_000;

// [1,2,3,4,5] → "Mon–Fri", [0,6] → "Sat, Sun", every day → "Every day". Runs of three or more join with a dash, and
// the week reads Monday first.
export function describeDays(days: readonly number[]) {
  const chosen = new Set(days);
  if (chosen.size === ALL_DAYS.length) return "Every day";
  const weekOrder = [1, 2, 3, 4, 5, 6, 0].filter((day) => chosen.has(day));
  const runs: number[][] = [];
  for (const day of weekOrder) {
    const run = runs.at(-1);
    const previous = run?.at(-1);
    if (run && previous !== undefined && (previous + 1) % 7 === day && day !== 1) run.push(day);
    else runs.push([day]);
  }
  return runs
    .flatMap((run) => (run.length >= 3 ? [`${DAY_LABELS[run[0]!]}–${DAY_LABELS[run.at(-1)!]}`] : run.map((day) => DAY_LABELS[day])))
    .join(", ");
}

export function describeQuietTime(quiet: QuietTime) {
  return `${describeDays(quiet.days)} · ${quiet.allDay ? "all day" : `${quiet.from}–${quiet.to}`}`;
}

function localDay(date: Date, timeZone: string) {
  return Date.parse(`${date.toLocaleDateString("en-CA", { timeZone })}T00:00:00Z`);
}

// "14:30" today, "tomorrow 08:00", else "Mon 00:00", on the member's clock.
export function describeUntil(until: Date, timeZone: string, now: Date) {
  const clock = until.toLocaleTimeString("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const daysAhead = Math.round((localDay(until, timeZone) - localDay(now, timeZone)) / MS_PER_DAY);
  if (daysAhead <= 0) return clock;
  if (daysAhead === 1) return `tomorrow ${clock}`;
  return `${until.toLocaleDateString("en-GB", { timeZone, weekday: "short" })} ${clock}`;
}

export function describeTimeZone(timeZone: string) {
  return timeZone.replaceAll("_", " ");
}
