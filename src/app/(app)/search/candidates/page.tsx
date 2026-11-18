import { UserSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Note } from "@/components/ui/note";
import { requireMember } from "@/platform/auth/session";
import { readBrandingForPage } from "@/platform/branding/branding";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { modulePage } from "@/platform/modules/module-page";
import { readVillageKeys } from "@/platform/village/settings";
import { WEEKDAYS } from "@/platform/weekly-email/schedule";
import { readWeeklySchedule } from "@/platform/weekly-email/schedule-store";
import { readAvatarUrl } from "@/modules/members/service-profile";
import { introsManifest } from "@/modules/intros/manifest";
import { networkManifest } from "@/modules/network/manifest";
import { SEARCH_PROMPT_PARAM, SEARCH_WHERE } from "@/modules/network/contract";
import { SEARCH_SCOPES } from "@/modules/network/contract-village-settings";
import { SearchScreen } from "@/modules/network/components/search-screen";
import { readIsInVillageGroup, readSharingMemberCount } from "@/modules/network/reads-progress";
import { readVillageSearchSettings } from "@/modules/network/service-settings";
import { FIND_CANDIDATES_JOB_PARAM, readFindCandidatesPage, toFindCandidatesHref, type FindCandidatesPage } from "@/shell/find-candidates";

export const metadata: Metadata = { title: "Find candidates" };

type SearchParams = Record<string, string | string[] | undefined>;

function readFirst(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

function HiringRequest({ page, communityName, digestDay }: { page: FindCandidatesPage; communityName: string; digestDay: string }) {
  if (!page.hiringAskHref) return null;
  return (
    <div className="fh-sheet mt-4" data-slot="hiring-request">
      <h2 className="fh-h3">Or ask {communityName} for candidates</h2>
      <p className="fh-small" style={{ marginTop: 6 }}>
        A hiring request for {page.role ?? "this job"}, with the job’s link. It goes to Asks &amp; updates and into {digestDay}’s digest. You
        read it before it posts.
      </p>
      <div className="fh-btn-row" style={{ marginTop: 12 }}>
        <Button asChild size="sm" variant="secondary">
          <Link href={page.hiringAskHref}>Post a hiring request</Link>
        </Button>
      </div>
    </div>
  );
}

// "Find candidates" from a job on the board: network search for the job's role (and place), the same results with
// faces and intro paths, and a prefilled hiring request. Only the job's company and admins (src/shell/find-candidates.ts).
export default modulePage(networkManifest, async function FindCandidatesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const member = await requireMember();
  const database = getDatabase();
  const params = await searchParams;
  const jobId = readFirst(params[FIND_CANDIDATES_JOB_PARAM]) ?? "";
  const page = await readFindCandidatesPage(database, member, jobId);
  if (!page) notFound();
  // The first visit runs the job's search; a title with no words waits for the founder to type the role.
  if (readFirst(params[SEARCH_PROMPT_PARAM]) === null && page.query) {
    redirect(`${toFindCandidatesHref(page.job.id)}&${new URLSearchParams({ [SEARCH_PROMPT_PARAM]: page.query }).toString()}`);
  }

  const [branding, avatarUrl, sharingCount, isConnected, keys, settings, canAskIntro, schedule] = await Promise.all([
    readBrandingForPage(),
    readAvatarUrl(database, member.id),
    readSharingMemberCount(database),
    readIsInVillageGroup(database, member.id),
    readVillageKeys(database),
    readVillageSearchSettings(database),
    isModuleEnabled(database, introsManifest),
    readWeeklySchedule(database),
  ]);
  const digestDay = WEEKDAYS[schedule.weekday] ?? "Thursday";
  const where = [page.job.company, page.job.location].filter(Boolean).join(" · ");
  return (
    <SearchScreen
      viewer={{ id: member.id, name: member.name, imageUrl: avatarUrl }}
      communityName={branding.name}
      sharingMemberCount={sharingCount}
      isConnected={isConnected}
      isVillageOn={keys !== null}
      defaultScope={settings.searchScope === SEARCH_SCOPES.everyone ? SEARCH_WHERE.global : SEARCH_WHERE.network}
      canAskIntro={canAskIntro}
      canAskCommunity={page.hiringAskHref !== null}
      digestDay={digestDay}
      heading={page.role ? `Find candidates for ${page.role}` : "Find candidates"}
      searchPath={ROUTES.findCandidates}
      keepParams={{ [FIND_CANDIDATES_JOB_PARAM]: page.job.id }}
      intro={
        <>
          {where ? <p className="fh-lede">{where}</p> : null}
          {page.query ? null : (
            <Note icon={UserSearch} className="mt-4" data-slot="type-the-role">
              <b>Type the role you’re hiring for.</b> This job’s title has no words to search for, so nothing was searched yet.
            </Note>
          )}
        </>
      }
      beforeResults={<HiringRequest page={page} communityName={branding.name} digestDay={digestDay} />}
    />
  );
});
