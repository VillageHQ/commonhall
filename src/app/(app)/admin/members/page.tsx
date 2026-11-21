import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { ChipCount, ChipRow, CHIP_CLASSES } from "@/components/ui/chip";
import { SearchBox } from "@/components/ui/search-box";
import { getDatabase } from "@/platform/database/client";
import { readResendConfig } from "@/platform/email/resend";
import { ROUTES } from "@/platform/http/routes";
import { requireAdmin } from "@/platform/auth/session";
import { modulePage } from "@/platform/modules/module-page";

import { MAXIMUM_SEARCH_LENGTH } from "@/modules/admin/contract";
import {
  ALWAYS_SHOWN_FILTERS,
  CONSOLE_MEMBER_FILTER_LABELS,
  countConsoleMembers,
  matchesConsoleFilter,
  matchesConsoleSearch,
  parseConsoleMemberFilter,
  SHOWN_WHEN_FULL_FILTERS,
  sortConsoleMembers,
  type ConsoleMemberFilter,
} from "@/modules/admin/console-members";
import { readConsoleMembers, readIsFillInOffered } from "@/modules/admin/reads-members";
import { networkManifest } from "@/modules/network/manifest";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { MemberTable } from "@/modules/admin/components/member-table";
import { WaitingMembers } from "@/modules/admin/components/waiting-members";
import { readWaitingMemberCount, readWaitingMembers } from "@/modules/members/service-admin";
import { waitingMembersQuery } from "@/modules/members/queries-invites";
import { LinkedinClaimCard } from "@/modules/members/components/shared/linkedin-claim-card";
import { adminManifest } from "@/modules/admin/manifest";
import { AdminSection } from "@/shell/admin-section";

export const metadata: Metadata = { title: "Members" };

function filterHref(filter: ConsoleMemberFilter, search: string) {
  const query = new URLSearchParams({ f: filter, ...(search ? { q: search } : {}) });
  return `${ROUTES.adminMembers}?${query}`;
}

type MembersSearch = { f?: string; q?: string };

// Commonhall's Members: everyone in one table, members and the people invited, with filters and a search.
// Community-only tools stay: each member's Manage page (role, Village, LinkedIn, remove, delete), the people waiting
// for an OK, and freeing up a LinkedIn profile.
export default modulePage(adminManifest, async function AdminMembersPage({ searchParams }: { searchParams: Promise<MembersSearch> }) {
  await requireAdmin();
  const { f, q } = await searchParams;
  const filter = parseConsoleMemberFilter(f);
  const search = (q ?? "").trim().slice(0, MAXIMUM_SEARCH_LENGTH);

  const database = getDatabase();
  const [everyone, waiting, waitingCount, isNetworkOn] = await Promise.all([
    readConsoleMembers(database),
    readWaitingMembers(database),
    readWaitingMemberCount(database),
    isModuleEnabled(database, networkManifest),
  ]);
  const isNetworkSearchOn = await readIsFillInOffered(database, isNetworkOn);
  const counts = countConsoleMembers(everyone);
  const shown = sortConsoleMembers(everyone.filter((member) => matchesConsoleFilter(member, filter) && matchesConsoleSearch(member, search)));
  const filters = [...ALWAYS_SHOWN_FILTERS, ...SHOWN_WHEN_FULL_FILTERS.filter((extra) => counts[extra] > 0 || extra === filter)];

  const queryClient = new QueryClient();
  queryClient.setQueryData(waitingMembersQuery.queryKey, { members: waiting, waitingCount });

  return (
    <AdminSection title="Members">
      <HydrationBoundary state={dehydrate(queryClient)}>
        <WaitingMembers isEmailConfigured={readResendConfig(process.env) !== null} isNetworkSearchOn={isNetworkSearchOn} />
      </HydrationBoundary>

      <ChipRow role="group" aria-label="Filter members">
        {filters.map((key) => (
          <Link key={key} href={filterHref(key, search)} className={CHIP_CLASSES} aria-pressed={filter === key}>
            {CONSOLE_MEMBER_FILTER_LABELS[key]} <ChipCount>{counts[key]}</ChipCount>
          </Link>
        ))}
      </ChipRow>

      <form method="get" action={ROUTES.adminMembers} role="search" className="mt-3.5 mb-1.5">
        <input type="hidden" name="f" value={filter} />
        <SearchBox name="q" placeholder="Name, email, company or city" defaultValue={search} aria-label="Search members" maxLength={MAXIMUM_SEARCH_LENGTH} className="[&_.fh-input]:h-11" />
      </form>

      <MemberTable members={shown} empty={<EmptyState title="Nobody here" description="Try another filter." />} />

      <details className="fh-copybox mt-7">
        <summary>Free up a LinkedIn profile</summary>
        <div className="mt-3">
          <LinkedinClaimCard />
        </div>
      </details>
    </AdminSection>
  );
});
