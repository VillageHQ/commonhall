import { describe, expect, it } from "vitest";

import { GUIDED_STEP_ORDER, GUIDED_STEPS, resolveGuidedStep, toGuidedStepHref } from "./guided-start.ts";

describe("the guided start's steps", () => {
  it("is the invites, then the admin's card: no Village step", () => {
    expect(GUIDED_STEP_ORDER).toEqual([GUIDED_STEPS.invite, GUIDED_STEPS.card]);
  });

  it("opens the step asked for, else the first, and the last has no next step", () => {
    expect(resolveGuidedStep(GUIDED_STEP_ORDER, undefined)).toMatchObject({ step: GUIDED_STEPS.invite, number: 1, total: 2, nextHref: toGuidedStepHref(GUIDED_STEPS.card) });
    expect(resolveGuidedStep(GUIDED_STEP_ORDER, "village")).toMatchObject({ step: GUIDED_STEPS.invite });
    expect(resolveGuidedStep(GUIDED_STEP_ORDER, GUIDED_STEPS.card)).toMatchObject({ step: GUIDED_STEPS.card, number: 2, nextHref: null });
  });
});
