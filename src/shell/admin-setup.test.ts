import { describe, expect, it } from "vitest";

import { describeSetupProgress, parseSetupStep, SETUP_STEPS } from "./admin-setup";

const ORDER = [SETUP_STEPS.name, SETUP_STEPS.invite, SETUP_STEPS.card, SETUP_STEPS.mail];

function steps(...done: string[]) {
  return ORDER.map((key) => ({ key, isDone: done.includes(key) }));
}

describe("setup progress (the one checklist, counted)", () => {
  it("is the name, the invites, the admin's card and mail: Village and the report aren't setup steps", () => {
    const progress = describeSetupProgress(steps());

    expect(progress.steps.map(({ id }) => id)).toEqual(ORDER);
    expect(progress.currentStepId).toBe(SETUP_STEPS.name);
    expect(progress.stepsLeft).toBe(4);
  });

  it("moves to the first unfinished step", () => {
    const progress = describeSetupProgress(steps(SETUP_STEPS.name));

    expect(progress.currentStepId).toBe(SETUP_STEPS.invite);
    expect(progress.doneCount).toBe(1);
  });

  it("completes once every step is done", () => {
    const progress = describeSetupProgress(steps(...ORDER));

    expect(progress.currentStepId).toBeNull();
    expect(progress.stepsLeft).toBe(0);
    expect(progress.isComplete).toBe(true);
  });

  it("ignores an unknown step in the URL", () => {
    expect(parseSetupStep("<script>")).toBeNull();
    expect(parseSetupStep("keys")).toBeNull();
    expect(parseSetupStep(SETUP_STEPS.card)).toBe(SETUP_STEPS.card);
  });
});
