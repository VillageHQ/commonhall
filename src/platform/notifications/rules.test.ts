import { describe, expect, it } from "vitest";

import { DEFAULT_PREFERENCES, NOTIFICATION_KINDS, type AlertPreferences, type NotificationKind, type QuietHours } from "./contract";
import { isInQuietHours, readSkipReason, SKIP_REASONS } from "./rules";

const NIGHTS: QuietHours = { isOn: true, from: "22:00", to: "07:00", days: [0, 1, 2, 3, 4, 5, 6], timeZone: "UTC" };

describe("quiet hours", () => {
  it("read the member's own time zone", () => {
    // 14:30 UTC on a Monday is 23:30 in Tokyo and 10:30 in New York.
    const instant = new Date("2026-11-16T14:30:00Z");
    expect(isInQuietHours({ ...NIGHTS, timeZone: "Asia/Tokyo" }, instant)).toBe(true);
    expect(isInQuietHours({ ...NIGHTS, timeZone: "America/New_York" }, instant)).toBe(false);
  });

  it("give an overnight spell's morning to the day it started", () => {
    const fridayNights = { ...NIGHTS, days: [5], timeZone: "Europe/Berlin" };
    // Berlin is UTC+1 in November.
    expect(isInQuietHours(fridayNights, new Date("2026-11-21T05:00:00Z"))).toBe(true); // Saturday 06:00
    expect(isInQuietHours(fridayNights, new Date("2026-11-20T22:30:00Z"))).toBe(true); // Friday 23:30
    expect(isInQuietHours(fridayNights, new Date("2026-11-20T05:00:00Z"))).toBe(false); // Friday 06:00
    expect(isInQuietHours(fridayNights, new Date("2026-11-21T22:30:00Z"))).toBe(false); // Saturday 23:30
  });

  it("run a same-day spell from its start up to, not including, its end", () => {
    const workday = { ...NIGHTS, from: "09:00", to: "17:00", days: [1, 2, 3, 4, 5] };
    expect(isInQuietHours(workday, new Date("2026-11-16T09:00:00Z"))).toBe(true);
    expect(isInQuietHours(workday, new Date("2026-11-16T17:00:00Z"))).toBe(false);
    expect(isInQuietHours(workday, new Date("2026-11-15T12:00:00Z"))).toBe(false); // Sunday
  });

  it("are quiet only when switched on", () => {
    expect(isInQuietHours({ ...NIGHTS, isOn: false }, new Date("2026-11-16T23:30:00Z"))).toBe(false);
  });
});

describe("who an alert reaches", () => {
  const now = new Date("2026-11-16T12:00:00Z");
  const noMutes = new Set<string>();
  const facts: { kind: NotificationKind; fromUserId: string; mutedUserIds: ReadonlySet<string>; now: Date } = { kind: NOTIFICATION_KINDS.message, fromUserId: "sender", mutedUserIds: noMutes, now };

  function skip(preferences: Partial<AlertPreferences>, overrides: Partial<typeof facts> = {}) {
    return readSkipReason({ ...DEFAULT_PREFERENCES, ...preferences }, { ...facts, ...overrides });
  }

  it("is everyone by default", () => {
    expect(skip({})).toBeNull();
  });

  it("is nobody who turned alerts off, or the kind off", () => {
    expect(skip({ isOn: false })).toBe(SKIP_REASONS.off);
    expect(skip({ offKinds: [NOTIFICATION_KINDS.message] })).toBe(SKIP_REASONS.kindOff);
    expect(skip({ offKinds: [NOTIFICATION_KINDS.intro] })).toBeNull();
  });

  it("drops a muted person's broadcasts but nothing else from them", () => {
    const muted = new Set(["sender"]);
    expect(skip({}, { kind: NOTIFICATION_KINDS.voiceBroadcast, mutedUserIds: muted })).toBe(SKIP_REASONS.muted);
    expect(skip({}, { kind: NOTIFICATION_KINDS.message, mutedUserIds: muted })).toBeNull();
    expect(skip({}, { kind: NOTIFICATION_KINDS.voiceBroadcast, fromUserId: "someone-else", mutedUserIds: muted })).toBeNull();
  });

  it("waits out quiet hours", () => {
    expect(skip({ quietHours: { ...NIGHTS, from: "11:00", to: "13:00" } })).toBe(SKIP_REASONS.quietHours);
  });
});
