import { describe, expect, it } from "vitest";

import { describeNextSend } from "./weekly-email-settings";

describe("Announce's weekly email line", () => {
  it("says when the next one goes out in plain words, in the schedule's own time zone", () => {
    expect(describeNextSend(new Date("2026-11-26T09:00:00Z"), "UTC")).toBe("Thursday 26 Nov, 09:00 (UTC)");
    expect(describeNextSend(new Date("2026-11-24T13:00:00Z"), "America/New_York")).toBe("Tuesday 24 Nov, 08:00 (America/New York)");
  });
});
