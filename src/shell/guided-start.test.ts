import { describe, expect, it } from "vitest";

import { GUIDED_STEPS, readGuidedSteps, resolveGuidedStep, toGuidedStepHref } from "./guided-start.ts";

describe("the guided start's steps", () => {
  it("has four steps, and leaves Connect Village out while the network is off", () => {
    expect(readGuidedSteps(true)).toEqual([GUIDED_STEPS.look, GUIDED_STEPS.village, GUIDED_STEPS.card, GUIDED_STEPS.invite]);
    expect(readGuidedSteps(false)).toEqual([GUIDED_STEPS.look, GUIDED_STEPS.card, GUIDED_STEPS.invite]);
  });

  it("opens the step asked for, else the first, and the last has no next step", () => {
    const steps = readGuidedSteps(false);
    expect(resolveGuidedStep(steps, undefined)).toMatchObject({ step: GUIDED_STEPS.look, number: 1, total: 3, nextHref: toGuidedStepHref(GUIDED_STEPS.card) });
    expect(resolveGuidedStep(steps, GUIDED_STEPS.village)).toMatchObject({ step: GUIDED_STEPS.look });
    expect(resolveGuidedStep(steps, GUIDED_STEPS.invite)).toMatchObject({ step: GUIDED_STEPS.invite, number: 3, nextHref: null });
  });
});
