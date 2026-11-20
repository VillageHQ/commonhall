import { describe, expect, it } from "vitest";

import { DEFAULT_PREFERENCES, NOTIFICATION_KINDS, preferencesBodySchema, QUIET_TIME_PRESETS, type NotificationKind, type QuietTime } from "./contract";
import { isInQuietTime, readLocalMoment, readNextLocalMoment, readQuietUntil, readSkipReason, SKIP_REASONS, type AlertState } from "./rules";

const NIGHTS: QuietTime = { from: "22:00", to: "07:00", allDay: false, days: [0, 1, 2, 3, 4, 5, 6] };
const PRESETS: QuietTime[] = QUIET_TIME_PRESETS.map(({ quietTime }) => ({ ...quietTime, days: [...quietTime.days] }));
const [WORKING_HOURS, EVENINGS, WEEKENDS] = [PRESETS[0]!, PRESETS[1]!, PRESETS[2]!];

describe("quiet times", () => {
  it("read the member's own time zone", () => {
    // 14:30 UTC on a Monday is 23:30 in Tokyo and 09:30 in New York.
    const instant = new Date("2026-11-16T14:30:00Z");
    expect(isInQuietTime([NIGHTS], "Asia/Tokyo", instant)).toBe(true);
    expect(isInQuietTime([NIGHTS], "America/New_York", instant)).toBe(false);
  });

  it("give an overnight time's morning to the day it started", () => {
    const fridayNights = [{ ...NIGHTS, days: [5] }];
    // Berlin is UTC+1 in November.
    expect(isInQuietTime(fridayNights, "Europe/Berlin", new Date("2026-11-21T05:00:00Z"))).toBe(true); // Saturday 06:00
    expect(isInQuietTime(fridayNights, "Europe/Berlin", new Date("2026-11-20T22:30:00Z"))).toBe(true); // Friday 23:30
    expect(isInQuietTime(fridayNights, "Europe/Berlin", new Date("2026-11-20T05:00:00Z"))).toBe(false); // Friday 06:00
    expect(isInQuietTime(fridayNights, "Europe/Berlin", new Date("2026-11-21T22:30:00Z"))).toBe(false); // Saturday 23:30
  });

  it("run a same-day time from its start up to, not including, its end", () => {
    expect(isInQuietTime([WORKING_HOURS], "UTC", new Date("2026-11-16T09:00:00Z"))).toBe(true);
    expect(isInQuietTime([WORKING_HOURS], "UTC", new Date("2026-11-16T18:00:00Z"))).toBe(false);
    expect(isInQuietTime([WORKING_HOURS], "UTC", new Date("2026-11-15T12:00:00Z"))).toBe(false); // Sunday
  });

  it("cover all of Saturday and Sunday for Weekends, and nothing else", () => {
    expect(isInQuietTime([WEEKENDS], "Europe/Berlin", new Date("2026-11-20T23:00:00Z"))).toBe(true); // Saturday 00:00
    expect(isInQuietTime([WEEKENDS], "Europe/Berlin", new Date("2026-11-22T22:59:00Z"))).toBe(true); // Sunday 23:59
    expect(isInQuietTime([WEEKENDS], "Europe/Berlin", new Date("2026-11-22T23:00:00Z"))).toBe(false); // Monday 00:00
    expect(isInQuietTime([WEEKENDS], "Europe/Berlin", new Date("2026-11-20T22:59:00Z"))).toBe(false); // Friday 23:59
  });

  it("are quiet when any of several covers now", () => {
    const both = [WORKING_HOURS, EVENINGS];
    expect(isInQuietTime(both, "UTC", new Date("2026-11-16T10:00:00Z"))).toBe(true); // Monday, work
    expect(isInQuietTime(both, "UTC", new Date("2026-11-16T21:00:00Z"))).toBe(true); // Monday evening
    expect(isInQuietTime(both, "UTC", new Date("2026-11-16T18:30:00Z"))).toBe(false); // between them
    expect(isInQuietTime([], "UTC", new Date("2026-11-16T10:00:00Z"))).toBe(false);
  });

  it("end where the last joined quiet time ends", () => {
    expect(readQuietUntil([WORKING_HOURS], "Europe/Berlin", new Date("2026-11-16T10:12:30Z"))?.toISOString()).toBe("2026-11-16T17:00:00.000Z"); // 18:00 Berlin
    // Friday evening runs into the weekend, which runs to Monday 08:00 (Sunday's evening ends then).
    expect(readQuietUntil([EVENINGS, WEEKENDS], "UTC", new Date("2026-11-20T20:00:00Z"))?.toISOString()).toBe("2026-11-23T08:00:00.000Z");
    expect(readQuietUntil([WORKING_HOURS], "UTC", new Date("2026-11-16T19:00:00Z"))).toBeNull();
  });

  it("allow three, refuse a fourth, and refuse an empty or zero-length time unless it is all day", () => {
    const body = (quietTimes: QuietTime[]) => preferencesBodySchema.safeParse({ ...DEFAULT_PREFERENCES, quietTimes });
    expect(body([WORKING_HOURS, EVENINGS, WEEKENDS]).success).toBe(true);
    const fourth = body([WORKING_HOURS, EVENINGS, WEEKENDS, NIGHTS]);
    expect(fourth.success).toBe(false);
    expect(fourth.error?.issues[0]?.message).toBe("Up to 3 quiet times. Remove one first.");
    expect(body([{ ...NIGHTS, to: "22:00" }]).success).toBe(false);
    expect(body([{ ...NIGHTS, days: [] }]).success).toBe(false);
    expect(body([{ ...NIGHTS, to: "22:00", allDay: true }]).success).toBe(true);
  });
});

