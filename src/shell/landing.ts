import { ROUTES } from "../platform/http/routes.ts";

type LandingFacts = { isOnboardingDone: boolean; isAdmin: boolean; isGuidedStartPending: boolean; isSetupComplete: boolean };

// Where `/start` (every sign-in's landing) sends someone: the welcome steps first; a brand-new admin to the guided
// start until it is finished or skipped, then to the console's Home (its checklist) until setup is done; everyone
// else to the feed.
export function readLandingPath({ isOnboardingDone, isAdmin, isGuidedStartPending, isSetupComplete }: LandingFacts): string {
  if (!isOnboardingDone) return ROUTES.welcome;
  if (isAdmin && isGuidedStartPending) return ROUTES.adminStart;
  if (isAdmin && !isSetupComplete) return ROUTES.admin;
  return ROUTES.feed;
}
