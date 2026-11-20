import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";

import { asksManifest } from "@/modules/asks/manifest";
import { introsManifest } from "@/modules/intros/manifest";
import { membersManifest } from "@/modules/members/manifest";
import { directoryQuery } from "@/modules/members/queries-directory";
import { readDirectory } from "@/modules/members/reads-directory";
import { parseDirectoryFilters } from "@/modules/members/rules-directory-url";
import { readAvatarUrl } from "@/modules/members/service-profile";
import { SEARCH_WHERE } from "@/modules/network/contract";
import { SEARCH_SCOPES } from "@/modules/network/contract-village-settings";
import { networkManifest } from "@/modules/network/manifest";
import { readIsInVillageGroup, readSharingMemberCount } from "@/modules/network/reads-progress";
import { readVillageSearchSettings } from "@/modules/network/service-settings";
import { requireMember } from "@/platform/auth/session";
import { readBrandingForPage } from "@/platform/branding/branding";
import { getDatabase, type Database } from "@/platform/database/client";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { modulePage } from "@/platform/modules/module-page";
import { readVillageKeys } from "@/platform/village/settings";
import { WEEKDAYS } from "@/platform/weekly-email/schedule";
import { readWeeklySchedule } from "@/platform/weekly-email/schedule-store";
import { wereIntroducedForBooking } from "@/shell/booking-access";
import { readHiringLookup } from "@/shell/directory-hiring";
import { PeopleScreen, type NetworkStep } from "@/shell/people-screen";

export const metadata: Metadata = { title: "People" };

type PeoplePageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// "Search their networks" needs Network on, Village set up, and the member's own network connected. Reading this
// spends nothing: the search itself runs only when the member asks for it.
async function readNetworkStep(database: Database, member: Awaited<ReturnType<typeof requireMember>>, canAskIntro: boolean, communityName: string): Promise<NetworkStep> {
  const [isNetworkOn, keys] = await Promise.all([isModuleEnabled(database, networkManifest), readVillageKeys(database)]);
  if (!isNetworkOn || keys === null) return null;
  const isConnected = await readIsInVillageGroup(database, member.id);
  if (!isConnected) return { state: "connect" };
  const [avatarUrl, sharingMemberCount, settings, canAskCommunity, schedule] = await Promise.all([
    readAvatarUrl(database, member.id),
    readSharingMemberCount(database),
    readVillageSearchSettings(database),
    isModuleEnabled(database, asksManifest),
    readWeeklySchedule(database),
  ]);
  return {
    state: "ready",
    search: {
      viewer: { id: member.id, name: member.name, imageUrl: avatarUrl },
      communityName,
      sharingMemberCount,
      isConnected,
      isVillageOn: true,
      defaultScope: settings.searchScope === SEARCH_SCOPES.everyone ? SEARCH_WHERE.global : SEARCH_WHERE.network,
      canAskIntro,
      canAskCommunity,
      digestDay: WEEKDAYS[schedule.weekday] ?? "Thursday",
    },
  };
}

// People: the member search (Directory and Search before round 6), paged at 30, and "Search their networks".
export default modulePage(membersManifest, async function PeoplePage({ searchParams }: PeoplePageProps) {
  const member = await requireMember();
  const filters = parseDirectoryFilters(await searchParams);
  const database = getDatabase();
  const [directory, community, canAskIntro] = await Promise.all([
    readDirectory(database, filters, new Date(), await readHiringLookup(database), { id: member.id, wereIntroduced: wereIntroducedForBooking }),
    readBrandingForPage(),
    isModuleEnabled(database, introsManifest),
  ]);
  const network = await readNetworkStep(database, member, canAskIntro, community.name);

  const queryClient = new QueryClient();
  queryClient.setQueryData(directoryQuery(filters).queryKey, directory);

  return (
    <>
      <header data-slot="page-header" className="fh-pagehead">
        <h1 className="fh-h1">People</h1>
      </header>
      <HydrationBoundary state={dehydrate(queryClient)}>
        <PeopleScreen network={network} />
      </HydrationBoundary>
    </>
  );
});
