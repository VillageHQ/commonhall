"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { AlertSettingsForm } from "@/components/alerts/alert-settings-form";
import { DeviceAlertsCard } from "@/components/alerts/device-alerts-card";
import { MutedPeople } from "@/components/alerts/muted-people";
import { PauseCard } from "@/components/alerts/pause-card";
import { BackLink, PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { LibraryBrowse } from "@/modules/library/components/library-browse";
import { LibraryLeaderboard } from "@/modules/library/components/library-leaderboard";
import { LIBRARY_BOARD_PERIODS, LIBRARY_PAGES } from "@/modules/library/contract";
import { LiveRoom } from "@/modules/voice/components/live-room";
import { RoomsBoard } from "@/modules/voice/components/rooms-board";
import { VOICE_PAGE } from "@/modules/voice/contract";
import { VOICE_QUERY_KEYS } from "@/modules/voice/queries";
import { ROUTES } from "@/platform/http/routes";
import { ANNOUNCEMENT_AUDIENCES } from "@/modules/admin/contract-announcements";
import { AnnouncementComposer } from "@/modules/admin/components/announcement-composer";
import type { SentAnnouncement } from "@/modules/admin/reads-announcements";
import { CompanyFilter, JobList } from "@/modules/job-board/components/job-list";
import { describeMemberBoard, HIRING_LINE, readCompaniesWithJobs } from "@/modules/job-board/copy";
import { formatDayMonthTimeUtc } from "@/platform/text/format-date";
import { AsksBoard } from "@/modules/asks/components/asks-board";
import { directoryQuery } from "@/modules/members/queries-directory";
import { parseDirectoryFilters } from "@/modules/members/rules-directory-url";
import { SearchScreen } from "@/modules/network/components/search-screen";
import { networkSearchQuery } from "@/modules/network/queries";
import { AppShell } from "@/shell/app-shell";
import { PeopleScreen } from "@/shell/people-screen";
import { AdminHomeView } from "@/shell/admin-home-view";
import { OneStepAskForm } from "@/shell/intro-ask-forms";
import { buildShellNavigation } from "@/shell/navigation";

import {
  ADMIN,
  ALERT_KINDS,
  ALERT_MEMBERS,
  ALERT_MUTED,
  ANNOUNCEMENT_COHORTS,
  ANNOUNCEMENT_MEMBERS,
  ASK_ALLOWANCE,
  ASK_COUNTS,
  ASK_POSTS,
  BOARD_COMPANIES,
  BOARD_JOBS,
  CANDIDATE_JOB,
  CANDIDATE_QUERY,
  CANDIDATE_RESULT,
  CANDIDATE_ROLE,
  COMMUNITY_NAME,
  CONSOLE_THIS_WEEK, CONSOLE_HOME_ITEMS,
  DIRECTORY_SECTOR,
  FOUNDER,
  FOUNDER_VIEWER,
  HIRING_ASK_HREF,
  INTRO_CONNECTOR,
  INTRO_TARGET,
  LIBRARY_BOARD,
  LIBRARY_ITEMS,
  readAlertPreferences,
  readDirectory,
  ROOM_HREF,
  ROOM_ID,
  ROOM_HOST_NAME,
  ROOM_TITLE,
  ROOM_VIEWER_ID,
  ROOM_ALERTS,
  ROOMS_PAGE,
  SEARCH_QUERY,
  SEARCH_RESULT,
  SEARCH_RESULTS_HREF,
  SENT_ANNOUNCEMENTS,
  SHARING_MEMBER_COUNT,
  toCandidatesHref,
  toShellMember,
} from "./data";

// The app's own screens, put together the way the app's pages do (src/app/(app)/…/page.tsx), on made-up data. The
// pages themselves read the database on a server, so each one here is its page's few lines of layout around the same
// client components.

const NAVIGATION = { member: buildShellNavigation(undefined, false), admin: buildShellNavigation(undefined, true) };

export function createTourQueryClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity, gcTime: Infinity, refetchOnWindowFocus: false, refetchOnMount: false } } });
  seedTourData(client);
  return client;
}

