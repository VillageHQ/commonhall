import Link from "next/link";

import { FlashNote } from "@/components/flash";
import { PageHeader } from "@/components/page-header";
import { ChipCount, ChipRow, CHIP_CLASSES } from "@/components/ui/chip";
import { SearchBox } from "@/components/ui/search-box";

import { ASK_PAGE_TABS, ASK_TABS, ASKS_PAGE, type AskAllowance, type AskTab } from "../contract";
import type { AskTabCounts, BoardPost } from "../reads-board";
import type { AskDraftParts } from "../rules-board-url";
import { AsksComposer } from "./asks-composer";
import { AskConsent, PostCard } from "./post-parts";

// An empty state is one line (the box above is its button).
const EMPTY_TABS: Record<AskTab, string> = {
  [ASK_PAGE_TABS.open]: "No open asks yet.",
  [ASK_PAGE_TABS.forYou]: "Nothing for you right now.",
  [ASK_PAGE_TABS.yours]: "You haven’t posted yet.",
  [ASK_PAGE_TABS.answered]: "Nothing answered yet.",
};

type AsksBoardProps = {
  tab: AskTab;
  search: string | null;
  posts: BoardPost[];
  counts: AskTabCounts;
  allowance: AskAllowance;
  flash: string | null;
  draft: AskDraftParts | null;
  // `?compose=1` (Today's "Post an ask"): the box takes the focus.
  isComposing?: boolean;
};

function toTabHref(tab: AskTab) {
  return tab === ASK_PAGE_TABS.open ? ASKS_PAGE : `${ASKS_PAGE}?tab=${tab}`;
}

// The Asks page (round 6): "What do you need?" first, then the archive search, the Open · For you · Yours filters and
// the posts, in one column. "How asks work" stays folded at the foot.
export function AsksBoard({ tab, search, posts, counts, allowance, flash, draft, isComposing = false }: AsksBoardProps) {
  return (
    <div className="fh-narrow">
      {flash ? <FlashNote>{flash}</FlashNote> : null}
      <PageHeader title="Asks" />
      <AsksComposer allowance={allowance} draft={draft} isComposing={isComposing} />
      <form method="get" action={ASKS_PAGE} role="search" className="fh-archive">
        <SearchBox name="q" defaultValue={search ?? ""} placeholder="Search every ask and its answers" aria-label="Search asks" />
      </form>
      {search ? (
        <p className="fh-small fh-muted" style={{ margin: "12px 0 4px" }}>
          {posts.length} result{posts.length === 1 ? "" : "s"} for “{search}” · <Link href={ASKS_PAGE}>Clear</Link>
        </p>
      ) : (
        <ChipRow className="fh-tabs" aria-label="Asks">
          {ASK_TABS.map(([key, label]) => (
            <Link key={key} className={CHIP_CLASSES} href={toTabHref(key)} aria-pressed={tab === key}>
              {label}
              {key === ASK_PAGE_TABS.forYou && counts[key] > 0 ? <ChipCount>{counts[key]}</ChipCount> : null}
            </Link>
          ))}
        </ChipRow>
      )}
      <div className="fh-posts">
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} isYoursTab={tab === ASK_PAGE_TABS.yours} />)
        ) : (
          <p className="fh-empty" style={{ marginTop: 12 }}>
            {search ? `No ask matches “${search}”.` : EMPTY_TABS[tab]}
          </p>
        )}
      </div>
      <details className="fh-more" style={{ marginTop: 20 }}>
        <summary className="fh-small">How asks work</summary>
        <ul className="fh-small fh-muted" style={{ margin: "8px 0 0", paddingLeft: 18, listStyle: "disc" }}>
          <li>We tell the members who know the person, or have done it.</li>
          <li>They answer under the ask, or offer an intro.</li>
          <li>Mark it answered when it’s solved.</li>
        </ul>
        <AskConsent />
      </details>
    </div>
  );
}
