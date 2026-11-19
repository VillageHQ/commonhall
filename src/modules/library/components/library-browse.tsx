import { Plus, Trophy } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ChipRow, CHIP_CLASSES } from "@/components/ui/chip";
import { SearchBox } from "@/components/ui/search-box";
import { Select } from "@/components/ui/select";

import { LIBRARY_JOB_LABELS, LIBRARY_KIND_LABELS, LIBRARY_PAGES, type LibraryJob, type LibraryKind } from "../contract";
import type { LeaderboardPerson, LibraryCard } from "../reads";
import { LibraryItemCard, LIBRARY_ICON, MemberLine } from "./library-parts";

export type LibraryBrowseFilters = { kind: LibraryKind | null; job: LibraryJob | null; search: string | null; mine: boolean };

type LibraryBrowseProps = {
  communityName: string;
  items: LibraryCard[];
  filters: LibraryBrowseFilters;
  topPeople: LeaderboardPerson[];
  // "Ask the community" on an empty result: the asks board while Asks is on.
  askHref: string | null;
  flash: string | null;
};

export function toBrowseHref({ kind, job, search, mine }: Partial<LibraryBrowseFilters>) {
  const params = new URLSearchParams();
  if (kind) params.set("kind", kind);
  if (job) params.set("job", job);
  if (search) params.set("q", search);
  if (mine) params.set("mine", "1");
  const query = params.toString();
  return query ? `${LIBRARY_PAGES.browse}?${query}` : LIBRARY_PAGES.browse;
}

function KindChips({ filters }: { filters: LibraryBrowseFilters }) {
  return (
    <ChipRow className="fh-tabs" aria-label="Kind">
      <Link className={CHIP_CLASSES} href={toBrowseHref({ ...filters, kind: null })} aria-pressed={!filters.kind && !filters.mine}>
        All
      </Link>
      {(Object.entries(LIBRARY_KIND_LABELS) as [LibraryKind, string][]).map(([kind, label]) => (
        <Link key={kind} className={CHIP_CLASSES} href={toBrowseHref({ ...filters, kind })} aria-pressed={filters.kind === kind}>
          {label}
        </Link>
      ))}
      <Link className={CHIP_CLASSES} href={toBrowseHref({ ...filters, kind: null, mine: !filters.mine })} aria-pressed={filters.mine}>
        Yours
      </Link>
    </ChipRow>
  );
}

function JobFilter({ filters }: { filters: LibraryBrowseFilters }) {
  return (
    <form method="get" action={LIBRARY_PAGES.browse} className="fh-lib-filter" role="search">
      {filters.kind ? <input type="hidden" name="kind" value={filters.kind} /> : null}
      {filters.mine ? <input type="hidden" name="mine" value="1" /> : null}
      <SearchBox name="q" defaultValue={filters.search ?? ""} placeholder="Search titles and pitches" aria-label="Search the library" />
      <div className="fh-lib-filter-row">
        <label htmlFor="library-job" className="fh-small fh-muted">
          Job
        </label>
        <Select id="library-job" name="job" defaultValue={filters.job ?? ""} className="fh-lib-select">
          <option value="">Every job</option>
          {(Object.entries(LIBRARY_JOB_LABELS) as [LibraryJob, string][]).map(([job, label]) => (
            <option key={job} value={job}>
              {label}
            </option>
          ))}
        </Select>
        <Button type="submit" variant="secondary" size="sm">
          Show
        </Button>
      </div>
    </form>
  );
}

function describeFilters({ kind, job, search }: LibraryBrowseFilters) {
  const parts = [kind ? LIBRARY_KIND_LABELS[kind] : null, job ? LIBRARY_JOB_LABELS[job] : null, search ? `“${search}”` : null].filter(Boolean);
  return parts.join(" · ");
}

// The library: kind chips, a search and a job filter, then the items in a grid; the month's top contributors on the
// right on a desktop.
export function LibraryBrowse({ communityName, items, filters, topPeople, askHref, flash }: LibraryBrowseProps) {
  const isFiltered = Boolean(filters.kind || filters.job || filters.search || filters.mine);
  return (
    <>
      {flash ? (
        <p role="status" className="fh-note fh-ok mb-3">
          {flash}
        </p>
      ) : null}
      <PageHeader
        title="Library"
        description={`AI skills, agents, prompts and tool connections that founders across ${communityName} use and share. Upvote what worked for you.`}
        action={
          <>
            <Button asChild variant="ink">
              <Link href={LIBRARY_PAGES.publish}>
                <Plus {...LIBRARY_ICON} />
                Share something
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={LIBRARY_PAGES.leaderboard}>
                <Trophy {...LIBRARY_ICON} />
                Leaderboard
              </Link>
            </Button>
          </>
        }
      />
      <div className="fh-asks-grid">
        <div>
          <JobFilter filters={filters} />
          <KindChips filters={filters} />
          {isFiltered ? (
            <p className="fh-small fh-muted mt-2">
              {items.length} item{items.length === 1 ? "" : "s"}
              {describeFilters(filters) ? ` for ${describeFilters(filters)}` : ""} · <Link href={LIBRARY_PAGES.browse}>Clear</Link>
            </p>
          ) : null}
          {items.length > 0 ? (
            <div className="fh-lib-grid">
              {items.map((item) => (
                <LibraryItemCard key={item.id} item={item} />
              ))}
            </div>
          ) : (
            <div className="mt-3">
              <EmptyState
                title={isFiltered ? "Nothing here yet" : "The library is empty"}
                description={
                  isFiltered
                    ? "Nobody has shared one of these yet. Ask the community: someone may have it and not have shared it."
                    : "Share the first skill, agent or prompt your team relies on."
                }
              >
                {askHref ? (
                  <Button asChild variant="primary">
                    <Link href={askHref}>Ask the community</Link>
                  </Button>
                ) : null}
                <Button asChild variant="secondary">
                  <Link href={LIBRARY_PAGES.publish}>Share something</Link>
                </Button>
              </EmptyState>
            </div>
          )}
        </div>
        <aside className="fh-desk-only">
          <section className="fh-sheet">
            <div className="fh-sheet-head">
              <h2 className="fh-h3">Top this month</h2>
              <Link href={LIBRARY_PAGES.leaderboard}>Leaderboard</Link>
            </div>
            {topPeople.length > 0 ? (
              <ol className="fh-lib-top">
                {topPeople.slice(0, 5).map(({ member, upvotes }) => (
                  <li key={member.id}>
                    <MemberLine member={member} />
                    <span className="fh-small fh-muted">{upvotes}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="fh-small fh-muted">No upvotes yet this month.</p>
            )}
          </section>
          <section className="fh-sheet">
            <h2 className="fh-h3">Safe to share</h2>
            <p className="fh-small mt-2">
              Every upload is checked for keys, passwords and private keys before it is saved. Items go to the whole portfolio unless you pick
              who can see them.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}