// Every answer the screens ask for is in the cache before they ask; the tour's requests never leave the page.
export function seedTourData(client: QueryClient) {
  client.setQueryData(networkSearchQuery(SEARCH_QUERY, "network").queryKey, SEARCH_RESULT);
  client.setQueryData(networkSearchQuery(CANDIDATE_QUERY, "network").queryKey, CANDIDATE_RESULT);
  for (const sector of ["", DIRECTORY_SECTOR]) {
    client.setQueryData(directoryQuery(parseDirectoryFilters(sector ? { sector } : {})).queryKey, readDirectory(sector));
  }
  // "Search their networks" keeps the words in the box: no member's profile matches them.
  client.setQueryData(directoryQuery(parseDirectoryFilters({ q: SEARCH_QUERY })).queryKey, { ...readDirectory(""), members: [], matchCount: 0 });
  client.setQueryData(directoryQuery(parseDirectoryFilters({ view: "experts" })).queryKey, readDirectory("", true));
  client.setQueryData(VOICE_QUERY_KEYS.rooms, ROOMS_PAGE);
}

// src/app/(app)/library/page.tsx
function LibraryPage() {
  return (
    <LibraryBrowse
      communityName={COMMUNITY_NAME}
      items={LIBRARY_ITEMS}
      filters={{ kind: null, job: null, search: null, mine: false }}
      askHref={null}
      flash={null}
    />
  );
}

// src/app/(app)/library/leaderboard/page.tsx
function LibraryLeaderboardPage() {
  return <LibraryLeaderboard board={LIBRARY_BOARD} period={LIBRARY_BOARD_PERIODS.month} peopleHref={ROUTES.people} />;
}

// src/app/(app)/rooms/page.tsx
function RoomsPage() {
  return <RoomsBoard initial={ROOMS_PAGE} viewerId={ROOM_VIEWER_ID} alerts={ROOM_ALERTS} />;
}

// src/app/(app)/rooms/[roomId]/page.tsx, for the live room (the app's LiveKit is the tour's stand-in).
function RoomPage() {
  return (
    <div className="vr-page" data-pushed-screen data-own-header>
      <LiveRoom roomId={ROOM_ID} title={ROOM_TITLE} hostName={ROOM_HOST_NAME} isHost={false} />
    </div>
  );
}

// src/app/(app)/me/alerts/page.tsx. `?quiet=1`: Working hours added (the step's end state).
function AlertsPage() {
  const isQuietOn = useSearchParams().get("quiet") === "1";
  return (
    <>
      <BackLink href={ROUTES.editCard}>My profile</BackLink>
      <header data-slot="page-header" className="fh-pagehead">
        <h1 className="fh-h1">Alerts</h1>
      </header>
      <div className="grid max-w-[720px] gap-4">
        <DeviceAlertsCard vapidPublicKey="" isPaused={false} />
        <PauseCard pausedUntil={null} timeZone="America/New_York" isSaved />
        <AlertSettingsForm key={String(isQuietOn)} preferences={readAlertPreferences(isQuietOn)} kinds={ALERT_KINDS} isSaved />
        <MutedPeople muted={ALERT_MUTED} members={ALERT_MEMBERS} />
      </div>
    </>
  );
}

// src/app/(app)/people/page.tsx: the member search, and "Search their networks" for a member who connected theirs.
function PeoplePage() {
  return (
    <>
      <header data-slot="page-header" className="fh-pagehead">
        <h1 className="fh-h1">People</h1>
      </header>
      <PeopleScreen
        network={{
          state: "ready",
          search: {
            viewer: FOUNDER_VIEWER,
            communityName: COMMUNITY_NAME,
            sharingMemberCount: SHARING_MEMBER_COUNT,
            isConnected: true,
            isVillageOn: true,
            defaultScope: "network",
            canAskIntro: true,
            canAskCommunity: true,
            digestDay: "Thursday",
          },
        }}
      />
    </>
  );
}

