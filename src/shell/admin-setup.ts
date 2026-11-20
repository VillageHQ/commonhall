import type { Database } from "../platform/database/client.ts";
import type { Environment } from "../platform/environment.ts";
import { SETUP_STEP_NAMES, SETUP_STEP_ORDER, SETUP_STEPS, type SetupStepId } from "./admin-setup-steps.ts";
import { describeLaunchSteps, readLaunchFacts, type LaunchStep } from "./console-launch.ts";

export { SETUP_STEP_NAMES, SETUP_STEPS, type SetupStepId };

// The setup progress is the console's launch checklist counted (round 7: one list). The Set up badge is its steps not
// done; the landing sends an admin with steps left to Home, where the checklist is.

export function describeSetupProgress(launchSteps: readonly Pick<LaunchStep, "key" | "isDone">[]) {
  const steps = launchSteps.map(({ key, isDone }) => ({ id: key, isDone }));
  const doneCount = steps.filter(({ isDone }) => isDone).length;
  const currentStepId = steps.find(({ isDone }) => !isDone)?.id ?? null;
  return {
    steps,
    doneCount,
    totalCount: steps.length,
    stepsLeft: steps.length - doneCount,
    currentStepId,
    isComplete: currentStepId === null,
  };
}

export type SetupProgress = ReturnType<typeof describeSetupProgress>;

export function parseSetupStep(value: unknown, stepIds: readonly SetupStepId[] = SETUP_STEP_ORDER): SetupStepId | null {
  return stepIds.find((step) => step === value) ?? null;
}

export async function readSetupProgress(database: Database, environment: Environment = process.env, now = new Date()) {
  return describeSetupProgress(describeLaunchSteps(await readLaunchFacts(database, environment, now)));
}
