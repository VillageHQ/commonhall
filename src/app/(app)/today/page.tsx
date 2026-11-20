import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { InstallCard } from "@/components/alerts/install-card";
import { asksManifest } from "@/modules/asks/manifest";
import { readAskFlash } from "@/modules/asks/contract";
import { JOB_BOARD_PAGES } from "@/modules/job-board/contract";
import { jobBoardManifest } from "@/modules/job-board/manifest";
import { LIBRARY_PAGE } from "@/modules/library/contract";
import { libraryManifest } from "@/modules/library/manifest";
import { describeEmailConfirmation } from "@/modules/members/contract-email-confirmation-copy";
import { ONBOARDING_STEPS } from "@/modules/members/contract-profile";
import { LookupQuestionCard } from "@/modules/members/components/lookup-question-card";
import { membersManifest } from "@/modules/members/manifest";
import { readLookupState } from "@/modules/members/service-fill-in";
import { isCardFilledIn, readMemberProfile } from "@/modules/members/service-profile";
import { networkManifest } from "@/modules/network/manifest";
import { readNetworkProgress } from "@/modules/network/reads-progress";
import { PERKS_PAGE } from "@/modules/perks/contract";
import { perksManifest } from "@/modules/perks/manifest";
import { readPerksUrl } from "@/modules/perks/service";
import { readLiveRooms } from "@/modules/voice/reads-live";
import { requireMember } from "@/platform/auth/session";
import { readBrandingForPage } from "@/platform/branding/branding";
import { getDatabase } from "@/platform/database/client";
import { isDemoMode } from "@/platform/demo/mode";
import { isReplyByEmailOn } from "@/platform/email/reply-address";
import { readResendConfig } from "@/platform/email/resend";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";
import { WEEKDAYS } from "@/platform/weekly-email/schedule";
import { readWeeklySchedule } from "@/platform/weekly-email/schedule-store";
import { readEnabledIds } from "@/shell/enabled-modules";
import { selectNextSteps } from "@/shell/next-steps";
import { resolveOnboardingStep } from "@/shell/onboarding";
import { readTodayItems } from "@/shell/today";
import { TodayPage } from "@/shell/today-list";

export const metadata: Metadata = { title: "Today" };

// "Is this right?" asks about lines filled in from public profiles only in a member's first two weeks.
const FACTS_WINDOW_MS = 14 * 24 * 60 * 60 * 1000;

type TodayRouteProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// The Live now card shows one room: the busiest, the newest on a tie (the reads rank every live room that way).
const LIVE_ROOMS_SHOWN = 1;

// Commonhall's Today: the member home. Admins see it as the founder view; their setup lives on the console's Home.
export default modulePage(membersManifest, async function TodayRoute({ searchParams }: TodayRouteProps) {
  const member = await requireMember();
  const database = getDatabase();
  if ((await resolveOnboardingStep(database, member)) !== ONBOARDING_STEPS.done) redirect(ROUTES.welcome);

  const now = new Date();
  const enabledIds = await readEnabledIds(database);
  const isNetworkOn = enabledIds.has(networkManifest.id);
  const [community, networkProgress, profile, today, lookupState, perksUrl, schedule, query, liveRooms] = await Promise.all([
    readBrandingForPage(),
    isNetworkOn ? readNetworkProgress(database, member) : null,
    readMemberProfile(database, member.id),
    readTodayItems(database, member.id, enabledIds, now),
    isNetworkOn ? readLookupState(database, member.id) : null,
    enabledIds.has(perksManifest.id) ? readPerksUrl(database) : null,
    readWeeklySchedule(database),
    searchParams,
    readLiveRooms(database, member.id, LIVE_ROOMS_SHOWN),
  ]);

  const isCardFilled = profile !== null && isCardFilledIn(profile);
  const nextSteps = selectNextSteps({
    setupProgress: null,
    networkProgress,
    communityName: community.isSaved ? community.name : "your community",
    isCardFilled,
    confirmationCopy: describeEmailConfirmation(community.isSaved ? community.name : "your admin", readResendConfig(process.env) !== null),
  });
  const flashKey = Array.isArray(query.m) ? query.m[0] : query.m;
  const isPerksShown = enabledIds.has(perksManifest.id) && (Boolean(perksUrl) || isDemoMode(process.env));
  const moreLinks = [
    enabledIds.has(jobBoardManifest.id) ? { label: "Jobs", href: JOB_BOARD_PAGES.board } : null,
    isPerksShown ? { label: "Perks", href: PERKS_PAGE, isFullLoad: true } : null,
    enabledIds.has(libraryManifest.id) ? { label: "Library", href: LIBRARY_PAGE } : null,
  ].filter((link) => link !== null);

  return (
    <TodayPage
      today={today}
      memberName={member.name}
      dateLabel={now.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
      liveRoom={liveRooms[0] ?? null}
      replyDay={isReplyByEmailOn(process.env) ? (WEEKDAYS[schedule.weekday] ?? "Thursday") : null}
      showFacts={now.getTime() - new Date(member.createdAt).getTime() < FACTS_WINDOW_MS}
      isAsksOn={enabledIds.has(asksManifest.id)}
      nextSteps={nextSteps}
      installCard={<InstallCard communityName={community.name} alertsHref={ROUTES.alerts} />}
      // Filling in from public profiles is offered only while the member's card is still empty (round 7).
      lookupQuestion={lookupState?.needsAnswer && !isCardFilled ? <LookupQuestionCard communityName={community.name} /> : null}
      flash={readAskFlash(flashKey)}
      moreLinks={moreLinks}
      now={now}
    />
  );
});
