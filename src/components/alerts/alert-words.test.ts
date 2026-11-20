import { describe, expect, it } from "vitest";

import { describeDays, describeUntil } from "./alert-words";

describe("the words for quiet times", () => {
  it("read days Monday first, with runs of three or more joined", () => {
    expect(describeDays([1, 2, 3, 4, 5])).toBe("Mon–Fri");
    expect(describeDays([0, 6])).toBe("Sat, Sun");
    expect(describeDays([0, 1, 2, 3, 4, 5, 6])).toBe("Every day");
    expect(describeDays([1, 3, 5, 6, 0])).toBe("Mon, Wed, Fri–Sun");
  });

  it("say until when on the member's clock", () => {
    const now = new Date("2026-11-16T10:00:00Z");
    expect(describeUntil(new Date("2026-11-16T13:30:00Z"), "Europe/Berlin", now)).toBe("14:30");
    expect(describeUntil(new Date("2026-11-17T07:00:00Z"), "Europe/Berlin", now)).toBe("tomorrow 08:00");
    expect(describeUntil(new Date("2026-11-23T07:00:00Z"), "Europe/Berlin", now)).toBe("Mon 08:00");
  });
});
