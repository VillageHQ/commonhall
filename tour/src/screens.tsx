"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { BackLink } from "@/components/page-header";
import { AsksBoard } from "@/modules/asks/components/asks-board";
import { MemberDirectory } from "@/modules/members/components/member-directory";
import { directoryQuery } from "@/modules/members/queries-directory";
import { parseDirectoryFilters } from "@/modules/members/rules-directory-url";
import { SearchScreen } from "@/modules/network/components/search-screen";
import { networkSearchQuery } from "@/modules/network/queries";
import { AppShell } from "@/shell/app-shell";
import { AdminHomeView } from "@/shell/admin-home-view";
import { OneStepAskForm } from "@/shell/intro-ask-forms";
import { buildShellNavigation } from "@/shell/navigation";

import {
  ADMIN,
  ASK_ALLOWANCE,
  ASK_COUNTS,
  ASK_POSTS,
  COMMUNITY_NAME,
  CONSOLE_HOME,
  DIRECTORY_SECTOR,
  FOUNDER,
  FOUNDER_VIEWER,
  INTRO_CONNECTOR,
  INTRO_TARGET,
  readDirectory,
  SEARCH_QUERY,
  SEARCH_RESULT,
  SHARING_MEMBER_COUNT,
  TOUR_NOW,
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
  for (const sector of ["", DIRECTORY_SECTOR]) {
    client.setQueryData(directoryQuery(parseDirectoryFilters(sector ? { sector } : {})).queryKey, readDirectory(sector));
  }
}

function SearchPage() {
  return (
    <SearchScreen
      viewer={FOUNDER_VIEWER}
      communityName={COMMUNITY_NAME}
      sharingMemberCount={SHARING_MEMBER_COUNT}
      isConnected
      isVillageOn
      defaultScope="network"
      canAskIntro
      canAskCommunity
      digestDay="Thursday"
    />
  );
}

// src/app/(app)/search/ask/page.tsx
function SearchAskPage() {
  const connectorFirst = INTRO_CONNECTOR.name.split(" ")[0] ?? INTRO_CONNECTOR.name;
  const targetFirst = INTRO_TARGET.name.split(" ")[0] ?? INTRO_TARGET.name;
  return (
    <>
      <BackLink href={`/search?q=${encodeURIComponent(SEARCH_QUERY)}&scope=network`}>Back to results</BackLink>
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

function AsksPage() {
  return <AsksBoard communityName={COMMUNITY_NAME} tab="open" search={null} posts={ASK_POSTS} counts={ASK_COUNTS} allowance={ASK_ALLOWANCE} flash={null} draft={null} now={TOUR_NOW} />;
}

// src/app/(app)/directory/page.tsx
function DirectoryPage() {
  const directory = readDirectory("");
  return (
    <>
      <header data-slot="page-header" className="fh-pagehead">
        <h1 className="fh-h1">Directory</h1>
        <p className="fh-lede">
          {directory.memberCount} members of {COMMUNITY_NAME}. Each member writes their own profile.
        </p>
        <p className="fh-small mt-2">
          <Building2 aria-hidden="true" className="fh-i fh-xs inline align-[-2px]" strokeWidth={1.5} /> <Link href="/jobs">Jobs at member companies (3)</Link>
        </p>
      </header>
      <MemberDirectory />
    </>
  );
}

function AdminPage() {
  return <AdminHomeView communityName={COMMUNITY_NAME} home={CONSOLE_HOME} items={[]} />;
}

const PAGES: Record<string, { page: () => React.ReactNode; isAdmin: boolean }> = {
  "/search": { page: SearchPage, isAdmin: false },
  "/search/ask": { page: SearchAskPage, isAdmin: false },
  "/asks": { page: AsksPage, isAdmin: false },
  "/directory": { page: DirectoryPage, isAdmin: false },
  "/admin": { page: AdminPage, isAdmin: true },
};

export function TourScreens({ client }: { client: QueryClient }) {
  const pathname = usePathname();
  // Read here so a change of the address re-renders the page under the shell.
  useSearchParams();
  const route = PAGES[pathname] ?? PAGES["/search"]!;
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
