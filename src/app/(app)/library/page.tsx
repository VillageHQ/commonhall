import type { Metadata } from "next";

import { LibraryBrowse } from "@/modules/library/components/library-browse";
import { LIBRARY_BOARD_PERIODS, LIBRARY_KIND_LABELS, LIBRARY_PAGE_TITLE } from "@/modules/library/contract";
import { libraryManifest } from "@/modules/library/manifest";
import { readLeaderboard, readLibraryItems, readLibraryViewer } from "@/modules/library/reads";
import { parseLibraryFilters, readLibraryFlash, type LibrarySearchParams } from "@/modules/library/rules-page";
import { requireMember } from "@/platform/auth/session";
import { readBrandingForPage } from "@/platform/branding/branding";
import { getDatabase } from "@/platform/database/client";
import { ASKS_MODULE_ID, toAskDraftHref } from "@/platform/modules/manifest";
import { modulePage } from "@/platform/modules/module-page";
import { readEnabledIds } from "@/shell/enabled-modules";

export const metadata: Metadata = { title: LIBRARY_PAGE_TITLE };

type LibraryPageProps = { searchParams: Promise<LibrarySearchParams> };

export default modulePage(libraryManifest, async function LibraryPage({ searchParams }: LibraryPageProps) {
  const member = await requireMember();
  const database = getDatabase();
  const params = await searchParams;
  const filters = parseLibraryFilters(params);
  const viewer = await readLibraryViewer(database, member);
  const [community, items, board, enabledIds] = await Promise.all([
    readBrandingForPage(),
    readLibraryItems(database, viewer, filters),
    // The month's top sharers show only under the "Top" sort (the old leaderboard page).
    filters.top ? readLeaderboard(database, viewer, LIBRARY_BOARD_PERIODS.month) : null,
    readEnabledIds(database),
  ]);
  const thing = filters.kind ? LIBRARY_KIND_LABELS[filters.kind].toLowerCase() : "AI tool";
  const withArticle = `${/^[aeiou]/i.test(thing) ? "an" : "a"} ${thing}`;
  const askTitle = filters.search ? `Does anyone have ${withArticle} for “${filters.search}”?` : `Does anyone have ${withArticle} they’d share?`;
  return (
    <LibraryBrowse
      communityName={community.name}
      items={items}
      filters={filters}
      topPeople={board?.people}
      askHref={enabledIds.has(ASKS_MODULE_ID) ? toAskDraftHref(askTitle) : null}
      flash={readLibraryFlash(params)}
    />
  );
});
