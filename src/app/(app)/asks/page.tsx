import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";

import { AsksBoard } from "@/modules/asks/components/asks-board";
import { ASK_PAGE_TABS, ASKS_PAGE, ASKS_PAGE_TITLE, ASK_LIMITS, readAskFlash, type AskTab } from "@/modules/asks/contract";
import { asksManifest } from "@/modules/asks/manifest";
import { isHiringRequestFree } from "@/modules/asks/reads";
import { readAsksPage } from "@/modules/asks/reads-board";
import { parseAskDraftParts } from "@/modules/asks/rules-board-url";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { modulePage } from "@/platform/modules/module-page";
import { readAskAllowance } from "@/shell/ask-helpers";

export const metadata: Metadata = { title: ASKS_PAGE_TITLE };

type SearchParams = Record<string, string | string[] | undefined>;
type AsksPageProps = { searchParams: Promise<SearchParams> };

const OLD_VIEWS: Record<string, AskTab> = { yours: ASK_PAGE_TABS.yours, answered: ASK_PAGE_TABS.answered, closed: ASK_PAGE_TABS.answered };
const TAB_VALUES: ReadonlySet<string> = new Set(Object.values(ASK_PAGE_TABS));

function readFirst(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

// The old Updates tab folds into Open; anything unknown is Open too.
function readTab(value: string | null): AskTab {
  return value && TAB_VALUES.has(value) ? (value as AskTab) : ASK_PAGE_TABS.open;
}

export default modulePage(asksManifest, async function AsksPage({ searchParams }: AsksPageProps) {
  const params = await searchParams;
  // The old "Your asks" view and the Closed tab are tabs of the one board now.
  const oldView = readFirst(params.view);
  if (oldView && OLD_VIEWS[oldView]) permanentRedirect(`${ASKS_PAGE}?tab=${OLD_VIEWS[oldView]}`);

  const member = await requireMember();
  const database = getDatabase();
  const search = readFirst(params.q)?.replace(/\s+/g, " ").trim().slice(0, ASK_LIMITS.searchLength) || null;
  const tab = readTab(readFirst(params.tab));
  const parsedDraft = parseAskDraftParts(params);
  const now = new Date();
  const [allowance, { posts, counts }, isFreeHiring] = await Promise.all([
    readAskAllowance(database, member.id, now),
    readAsksPage(database, { viewerId: member.id, tab, search }, now),
    parsedDraft?.hiringJobId ? isHiringRequestFree(database, parsedDraft.hiringJobId, now) : false,
  ]);
  // An old link (Back, a bookmark) to a job whose free request is used this week drafts an ordinary hiring ask, so the
  // composer never says "free" when the post would spend an ask.
  const draft = parsedDraft?.hiringJobId && !isFreeHiring ? { ...parsedDraft, hiringJobId: null } : parsedDraft;

  return (
    <AsksBoard
      tab={tab}
      search={search}
      posts={posts}
      counts={counts}
      allowance={allowance}
      flash={readAskFlash(readFirst(params.m))}
      draft={draft}
      isComposing={readFirst(params.compose) === "1"}
    />
  );
});
