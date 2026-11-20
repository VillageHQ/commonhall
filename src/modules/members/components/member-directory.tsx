"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GraduationCap, SlidersHorizontal } from "lucide-react";
import { useDeferredValue, useState, type ReactNode } from "react";

import { EmptyState } from "@/components/empty-state";
import { QueryBoundary } from "@/components/query-boundary";
import { CompanyLogo } from "@/components/company-name";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SearchBox } from "@/components/ui/search-box";
import { Select } from "@/components/ui/select";
import { Tag } from "@/components/ui/tag";
import { EMPTY_DIRECTORY_FILTERS, hasDirectoryFilters, parseDirectoryFilters, readUpdatedWithinDays, toDirectoryQueryString } from "@/modules/members/rules-directory-url";
import { PROFILE_LIMITS, UPDATED_WITHIN_DAYS, type Directory, type DirectoryFilters, type DirectoryMember } from "@/modules/members/contract-profile";
import { toRoleLine } from "@/modules/members/rules-words";
import { ROUTES } from "@/platform/http/routes";

import { directoryQuery } from "@/modules/members/queries-directory";
import { COMMUNITY_ROLE_LABELS, COMMUNITY_ROLES, EXPERT_ROLES } from "@/modules/members/contract-community-roles";
import { BookCallButton } from "@/modules/members/components/book-call-button";

// People's member search (round 6, SPEC "People"): one search box with "Filter" beside it (the view switch and the
// selects fold behind it), the count, then two columns of ruled rows, 30 to a page. A row is one link to the
// profile: photo, serif name, logo + "Role, Company · City", and at most a role and a hiring chip (15 words at most).

const SEARCH_DEBOUNCE_MS = 250;
const MEMBER_AVATAR_SIZE_PX = 36;
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

export function MemberRow({ member }: { member: DirectoryMember }) {
  const { id, name, title, company, location, companyLogoUrl, avatarUrl } = member;
  const hiringLabel = readHiringLabel(member.hiringJobCount);
  const roleLine = toRoleLine({ title, company, location });
  const roleChip = readRoleChip(member);
  return (
    <Link href={`${ROUTES.people}/${id}`} className="fh-mcard">
      <Avatar stableId={id} name={name} imageUrl={avatarUrl} sizePx={MEMBER_AVATAR_SIZE_PX} />
      <div className="fh-who min-w-0">
        <b>{name}</b>
        <span className="wrap-anywhere">
          {company ? <CompanyLogo url={companyLogoUrl} className="fh-colog mt-0" /> : null}
          {roleLine || " "}
        </span>
      </div>
      {roleChip || hiringLabel ? (
        <div className="fh-meta">
          {roleChip ? <Tag tone="accent">{roleChip}</Tag> : null}
          {hiringLabel ? <Tag tone="sage">{hiringLabel}</Tag> : null}
        </div>
      ) : null}
    </Link>
  );
}

// "Experts and mentors": the role, a short "can help with", and "Book a call" where the viewer may see the link.
// The card isn't one link here, since it holds a second action: the name opens the profile.
export function ExpertRow({ member }: { member: DirectoryMember }) {
  const { id, name, title, company, location, companyLogoUrl, avatarUrl, canHelpWith, bookingUrl } = member;
  const roleLine = toRoleLine({ title, company, location });
  return (
    <div className="fh-mcard" data-testid="expert-card">
      <Avatar stableId={id} name={name} imageUrl={avatarUrl} sizePx={MEMBER_AVATAR_SIZE_PX} />
      <div className="fh-who min-w-0">
        <b>
          <Link href={`${ROUTES.people}/${id}`}>{name}</Link>
        </b>
        <span className="wrap-anywhere">
          {company ? <CompanyLogo url={companyLogoUrl} className="fh-colog mt-0" /> : null}
          {roleLine || " "}
        </span>
      </div>
      {canHelpWith ? <p className="fh-wo wrap-anywhere">{shortenHelpLine(canHelpWith)}</p> : null}
      <div className="fh-meta">
        <Tag tone="accent">{COMMUNITY_ROLE_LABELS[member.communityRole]}</Tag>
        {bookingUrl ? <BookCallButton memberId={id} memberName={name} bookingUrl={bookingUrl} /> : null}
      </div>
    </div>
  );
}

// The words a member typed, looked for outside the member list (People's "Search their networks"): as the empty
// state's main action when no member matches, and as one line under the list when some do.
export type ElsewhereOffer = (search: string, place: "empty" | "after") => ReactNode;

