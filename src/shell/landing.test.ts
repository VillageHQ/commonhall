import { describe, expect, it } from "vitest";

import { ROUTES } from "../platform/http/routes.ts";
import { readLandingPath } from "./landing.ts";

const facts = { isOnboardingDone: true, isAdmin: true, isGuidedStartPending: false, isSetupComplete: false };

describe("readLandingPath", () => {
  it("sends unfinished welcome steps to the welcome page first, admin or not", () => {
    expect(readLandingPath({ ...facts, isOnboardingDone: false })).toBe(ROUTES.welcome);
    expect(readLandingPath({ ...facts, isOnboardingDone: false, isAdmin: false, isSetupComplete: true })).toBe(ROUTES.welcome);
  });

  it("sends a new admin to the guided start until it is finished or skipped", () => {
    expect(readLandingPath({ ...facts, isGuidedStartPending: true })).toBe(ROUTES.adminStart);
    expect(readLandingPath({ ...facts, isGuidedStartPending: true, isAdmin: false })).toBe(ROUTES.feed);
  });

  it("then sends an admin to the console's Home, with its checklist, while setup is unfinished", () => {
    expect(readLandingPath(facts)).toBe(ROUTES.admin);
  });

  it("sends an admin whose setup is done, and every member, to the feed", () => {
    expect(readLandingPath({ ...facts, isSetupComplete: true })).toBe(ROUTES.feed);
    expect(readLandingPath({ ...facts, isAdmin: false })).toBe(ROUTES.feed);
  });
});
