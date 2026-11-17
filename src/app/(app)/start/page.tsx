import { redirect } from "next/navigation";

import { getDatabase } from "@/platform/database/client";
import { readSetupProgress } from "@/shell/admin-setup";
import { isGuidedStartPending } from "@/shell/guided-start";
import { readLandingPath } from "@/shell/landing";
import { resolveOnboardingStep } from "@/shell/onboarding";
import { ONBOARDING_STEPS } from "@/modules/members/contract-profile";
import { requireMember } from "@/platform/auth/session";
import { isAdminMember } from "@/platform/auth/roles";
import { membersManifest } from "@/modules/members/manifest";
import { modulePage } from "@/platform/modules/module-page";

export default modulePage(membersManifest, async function LandingPage() {
  const member = await requireMember();
  const database = getDatabase();
  const isOnboardingDone = (await resolveOnboardingStep(database, member)) === ONBOARDING_STEPS.done;
  const isAdmin = isAdminMember(member);
  const isAdminLanding = isOnboardingDone && isAdmin;
  const [isPending, isSetupComplete] = isAdminLanding
    ? await Promise.all([isGuidedStartPending(database), readSetupProgress(database).then(({ isComplete }) => isComplete)])
    : [false, false];
  redirect(readLandingPath({ isOnboardingDone, isAdmin, isGuidedStartPending: isPending, isSetupComplete }));
});
