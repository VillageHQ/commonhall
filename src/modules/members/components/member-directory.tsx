"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { cn } from "cn";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDeferredValue, useState } from "react";

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
import { formatDayMonth } from "@/platform/text/format-date";

import { directoryQuery } from "@/modules/members/queries-directory";
import { COMMUNITY_ROLE_LABELS, COMMUNITY_ROLES, EXPERT_ROLES } from "@/modules/members/contract-community-roles";
import { BookCallButton } from "@/modules/members/components/book-call-button";

// Commonhall's directory (member-directory-populated): one search box, five selects, the count, then two columns of
// ruled rows. A row is one link to the profile: photo, serif name, logo + "Role, Company · City", the "working on"
// line, square chips and "fresh as of".

const SEARCH_DEBOUNCE_MS = 250;
const MEMBER_AVATAR_SIZE_PX = 36;
const RESULTS_ID = "member-results";
const SEARCH_INPUT_ID = "member-search";

let pendingSearch: ReturnType<typeof setTimeout> | undefined;

function applyFilters(filters: DirectoryFilters) {
  window.history.replaceState(null, "", `${ROUTES.members}${toDirectoryQueryString(filters)}`);
}

function scheduleSearch(search: string, filters: DirectoryFilters) {
  clearTimeout(pendingSearch);
  pendingSearch = setTimeout(() => {
    if (window.location.pathname === ROUTES.members) applyFilters({ ...filters, search, page: 1 });
  }, SEARCH_DEBOUNCE_MS);
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

export function MemberRow({ member }: { member: DirectoryMember }) {
  const { id, name, title, company, location, companyLogoUrl, bio, avatarUrl, freshAt } = member;
  const hiringLabel = readHiringLabel(member.hiringJobCount);
  const roleLine = toRoleLine({ title, company, location });
  const chips = [member.stage, member.sector, member.cohort].filter((chip): chip is string => Boolean(chip));
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
      {bio ? <p className="fh-wo wrap-anywhere">{bio}</p> : null}
      <div className="fh-meta">
        {roleChip ? <Tag tone="accent">{roleChip}</Tag> : null}
        {chips.map((chip) => (
          <Tag key={chip}>{chip}</Tag>
        ))}
        {hiringLabel ? <Tag tone="sage">{hiringLabel}</Tag> : null}
        <span className="fh-fresh">fresh as of {formatDayMonth(freshAt)}</span>
      </div>
    </Link>
  );
}

// "Experts and mentors": the role, what they can help with, and "Book a call" where the viewer may see the link.
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
      {canHelpWith ? (
        <p className="fh-wo wrap-anywhere">
          <span className="fh-muted">Can help with: </span>
          {canHelpWith}
        </p>
      ) : null}
      <div className="fh-meta">
        <Tag tone="accent">{COMMUNITY_ROLE_LABELS[member.communityRole]}</Tag>
        {bookingUrl ? <BookCallButton memberId={id} memberName={name} bookingUrl={bookingUrl} /> : null}
      </div>
    </div>
  );
}

function DirectoryEmpty({ filters, onClear }: { filters: DirectoryFilters; onClear: () => void }) {
  if (filters.isExpertsView && !hasDirectoryFilters(filters)) {
    return <EmptyState title="No experts or mentors yet" description="An admin marks members as mentors, experts, advisors or entrepreneurs in residence, and they show here." />;
  }
  if (!hasDirectoryFilters(filters)) {
    return <EmptyState title="No members in the directory yet" description="Members show here once they accept their invite." />;
  }
  return (
    <EmptyState title="No member matches" description="Try a company, a city or a skill, or clear the filters.">
      <Button type="button" variant="secondary" size="sm" onClick={onClear}>
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

type DirectoryResultsProps = { filters: DirectoryFilters; onClear: () => void; isStale: boolean };

function DirectoryResults({ filters, onClear, isStale }: DirectoryResultsProps) {
  const { data: directory } = useSuspenseQuery(directoryQuery(filters));
  const { members, matchCount, page, pageCount, filterOptions } = directory;
  const isFiltered = hasDirectoryFilters(filters);
  return (
    <>
      <DirectoryFilterMenus filters={filters} options={filterOptions} />
      <div id={RESULTS_ID} tabIndex={-1} aria-busy={isStale} className={cn("outline-none", isStale && "opacity-60")}>
        {members.length === 0 ? (
          <div className="mt-4">
            <DirectoryEmpty filters={filters} onClear={onClear} />
          </div>
        ) : (
          <>
            <p role="status" className="fh-small fh-muted mt-3.5 mb-1">
              {readCountLine(matchCount, isFiltered)}
            </p>
            <div className="fh-cards">
              {members.map((member) => (filters.isExpertsView ? <ExpertRow key={member.id} member={member} /> : <MemberRow key={member.id} member={member} />))}
            </div>
          </>
        )}
      </div>
      <MoreLinks page={page} pageCount={pageCount} filters={filters} />
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
          onClick={() => applyFilters({ ...filters, isExpertsView: isExperts, communityRole: "", page: 1 })}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function MemberDirectory() {
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const deferredQueryString = useDeferredValue(queryString);
  const filters = parseDirectoryFilters(Object.fromEntries(searchParams));
  const deferredFilters = parseDirectoryFilters(Object.fromEntries(new URLSearchParams(deferredQueryString)));
  const [searchDraft, setSearchDraft] = useState(filters.search);

  return (
    <>
      <DirectoryViewSwitch filters={filters} />
      <div role="search">
        <SearchBox
          id={SEARCH_INPUT_ID}
          value={searchDraft}
          maxLength={PROFILE_LIMITS.search}
          placeholder="Name, company or skill"
          aria-label="Search the directory"
          autoComplete="off"
          onChange={(event) => {
            setSearchDraft(event.target.value);
            scheduleSearch(event.target.value, filters);
          }}
        />
      </div>
      <QueryBoundary loadingMessage="Gathering everyone…">
        <DirectoryResults filters={deferredFilters} onClear={() => clearFilters(setSearchDraft, filters.isExpertsView)} isStale={queryString !== deferredQueryString} />
      </QueryBoundary>
    </>
  );
}