function DirectoryEmpty({ filters, onClear, elsewhere }: { filters: DirectoryFilters; onClear: () => void; elsewhere: ReactNode }) {
  if (filters.isExpertsView && !hasDirectoryFilters(filters)) {
    return <EmptyState title="No experts or mentors yet" description="An admin marks who mentors, and they show here." />;
  }
  if (!hasDirectoryFilters(filters)) {
    return <EmptyState title="No members yet" description="Members show here once they accept their invite." />;
  }
  return (
    <EmptyState title="No member matches" description={elsewhere ? "Nobody in the community matches those words." : "Try other words, or clear the filters."}>
      {elsewhere}
      <Button type="button" variant={elsewhere ? "quiet" : "secondary"} size="sm" onClick={onClear}>
        Clear
      </Button>
    </EmptyState>
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

type DirectoryResultsProps = { filters: DirectoryFilters; onClear: () => void; isStale: boolean; isFilterOpen: boolean; isEmptyQuiet: boolean; elsewhere?: ElsewhereOffer };

function DirectoryResults({ filters, onClear, isStale, isFilterOpen, isEmptyQuiet, elsewhere }: DirectoryResultsProps) {
  const { data: directory } = useSuspenseQuery(directoryQuery(filters));
  const { members, matchCount, page, pageCount, filterOptions } = directory;
  const isFiltered = hasDirectoryFilters(filters);
  return (
    <>
      {isFilterOpen ? (
        <div id={FILTERS_ID} data-slot="people-filters" className="mt-3">
          <DirectoryViewSwitch filters={filters} />
          <DirectoryFilterMenus filters={filters} options={filterOptions} />
        </div>
      ) : null}
      <div id={RESULTS_ID} tabIndex={-1} aria-busy={isStale} className={cn("outline-none", isStale && "opacity-60")}>
        {members.length === 0 && isEmptyQuiet ? (
          <p role="status" className="fh-small fh-muted mt-3.5">
            No member matches.
          </p>
        ) : null}
        {members.length === 0 && !isEmptyQuiet ? (
          <div className="mt-4">
            <DirectoryEmpty filters={filters} onClear={onClear} elsewhere={filters.search && elsewhere ? elsewhere(filters.search, "empty") : null} />
          </div>
        ) : null}
        {members.length > 0 ? (
          <>
            <p role="status" className="fh-small fh-muted mt-3.5 mb-1">
              {readCountLine(matchCount, isFiltered)}
            </p>
            <div className="fh-cards">
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

// Everyone, or the people founders most want to talk to. The role filter belongs to the second view only.
const DIRECTORY_VIEWS = [
  { isExperts: false, label: "Everyone" },
  { isExperts: true, label: "Experts and mentors" },
] as const;

function DirectoryViewSwitch({ filters }: { filters: DirectoryFilters }) {
  return (
    <div className="fh-seg mb-3" role="group" aria-label="Who to list">
      {DIRECTORY_VIEWS.map(({ isExperts, label }) => (
        <button
          key={label}
          type="button"
          aria-pressed={filters.isExpertsView === isExperts}
          onClick={() => applyFilters({ ...filters, isExpertsView: isExperts, communityRole: "", updatedWithinDays: 0, page: 1 })}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// How many filters are set, the experts view counting as one: "Filter · 2" on the button.
function countFilters(filters: DirectoryFilters) {
  const { stage, sector, city, cohort, updatedWithinDays, hiring, communityRole, tag, isExpertsView } = filters;
  return [stage, sector, city, cohort, updatedWithinDays, hiring, communityRole, tag, isExpertsView].filter(Boolean).length;
}

type MemberDirectoryProps = {
  // Results found elsewhere for the same words (People's network search, once asked for): between the box and the
  // members.
  between?: ReactNode;
  // Looking for the typed words elsewhere (People's "Search their networks"): see ElsewhereOffer.
  elsewhere?: ElsewhereOffer;
  placeholder?: string;
  // While other results show above (People's network search), no member matching is one quiet line, not a box.
  isEmptyQuiet?: boolean;
};

// "Mentors and experts" under the box (round 7: the only shortcut above the list); "Everyone" while that view shows.
function ViewLink({ isExpertsView }: { isExpertsView: boolean }) {
  return (
    <button type="button" className="fh-linkbtn mt-1.5" data-slot="people-view-link" onClick={() => switchView(!isExpertsView)}>
      <GraduationCap aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
      {isExpertsView ? "Everyone" : "Mentors and experts"}
    </button>
  );
}

export function MemberDirectory({ between, elsewhere, placeholder = "Name, company or skill", isEmptyQuiet = false }: MemberDirectoryProps) {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const deferredQueryString = useDeferredValue(queryString);
  const filters = parseDirectoryFilters(Object.fromEntries(searchParams));
  const deferredFilters = parseDirectoryFilters(Object.fromEntries(new URLSearchParams(deferredQueryString)));
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterCount = countFilters(filters);

  return (
    <>
      <div role="search" className="flex items-center gap-2">
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
        <Button type="button" variant="secondary" aria-expanded={isFilterOpen} aria-controls={FILTERS_ID} onClick={() => setIsFilterOpen(!isFilterOpen)}>
          <SlidersHorizontal aria-hidden="true" />
          {filterCount ? `Filter · ${filterCount}` : "Filter"}
        </Button>
      </div>
      <ViewLink isExpertsView={filters.isExpertsView} />
      {between}
      <QueryBoundary loadingMessage="Gathering everyone…">
        <DirectoryResults
          filters={deferredFilters}
          onClear={() => clearFilters(setSearchDraft, filters.isExpertsView)}
          isStale={queryString !== deferredQueryString}
          isFilterOpen={isFilterOpen}
          isEmptyQuiet={isEmptyQuiet}
          elsewhere={elsewhere}
        />
      </QueryBoundary>
    </>
  );
}