// src/app/(app)/search/ask/page.tsx
function SearchAskPage() {
  const connectorFirst = INTRO_CONNECTOR.name.split(" ")[0] ?? INTRO_CONNECTOR.name;
  const targetFirst = INTRO_TARGET.name.split(" ")[0] ?? INTRO_TARGET.name;
  return (
    <>
      <BackLink href={SEARCH_RESULTS_HREF}>Back to results</BackLink>
      <div className="fh-narrow">
        <h1 className="fh-h1 mt-3.5">
          Ask {connectorFirst} to introduce you to {INTRO_TARGET.name}
        </h1>
        <p className="fh-lede">
          {INTRO_CONNECTOR.name} knows {targetFirst} ({INTRO_TARGET.title}, {INTRO_TARGET.company}). {connectorFirst} sees your note first and says yes or no. {targetFirst} only hears about it if{" "}
          {connectorFirst} says yes.
        </p>
        <OneStepAskForm connectorName={INTRO_CONNECTOR.name} connectorSlug={`${INTRO_CONNECTOR.key.replace(".", "-")}-northwind-demo`} targetSlug={INTRO_TARGET.slug} draftNote="" cap={5} communityName={COMMUNITY_NAME} blockedReason={null} />
      </div>
    </>
  );
}

// Sam Lee writes the ask.
const ASKS_MEMBER = { id: FOUNDER_VIEWER.id, name: FOUNDER_VIEWER.name, image: FOUNDER_VIEWER.imageUrl };

function AsksPage() {
  return <AsksBoard member={ASKS_MEMBER} tab="open" search={null} posts={ASK_POSTS} counts={ASK_COUNTS} allowance={ASK_ALLOWANCE} flash={null} draft={null} />;
}

// src/app/(app)/jobs/page.tsx: Sam Lee sees "Find candidates" on Tallyhealth's jobs.
function JobsPage() {
  return (
    <>
      <header className="fh-pagehead">
        <h1 className="fh-h1">Jobs at member companies</h1>
        <p className="fh-lede">{describeMemberBoard({ total: BOARD_JOBS.length, companies: BOARD_COMPANIES, current: null, communityName: COMMUNITY_NAME })}</p>
        <p className="fh-small mt-2">
          {HIRING_LINE.before}
          <Link href="/me">{HIRING_LINE.link}</Link>
          {HIRING_LINE.after}
        </p>
      </header>
      <CompanyFilter basePath="/jobs" companies={readCompaniesWithJobs(BOARD_COMPANIES)} selected={null} />
      <JobList
        jobs={BOARD_JOBS}
        memberHref={(memberId) => `/people/${memberId}`}
        findCandidatesHref={(job) => (job.memberId === FOUNDER_VIEWER.id ? toCandidatesHref(job.id) : null)}
      />
    </>
  );
}

// src/app/(app)/search/candidates/page.tsx
function CandidatesPage() {
  return (
    <SearchScreen
      viewer={FOUNDER_VIEWER}
      communityName={COMMUNITY_NAME}
      sharingMemberCount={SHARING_MEMBER_COUNT}
      isConnected
      isVillageOn
      defaultScope="network"
      canAskIntro
      canAskCommunity={false}
      digestDay="Thursday"
      heading={CANDIDATE_ROLE ? `Find candidates for ${CANDIDATE_ROLE}` : "Find candidates"}
      searchPath="/search/candidates"
      keepParams={{ job: CANDIDATE_JOB.id }}
      intro={<p className="fh-lede">{[CANDIDATE_JOB.company, CANDIDATE_JOB.location].filter(Boolean).join(" · ")}</p>}
      beforeResults={
        <div className="fh-sheet mt-4" data-slot="hiring-request">
          <h2 className="fh-h3">Or ask {COMMUNITY_NAME} for candidates</h2>
          <p className="fh-small mt-1.5">
            A hiring request for {CANDIDATE_ROLE ?? "this job"}, with the job’s link. It goes to Asks &amp; updates and into Thursday’s digest. You read it before it posts.
          </p>
          <div className="fh-btn-row mt-3">
            <Button asChild size="sm" variant="secondary">
              <Link href={HIRING_ASK_HREF}>Post a hiring request</Link>
            </Button>
          </div>
        </div>
      }
    />
  );
}

