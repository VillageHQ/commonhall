import { GUIDED_START_DONE, GUIDED_START_PENDING } from "../platform/auth/first-admin.ts";
import type { DatabaseOrTransaction } from "../platform/database/client.ts";
import { ROUTES } from "../platform/http/routes.ts";
import { readSettings, saveSettings } from "../platform/settings/store.ts";
import { INSTANCE_SETTING_KEYS } from "../platform/settings/schema.ts";

// The guided start (/admin/start): a new admin's first steps, one screen each. /setup already named the community, so
// it is the invites first (a copyable link on the first screen after /setup), then the admin's own card. Village is
// not a step (round 7): it is an optional row on Set up. Finishing or skipping the last step, or "Skip the guided
// start", marks it done; until then the admin's sign-in lands here (src/shell/landing.ts).

export const GUIDED_STEPS = { invite: "invite", card: "card" } as const;

export type GuidedStepKey = (typeof GUIDED_STEPS)[keyof typeof GUIDED_STEPS];

export const GUIDED_STEP_TITLES: Record<GuidedStepKey, string> = {
  invite: "Invite founders",
  card: "Your card",
};

export const GUIDED_STEP_PARAM = "step";

export const GUIDED_STEP_ORDER: readonly GuidedStepKey[] = [GUIDED_STEPS.invite, GUIDED_STEPS.card];

export function toGuidedStepHref(step: GuidedStepKey) {
  return `${ROUTES.adminStart}?${GUIDED_STEP_PARAM}=${step}`;
}

// The step to show: the one asked for when it is on the list, else the first.
export function resolveGuidedStep(steps: readonly GuidedStepKey[], asked: unknown) {
  const index = Math.max(0, steps.findIndex((step) => step === asked));
  const step = steps[index]!;
  const next = steps[index + 1] ?? null;
  return { step, number: index + 1, total: steps.length, nextHref: next ? toGuidedStepHref(next) : null, previousHref: index > 0 ? toGuidedStepHref(steps[index - 1]!) : null };
}

export async function isGuidedStartPending(database: DatabaseOrTransaction) {
  const settings = await readSettings(database, [INSTANCE_SETTING_KEYS.guidedStart]);
  return settings.get(INSTANCE_SETTING_KEYS.guidedStart) === GUIDED_START_PENDING;
}

export async function finishGuidedStart(database: DatabaseOrTransaction) {
  await saveSettings(database, { [INSTANCE_SETTING_KEYS.guidedStart]: GUIDED_START_DONE });
}