describe("a pause", () => {
  it("until tomorrow ends at 08:00 on the member's clock", () => {
    // Monday 23:30 in Tokyo is 14:30 UTC; Tuesday 08:00 there is 23:00 UTC on Monday.
    expect(readLocalMoment(new Date("2026-11-16T14:30:00Z"), "Asia/Tokyo", 1, "08:00").toISOString()).toBe("2026-11-16T23:00:00.000Z");
    // Across New York's change to summer time (8 March 2026): Sunday 08:00 is UTC-4.
    expect(readLocalMoment(new Date("2026-03-07T20:00:00Z"), "America/New_York", 1, "08:00").toISOString()).toBe("2026-03-08T12:00:00.000Z");
  });

  it("until tomorrow, asked before 08:00, ends at 08:00 that same morning", () => {
    // 02:00 in Berlin (01:00 UTC): the next 08:00 is 07:00 UTC the same day, not the next day's.
    expect(readNextLocalMoment(new Date("2026-11-17T01:00:00Z"), "Europe/Berlin", "08:00").toISOString()).toBe("2026-11-17T07:00:00.000Z");
    // At 08:00 sharp and after, it is the next day's.
    expect(readNextLocalMoment(new Date("2026-11-17T07:00:00Z"), "Europe/Berlin", "08:00").toISOString()).toBe("2026-11-18T07:00:00.000Z");
  });
});

describe("who an alert reaches", () => {
  const now = new Date("2026-11-16T12:00:00Z"); // Monday noon, UTC
  const noMutes = new Set<string>();
  const facts: { kind: NotificationKind; fromUserId: string; mutedUserIds: ReadonlySet<string>; now: Date } = { kind: NOTIFICATION_KINDS.message, fromUserId: "sender", mutedUserIds: noMutes, now };

  function skip(state: Partial<AlertState>, overrides: Partial<typeof facts> = {}) {
    return readSkipReason({ ...DEFAULT_PREFERENCES, pausedUntil: null, ...state }, { ...facts, ...overrides });
  }

  it("is everyone by default", () => {
    expect(skip({})).toBeNull();
  });

  it("is nobody who turned alerts off, or the kind off", () => {
    expect(skip({ isOn: false })).toBe(SKIP_REASONS.off);
    expect(skip({ offKinds: [NOTIFICATION_KINDS.message] })).toBe(SKIP_REASONS.kindOff);
    expect(skip({ offKinds: [NOTIFICATION_KINDS.intro] })).toBeNull();
  });

  it("drops a muted person's room alerts but nothing else from them", () => {
    const muted = new Set(["sender"]);
    expect(skip({}, { kind: NOTIFICATION_KINDS.voiceBroadcast, mutedUserIds: muted })).toBe(SKIP_REASONS.muted);
    expect(skip({}, { kind: NOTIFICATION_KINDS.message, mutedUserIds: muted })).toBeNull();
    expect(skip({}, { kind: NOTIFICATION_KINDS.voiceBroadcast, fromUserId: "someone-else", mutedUserIds: muted })).toBeNull();
  });

  it("holds back portfolio alerts in quiet times and lets direct ones through while Let through is on", () => {
    const working = { quietTimes: [WORKING_HOURS], letDirectThrough: true };
    expect(skip(working, { kind: NOTIFICATION_KINDS.voiceRoom })).toBe(SKIP_REASONS.quietHours);
    expect(skip(working, { kind: NOTIFICATION_KINDS.voiceBroadcast })).toBe(SKIP_REASONS.quietHours);
    expect(skip(working, { kind: NOTIFICATION_KINDS.library })).toBe(SKIP_REASONS.quietHours);
    expect(skip(working, { kind: NOTIFICATION_KINDS.intro })).toBeNull();
    expect(skip(working, { kind: NOTIFICATION_KINDS.message })).toBeNull();
    expect(skip(working, { kind: NOTIFICATION_KINDS.answer })).toBeNull();
  });

  it("holds back direct alerts too in quiet times when Let through is off, as it is for a new member", () => {
    expect(DEFAULT_PREFERENCES.letDirectThrough).toBe(false);
    expect(skip({ quietTimes: [WORKING_HOURS] }, { kind: NOTIFICATION_KINDS.message })).toBe(SKIP_REASONS.quietHours);
    expect(skip({ quietTimes: [WORKING_HOURS], letDirectThrough: false }, { kind: NOTIFICATION_KINDS.intro })).toBe(SKIP_REASONS.quietHours);
    expect(skip({ quietTimes: [WORKING_HOURS], letDirectThrough: false, timeZone: "Asia/Tokyo" }, { kind: NOTIFICATION_KINDS.intro })).toBeNull(); // 21:00 there
  });

  it("holds back every kind while paused, and nothing once the pause is over", () => {
    const pausedUntil = new Date(now.getTime() + 60 * 60_000);
    for (const kind of [NOTIFICATION_KINDS.intro, NOTIFICATION_KINDS.message, NOTIFICATION_KINDS.voiceRoom]) expect(skip({ pausedUntil }, { kind })).toBe(SKIP_REASONS.paused);
    expect(skip({ pausedUntil }, { kind: NOTIFICATION_KINDS.intro, now: new Date(pausedUntil.getTime() + 1) })).toBeNull();
  });
});
