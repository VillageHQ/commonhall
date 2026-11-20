import { Plus, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ChipRow, CHIP_CLASSES } from "@/components/ui/chip";
import { SearchBox } from "@/components/ui/search-box";
import { Select } from "@/components/ui/select";

import { LIBRARY_JOB_LABELS, LIBRARY_KIND_LABELS, LIBRARY_PAGES, LIBRARY_SORTS, type LibraryJob, type LibraryKind } from "../contract";
import type { LibraryCard } from "../reads";
import { LibraryItemCard, LIBRARY_ICON } from "./library-parts";

// `job` is the item's role (Sales, Hiring…); the address keeps the old name. `top`: the "Top" sort.
export type LibraryBrowseFilters = { kind: LibraryKind | null; job: LibraryJob | null; search: string | null; mine: boolean; top?: boolean };

type LibraryBrowseProps = {
  communityName: string;
  items: LibraryCard[];
  filters: LibraryBrowseFilters;
  // "Ask the community" on an empty result: the asks board while Asks is on.
  askHref: string | null;
  flash: string | null;
};

export function toBrowseHref({ kind, job, search, mine, top }: Partial<LibraryBrowseFilters>) {
  const params = new URLSearchParams();
  if (kind) params.set("kind", kind);
  if (job) params.set("job", job);
  if (search) params.set("q", search);
  if (mine) params.set("mine", "1");
  if (top) params.set("sort", LIBRARY_SORTS.top);
  const query = params.toString();
  return query ? `${LIBRARY_PAGES.browse}?${query}` : LIBRARY_PAGES.browse;
}

// All, Top (by upvotes) and Yours. Each keeps the search and the filters.
function SortChips({ filters }: { filters: LibraryBrowseFilters }) {
  const isTop = Boolean(filters.top);
  return (
    <ChipRow className="fh-tabs" aria-label="Show">
      <Link className={CHIP_CLASSES} href={toBrowseHref({ ...filters, mine: false, top: false })} aria-pressed={!isTop && !filters.mine}>
        All
      </Link>
      <Link className={CHIP_CLASSES} href={toBrowseHref({ ...filters, mine: false, top: true })} aria-pressed={isTop}>
        Top
      </Link>
      <Link className={CHIP_CLASSES} href={toBrowseHref({ ...filters, mine: true, top: false })} aria-pressed={filters.mine}>
        Yours
      </Link>
    </ChipRow>
  );
}

// The search, with Kind and Role folded behind "Filter" (open while one is set).
function SearchAndFilter({ filters }: { filters: LibraryBrowseFilters }) {
  return (
    <form method="get" action={LIBRARY_PAGES.browse} className="fh-lib-filter" role="search">
      {filters.mine ? <input type="hidden" name="mine" value="1" /> : null}
      {filters.top ? <input type="hidden" name="sort" value={LIBRARY_SORTS.top} /> : null}
      <SearchBox name="q" defaultValue={filters.search ?? ""} placeholder="Search titles and pitches" aria-label="Search the library" />
      <details className="fh-others" open={Boolean(filters.kind || filters.job)}>
        <summary className="fh-small">
          <SlidersHorizontal {...LIBRARY_ICON} className="fh-i fh-xs inline-block align-[-2px]" /> Filter
        </summary>
        <div className="fh-lib-filter-row mt-2 flex-wrap">
          <label htmlFor="library-kind" className="fh-small fh-muted">
            Kind
          </label>
          <Select id="library-kind" name="kind" defaultValue={filters.kind ?? ""} className="fh-lib-select">
            <option value="">Every kind</option>
            {(Object.entries(LIBRARY_KIND_LABELS) as [LibraryKind, string][]).map(([kind, label]) => (
              <option key={kind} value={kind}>
                {label}
              </option>
            ))}
          </Select>
          <label htmlFor="library-job" className="fh-small fh-muted">
            Role
          </label>
          <Select id="library-job" name="job" defaultValue={filters.job ?? ""} className="fh-lib-select">
            <option value="">Every role</option>
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
      </details>
    </form>
  );
}

function describeFilters({ kind, job, search }: LibraryBrowseFilters) {
  const parts = [kind ? LIBRARY_KIND_LABELS[kind] : null, job ? LIBRARY_JOB_LABELS[job] : null, search ? `“${search}”` : null].filter(Boolean);
  return parts.join(" · ");
}

// The library: a search (Kind and Role behind "Filter"), All / Top / Yours, then the items in a grid. Under "Top",
// the items go by upvotes (the old leaderboard page).
export function LibraryBrowse({ items, filters, askHref, flash }: LibraryBrowseProps) {
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
        action={
          <Button asChild variant="ink">
            <Link href={LIBRARY_PAGES.publish}>
              <Plus {...LIBRARY_ICON} />
              Share something
            </Link>
          </Button>
        }
      />
      <SearchAndFilter filters={filters} />
      <SortChips filters={filters} />
      {isFiltered ? (
        <p className="fh-small fh-muted mt-2">
          {items.length} item{items.length === 1 ? "" : "s"}
          {describeFilters(filters) ? ` for ${describeFilters(filters)}` : ""} · <Link href={toBrowseHref({ top: filters.top })}>Clear</Link>
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
          {isFiltered && askHref ? (
            <EmptyState title="Nothing here yet" description="Someone may have one. Ask the community.">
              <Button asChild variant="primary">
                <Link href={askHref}>Ask the community</Link>
              </Button>
            </EmptyState>
          ) : (
            <EmptyState title={isFiltered ? "Nothing here yet" : "The library is empty"} description="Share the first tool your team relies on.">
              <Button asChild variant="secondary">
                <Link href={LIBRARY_PAGES.publish}>Share something</Link>
              </Button>
            </EmptyState>
          )}
        </div>
      )}
    </>
  );
}