// src/app/(app)/admin/announcements/page.tsx
const SENT_AUDIENCE_LABELS: Record<string, string> = {
  [ANNOUNCEMENT_AUDIENCES.everyone]: "Everyone",
  [ANNOUNCEMENT_AUDIENCES.founders]: "Founders",
  [ANNOUNCEMENT_AUDIENCES.experts]: "Mentors and experts",
};

function describeAudience({ audience, cohort }: SentAnnouncement) {
  return audience === ANNOUNCEMENT_AUDIENCES.cohort ? `Cohort: ${cohort}` : (SENT_AUDIENCE_LABELS[audience] ?? "Everyone");
}

function AnnouncementsPage() {
  return (
    <>
      <PageHeader title="Announce" />
      <AnnouncementComposer members={ANNOUNCEMENT_MEMBERS} cohorts={ANNOUNCEMENT_COHORTS} community={COMMUNITY_NAME} adminId={ANNOUNCEMENT_MEMBERS[0]!.id} isEmailOn isFeedOn />
      <section className="mt-8" aria-labelledby="sent-heading">
        <h2 id="sent-heading" className="fh-h2 mb-3">
          Sent
        </h2>
        <table className="fh-tbl">
          <thead>
            <tr>
              <th scope="col">Subject</th>
              <th scope="col">Audience</th>
              <th scope="col">Sent</th>
              <th scope="col" className="fh-n">
                Emails
              </th>
            </tr>
          </thead>
          <tbody>
            {SENT_ANNOUNCEMENTS.map((row) => (
              <tr key={row.id}>
                <td>
                  <span className="fh-serif">{row.subject}</span>
                  {row.isPosted ? <span className="fh-muted"> · pinned in the feed</span> : null}
                </td>
                <td>{describeAudience(row)}</td>
                <td>
                  {formatDayMonthTimeUtc(row.sentAt)}
                  <span className="fh-muted"> · {row.sentByName}</span>
                </td>
                <td className="fh-n">{row.queuedCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function AdminPage() {
  return <AdminHomeView communityName={COMMUNITY_NAME} thisWeek={CONSOLE_THIS_WEEK} items={CONSOLE_HOME_ITEMS} />;
}

const PAGES: Record<string, { page: () => React.ReactNode; isAdmin: boolean }> = {
  "/people": { page: PeoplePage, isAdmin: false },
  "/search/ask": { page: SearchAskPage, isAdmin: false },
  "/asks": { page: AsksPage, isAdmin: false },
  "/jobs": { page: JobsPage, isAdmin: false },
  "/search/candidates": { page: CandidatesPage, isAdmin: false },
  [LIBRARY_PAGES.browse]: { page: LibraryPage, isAdmin: false },
  [LIBRARY_PAGES.leaderboard]: { page: LibraryLeaderboardPage, isAdmin: false },
  [VOICE_PAGE]: { page: RoomsPage, isAdmin: false },
  [ROOM_HREF]: { page: RoomPage, isAdmin: false },
  "/me/alerts": { page: AlertsPage, isAdmin: false },
  "/admin/announcements": { page: AnnouncementsPage, isAdmin: true },
  "/admin": { page: AdminPage, isAdmin: true },
};

export function TourScreens({ client }: { client: QueryClient }) {
  const pathname = usePathname();
  // Read here so a change of the address re-renders the page under the shell.
  useSearchParams();
  const route = PAGES[pathname] ?? PAGES["/people"]!;
  const Page = route.page;
  const who = route.isAdmin ? ADMIN : FOUNDER;
  return (
    <QueryClientProvider client={client}>
      <AppShell
        community={{ name: COMMUNITY_NAME, descriptor: "", logo: null }}
        member={toShellMember(who)}
        navigation={route.isAdmin ? NAVIGATION.admin : NAVIGATION.member}
        badges={{}}
        isNetworkOn
      >
        <Page />
      </AppShell>
    </QueryClientProvider>
  );
}
