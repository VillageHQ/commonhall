"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";
import { useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";
import { useDeferredValue, useRef, useState, type ReactNode, type RefObject } from "react";

import { EmptyState } from "@/components/empty-state";
import { QueryBoundary } from "@/components/query-boundary";
import { CompanyLogo } from "@/components/company-name";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/chip";
import { ListRow } from "@/components/ui/list-row";
import { SearchBox } from "@/components/ui/search-box";
import { Select } from "@/components/ui/select";
import { Sheet } from "@/components/ui/sheet";
import { Tag } from "@/components/ui/tag";
import { EMPTY_DIRECTORY_FILTERS, hasDirectoryFilters, parseDirectoryFilters, readUpdatedWithinDays, toDirectoryQueryString } from "@/modules/members/rules-directory-url";
import { PROFILE_LIMITS, UPDATED_WITHIN_DAYS, type Directory, type DirectoryFilters, type DirectoryMember } from "@/modules/members/contract-profile";
import { toRoleLine } from "@/modules/members/rules-words";
import { ROUTES } from "@/platform/http/routes";

import { directoryQuery } from "@/modules/members/queries-directory";
import { COMMUNITY_ROLE_LABELS, COMMUNITY_ROLES, EXPERT_ROLES } from "@/modules/members/contract-community-roles";
import { BookCallButton } from "@/modules/members/components/book-call-button";

import "./people.css";

// People's member search (round 8, ui-polish Part 5): the search box and Filter on one 44 px row, the views as chips
// under it ("Everyone", "Mentors and experts"), the count, then one column of ListRows, 30 to a page. A row is one
// link to the profile: the 48 px photo, the name, the logo (or its letter) + "Role, Company · City", and at most two
// tags. On a phone Filter is a 44×44 icon and its panel a bottom sheet ending "Clear all" · "Show N people".

const SEARCH_DEBOUNCE_MS = 250;
const MEMBER_AVATAR_SIZE_PX = 48;
const MAX_ROW_TAGS = 2;
const RESULTS_ID = "member-results";
export const SEARCH_INPUT_ID = "member-search";
const FILTERS_ID = "people-filters";

let pendingSearch: ReturnType<typeof setTimeout> | undefined;

function applyFilters(filters: DirectoryFilters) {
  window.history.replaceState(null, "", `${ROUTES.people}${toDirectoryQueryString(filters)}`);
}

// "Mentors and experts" on People (and back to everyone), keeping the words typed.
function switchView(isExpertsView: boolean) {
  const filters = parseDirectoryFilters(Object.fromEntries(new URLSearchParams(window.location.search)));
  applyFilters({ ...filters, isExpertsView, communityRole: "", updatedWithinDays: 0, page: 1 });
}

function scheduleSearch(search: string, filters: DirectoryFilters) {
  clearTimeout(pendingSearch);
  pendingSearch = setTimeout(() => {
    if (window.location.pathname === ROUTES.people) applyFilters({ ...filters, search, page: 1 });
  }, SEARCH_DEBOUNCE_MS);
}

// A search typed in the box but not yet in the address is dropped (People's "Search their networks" moves the address
// itself, and the late member search must not overwrite it).
export function cancelPendingSearch() {
  clearTimeout(pendingSearch);
}

function clearFilters(setSearchDraft: (search: string) => void, isExpertsView: boolean) {
  clearTimeout(pendingSearch);
  setSearchDraft("");
  applyFilters({ ...EMPTY_DIRECTORY_FILTERS, isExpertsView });
  document.getElementById(SEARCH_INPUT_ID)?.focus();
}

// The filter panel's "Clear all": every filter it counts, keeping the words typed and the view (it has its own chips).
function clearPanelFilters(filters: DirectoryFilters) {
  applyFilters({ ...EMPTY_DIRECTORY_FILTERS, search: filters.search, isExpertsView: filters.isExpertsView });
}

function goToPage(page: number, filters: DirectoryFilters) {
  applyFilters({ ...filters, page });
  document.getElementById(RESULTS_ID)?.focus();
}

// A hiring founder's card says so (the profile lists the jobs themselves). The count is 0 while the job board is off.
function readHiringLabel(jobCount: number) {
  if (jobCount <= 0) return null;
  return `Hiring · ${jobCount} open ${jobCount === 1 ? "job" : "jobs"}`;
}

// A founder's card shows no role: founders are most of the community. Every other role is named.
function readRoleChip(member: DirectoryMember) {
  return member.communityRole === COMMUNITY_ROLES.founder ? null : COMMUNITY_ROLE_LABELS[member.communityRole];
}

const HELP_LINE_LENGTH = 60;

// "Can help with" on an expert's card, cut to one short line; the profile has the rest.
function shortenHelpLine(text: string) {
  return text.length <= HELP_LINE_LENGTH ? text : `${text.slice(0, HELP_LINE_LENGTH).replace(/\s+\S*$/, "")}…`;
}

// Line 2: the company's 16 px logo, or a 16 px square with its first letter, so every company line starts at one x.
function RoleLine({ member }: { member: DirectoryMember }) {
  const { title, company, location, companyLogoUrl } = member;
  const roleLine = toRoleLine({ title, company, location });
  if (!roleLine) return null;
  const mark = company ? (
    companyLogoUrl ? (
      <CompanyLogo url={companyLogoUrl} className="fh-people-co" />
    ) : (
      <span aria-hidden="true" className="fh-people-co fh-people-co-letter">
        {company.trim().charAt(0).toUpperCase()}
      </span>
    )
  ) : null;
  return (
    <>
      {mark}
      {roleLine}
    </>
  );
}

// At most two tags on one line; more shows "+1" as a third.
function RowTags({ labels, children }: { labels: { label: string; tone: "accent" | "sage" }[]; children?: ReactNode }) {
  if (labels.length === 0 && !children) return null;
  const shown = labels.slice(0, MAX_ROW_TAGS);
  const hidden = labels.length - shown.length;
  return (
    <>
      {shown.length > 0 ? (
        <span className="fh-people-tags">
          {shown.map(({ label, tone }) => (
            <Tag key={label} tone={tone}>
              {label}
            </Tag>
          ))}
          {hidden > 0 ? <Tag>{`+${hidden}`}</Tag> : null}
        </span>
      ) : null}
      {children}
    </>
  );
}

function readRowTags(member: DirectoryMember, roleLabel: string | null) {
  const hiringLabel = readHiringLabel(member.hiringJobCount);
  return [
    ...(roleLabel ? [{ label: roleLabel, tone: "accent" as const }] : []),
    ...(hiringLabel ? [{ label: hiringLabel, tone: "sage" as const }] : []),
  ];
}

export function MemberRow({ member }: { member: DirectoryMember }) {
  const { id, name, avatarUrl } = member;
  const tags = readRowTags(member, readRoleChip(member));
  return (
    <ListRow
      face={<Avatar stableId={id} name={name} imageUrl={avatarUrl} sizePx={MEMBER_AVATAR_SIZE_PX} />}
      title={name}
      href={`${ROUTES.people}/${id}`}
      line={<RoleLine member={member} />}
      below={tags.length > 0 ? <RowTags labels={tags} /> : undefined}
    />
  );
}

// "Experts and mentors": the role, a short "can help with", and "Book a call" where the viewer may see the link (at
// the row's right on the web). The whole row opens the profile; Book a call sits above that link, not inside it.
export function ExpertRow({ member }: { member: DirectoryMember }) {
  const { id, name, avatarUrl, canHelpWith, bookingUrl } = member;
  return (
    <ListRow
      data-testid="expert-card"
      data-booking={bookingUrl ? "" : undefined}
      face={<Avatar stableId={id} name={name} imageUrl={avatarUrl} sizePx={MEMBER_AVATAR_SIZE_PX} />}
      title={name}
      href={`${ROUTES.people}/${id}`}
      line={<RoleLine member={member} />}
      below={
        <>
          {canHelpWith ? <p className="fh-people-help wrap-anywhere">{shortenHelpLine(canHelpWith)}</p> : null}
          <RowTags labels={[{ label: COMMUNITY_ROLE_LABELS[member.communityRole], tone: "accent" }]}>
            {bookingUrl ? <BookCallButton memberId={id} memberName={name} bookingUrl={bookingUrl} /> : null}
          </RowTags>
        </>
      }
    />
  );
}

// The words a member typed, looked for outside the member list (People's "Search their networks"): one row under the
// empty state when no member matches, and under the list when some do.
export type ElsewhereOffer = (search: string, place: "empty" | "after") => ReactNode;

function DirectoryEmpty({ filters, onClear, elsewhere }: { filters: DirectoryFilters; onClear: () => void; elsewhere: ReactNode }) {
  if (filters.isExpertsView && !hasDirectoryFilters(filters)) {
    return <EmptyState icon={Search} title="No experts or mentors yet" description="An admin marks who mentors, and they show here." />;
  }
  if (!hasDirectoryFilters(filters)) {
    return <EmptyState icon={Search} title="No members yet" description="Members show here once they accept their invite." />;
  }
  // The networks row ("Search their networks for …") sits under the empty state, as under a list.
  return (
    <>
      <EmptyState
        icon={Search}
        title={filters.search ? `No one matches “${filters.search}”` : "No one matches these filters"}
        description={filters.search ? "Try a name, a company or a skill." : "Try other filters, or clear them."}
      >
        <Button type="button" variant="secondary" size="sm" onClick={onClear}>
          Clear
        </Button>
      </EmptyState>
      {elsewhere}
    </>
  );
}

type FilterKey = "stage" | "sector" | "city" | "cohort";

const FILTER_LABELS: Record<FilterKey, { label: string; any: string }> = {
  stage: { label: "Stage", any: "Any stage" },
  sector: { label: "Sector", any: "Any sector" },
  city: { label: "City", any: "Any city" },
  cohort: { label: "Cohort or fund", any: "Any cohort" },
};

const FILTER_KEYS = Object.keys(FILTER_LABELS) as FilterKey[];

function readExpertRole(value: string): DirectoryFilters["communityRole"] {
  return EXPERT_ROLES.find((role) => role === value) ?? "";
}

const UPDATED_LABELS: Record<number, string> = { 0: "Updated: any time", 30: "Updated: last 30 days", 90: "Updated: last 90 days", 365: "Updated: last 12 months" };

function DirectoryFilterMenus({ filters, options }: { filters: DirectoryFilters; options: Directory["filterOptions"] }) {
  return (
    <div role="group" aria-label="Narrow the list" className="fh-filters">
      {filters.isExpertsView ? (
        <label className="fh-filt">
          <span className="fh-sr">Role</span>
          <Select value={filters.communityRole} onChange={(event) => applyFilters({ ...filters, communityRole: readExpertRole(event.target.value), page: 1 })}>
            <option value="">Any role</option>
            {EXPERT_ROLES.map((role) => (
              <option key={role} value={role}>
                {COMMUNITY_ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </label>
      ) : null}
      {FILTER_KEYS.map((key) => {
        const chosen = options[key].find((value) => value.toLowerCase() === filters[key].toLowerCase()) ?? filters[key];
        const values = chosen && !options[key].includes(chosen) ? [chosen, ...options[key]] : options[key];
        return (
          <label key={key} className="fh-filt">
            <span className="fh-sr">{FILTER_LABELS[key].label}</span>
            <Select value={chosen} onChange={(event) => applyFilters({ ...filters, [key]: event.target.value, page: 1 })}>
              <option value="">{FILTER_LABELS[key].any}</option>
              {values.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </label>
        );
      })}
      {/* Experts' cards show no "fresh as of", and the role filter takes its place in the row. */}
      {filters.isExpertsView ? null : (
        <label className="fh-filt">
          <span className="fh-sr">Fresh as of</span>
          <Select
            value={filters.updatedWithinDays}
            onChange={(event) => applyFilters({ ...filters, updatedWithinDays: readUpdatedWithinDays(event.target.value), page: 1 })}
          >
            {[0, ...UPDATED_WITHIN_DAYS].map((days) => (
              <option key={days} value={days}>
                {UPDATED_LABELS[days]}
              </option>
            ))}
          </Select>
        </label>
      )}
    </div>
  );
}

function readCountLine(count: number, isFiltered: boolean) {
  if (isFiltered) return `${count} ${count === 1 ? "match" : "matches"}`;
  return `${count} ${count === 1 ? "member" : "members"}`;
}

// Commonhall shows everyone on one page; a very large community gets a quiet "Earlier" / "More" pair.
function MoreLinks({ page, pageCount, filters }: { page: number; pageCount: number; filters: DirectoryFilters }) {
  if (pageCount <= 1) return null;
  return (
    <nav aria-label="Member pages" className="fh-btn-row mt-3.5">
      {page > 1 ? (
        <Button type="button" variant="quiet" size="sm" onClick={() => goToPage(page - 1, filters)}>
          Earlier
        </Button>
      ) : null}
      {page < pageCount ? (
        <Button type="button" variant="quiet" size="sm" onClick={() => goToPage(page + 1, filters)}>
          More
        </Button>
      ) : null}
    </nav>
  );
}

// Where the filter panel opens: a bottom sheet on a phone, in place on the web, and in place inside the landing
// page's tour too (its screens live in a shadow root, which a sheet's portal would leave).
type FilterPanelPlace = "sheet" | "inline";
const NARROW_QUERY = "(max-width: 999.98px)";

function readFilterPanelPlace(trigger: HTMLElement | null): FilterPanelPlace {
  const isInPage = trigger?.getRootNode() === document;
  return isInPage && window.matchMedia(NARROW_QUERY).matches ? "sheet" : "inline";
}

function readShowLabel(count: number) {
  return `Show ${count} ${count === 1 ? "person" : "people"}`;
}

// The panel's end, as Airbnb's: "Clear all" (an underlined text button) and "Show N people". Filters apply as they
// change (as before), so "Show N people" closes the panel on the list they already give.
function FilterPanelFoot({ filters, matchCount, onClose }: { filters: DirectoryFilters; matchCount: number; onClose: () => void }) {
  return (
    <>
      <button type="button" className="fh-people-clear-all" onClick={() => clearPanelFilters(filters)}>
        Clear all
      </button>
      <Button type="button" variant="primary" className="fh-people-show" onClick={onClose}>
        {readShowLabel(matchCount)}
      </Button>
    </>
  );
}

type FilterPanelProps = { place: FilterPanelPlace; filters: DirectoryFilters; options: Directory["filterOptions"]; matchCount: number; onClose: () => void };

function FilterPanel({ place, filters, options, matchCount, onClose }: FilterPanelProps) {
  const foot = <FilterPanelFoot filters={filters} matchCount={matchCount} onClose={onClose} />;
  if (place === "sheet") {
    return (
      <Sheet isOpen onClose={onClose} title="Filters" footer={foot} className="fh-people-filter-sheet">
        <div id={FILTERS_ID} data-slot="people-filters">
          <DirectoryFilterMenus filters={filters} options={options} />
        </div>
      </Sheet>
    );
  }
  return (
    <div id={FILTERS_ID} data-slot="people-filters" className="fh-people-panel">
      <DirectoryFilterMenus filters={filters} options={options} />
      <div className="fh-people-panel-foot">{foot}</div>
    </div>
  );
}

type DirectoryResultsProps = {
  filters: DirectoryFilters;
  onClear: () => void;
  isStale: boolean;
  filterPlace: FilterPanelPlace | null;
  onFilterClose: () => void;
  isEmptyQuiet: boolean;
  elsewhere?: ElsewhereOffer;
};

function DirectoryResults({ filters, onClear, isStale, filterPlace, onFilterClose, isEmptyQuiet, elsewhere }: DirectoryResultsProps) {
  const { data: directory } = useSuspenseQuery(directoryQuery(filters));
  const { members, matchCount, page, pageCount, filterOptions } = directory;
  const isFiltered = hasDirectoryFilters(filters);
  return (
    <>
      {filterPlace ? <FilterPanel place={filterPlace} filters={filters} options={filterOptions} matchCount={matchCount} onClose={onFilterClose} /> : null}
      <div id={RESULTS_ID} tabIndex={-1} aria-busy={isStale} className={cn("outline-none", isStale && "opacity-60")}>
        {members.length === 0 && isEmptyQuiet ? (
          <p role="status" className="fh-people-count">
            No member matches.
          </p>
        ) : null}
        {members.length === 0 && !isEmptyQuiet ? <DirectoryEmpty filters={filters} onClear={onClear} elsewhere={filters.search && elsewhere ? elsewhere(filters.search, "empty") : null} /> : null}
        {members.length > 0 ? (
          <>
            <p role="status" className="fh-people-count">
              {readCountLine(matchCount, isFiltered)}
            </p>
            <div data-slot="people-list" className="fh-people-list">
              {members.map((member) => (filters.isExpertsView ? <ExpertRow key={member.id} member={member} /> : <MemberRow key={member.id} member={member} />))}
            </div>
          </>
        ) : null}
      </div>
      <MoreLinks page={page} pageCount={pageCount} filters={filters} />
      {members.length > 0 && filters.search && elsewhere ? elsewhere(filters.search, "after") : null}
    </>
  );
}

// Everyone, or the people founders most want to talk to: one-tap chips (round 8; before, the panel's view switch and
// the "Mentors and experts" link). The role filter belongs to the second view only.
const DIRECTORY_VIEWS = [
  { isExperts: false, label: "Everyone", slot: "people-view-everyone" },
  { isExperts: true, label: "Mentors and experts", slot: "people-view-link" },
] as const;

function DirectoryViewChips({ isExpertsView }: { isExpertsView: boolean }) {
  return (
    <ChipRow role="group" aria-label="Who to list" className="fh-people-chips">
      {DIRECTORY_VIEWS.map(({ isExperts, label, slot }) => (
        <Chip key={label} isPressed={isExpertsView === isExperts} data-slot={slot} onClick={() => switchView(isExperts)}>
          {label}
        </Chip>
      ))}
    </ChipRow>
  );
}

// How many of the panel's filters are set: the count pill on Filter. The view has its own chips, so it isn't counted.
function countFilters(filters: DirectoryFilters) {
  const { stage, sector, city, cohort, updatedWithinDays, hiring, communityRole, tag } = filters;
  return [stage, sector, city, cohort, updatedWithinDays, hiring, communityRole, tag].filter(Boolean).length;
}

type MemberDirectoryProps = {
  // Results found elsewhere for the same words (People's network search, once asked for): between the chips and the
  // members.
  between?: ReactNode;
  // Looking for the typed words elsewhere (People's "Search their networks"): see ElsewhereOffer.
  elsewhere?: ElsewhereOffer;
  placeholder?: string;
  // While other results show above (People's network search), no member matching is one quiet line, not a box.
  isEmptyQuiet?: boolean;
};

type FilterButtonProps = { count: number; isOpen: boolean; buttonRef: RefObject<HTMLButtonElement | null>; onToggle: () => void };

// Filter: a 44×44 icon on a phone (its name stays "Filter"), the icon and "Filter" on the web; a count pill in the
// community's colour at its top right while filters are on.
function FilterButton({ count, isOpen, buttonRef, onToggle }: FilterButtonProps) {
  return (
    <Button ref={buttonRef} type="button" variant="secondary" className="fh-people-filter" aria-expanded={isOpen} aria-controls={FILTERS_ID} onClick={onToggle}>
      <SlidersHorizontal aria-hidden="true" />
      <span className="fh-people-filter-label">Filter</span>
      {count ? (
        <>
          <span aria-hidden="true" className="fh-people-filter-count">
            {count}
          </span>
          <span className="fh-sr">{`, ${count} on`}</span>
        </>
      ) : null}
    </Button>
  );
}

export function MemberDirectory({ between, elsewhere, placeholder = "Name, company or skill", isEmptyQuiet = false }: MemberDirectoryProps) {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const deferredQueryString = useDeferredValue(queryString);
  const filters = parseDirectoryFilters(Object.fromEntries(searchParams));
  const deferredFilters = parseDirectoryFilters(Object.fromEntries(new URLSearchParams(deferredQueryString)));
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [filterPlace, setFilterPlace] = useState<FilterPanelPlace | null>(null);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div className="fh-people-page">
      <div role="search" className="fh-people-search">
        <SearchBox
          id={SEARCH_INPUT_ID}
          className="min-w-0 flex-1"
          value={searchDraft}
          maxLength={PROFILE_LIMITS.search}
          placeholder={placeholder}
          aria-label="Search people"
          autoComplete="off"
          onChange={(event) => {
            setSearchDraft(event.target.value);
            scheduleSearch(event.target.value, filters);
          }}
        />
        <FilterButton
          count={countFilters(filters)}
          isOpen={filterPlace !== null}
          buttonRef={filterButtonRef}
          onToggle={() => setFilterPlace(filterPlace ? null : readFilterPanelPlace(filterButtonRef.current))}
        />
      </div>
      <DirectoryViewChips isExpertsView={filters.isExpertsView} />
      {between}
      <QueryBoundary loadingMessage="Gathering everyone…">
        <DirectoryResults
          filters={deferredFilters}
          onClear={() => clearFilters(setSearchDraft, filters.isExpertsView)}
          isStale={queryString !== deferredQueryString}
          filterPlace={filterPlace}
          onFilterClose={() => setFilterPlace(null)}
          isEmptyQuiet={isEmptyQuiet}
          elsewhere={elsewhere}
        />
      </QueryBoundary>
    </div>
  );
}
