"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Waypoints } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { QueryBoundary } from "@/components/query-boundary";
import { useIsInBrowser } from "@/components/use-is-in-browser";
import { Button } from "@/components/ui/button";
import { Chip, ChipRow } from "@/components/ui/chip";
import { MemberDirectory, openExpertsView, SEARCH_INPUT_ID } from "@/modules/members/components/member-directory";
import { NetworkFailure } from "@/modules/network/components/network-failure";
import { SearchResults } from "@/modules/network/components/search-results";
import { NETWORK_STEP_PARAM, toNetworkSearchHref } from "@/modules/network/components/search-links";
import type { SearchScreenProps } from "@/modules/network/components/search-types";
import { SearchWaiting } from "@/modules/network/components/search-waiting";
import { SEARCH_PROMPT_MAX_LENGTH, SEARCH_PROMPT_PARAM, SEARCH_SCOPE_PARAM, SEARCH_WHERE, type SearchWhere } from "@/modules/network/contract";
import { activeSearchQuery, type ActiveSearch } from "@/modules/network/queries";
import { ROUTES } from "@/platform/http/routes";

// People (round 6, SPEC "The member tab set"): one box finds members as you type, with no Village search spent.
// "Search their networks" is a separate step: it searches the people members know only when the member asks for it.
// The old guided ask's four choices are the chips "Who are you looking for?", while Intros is on.

// The guided ask's choices. "An expert" lists the community's experts and mentors; the others are usually outside
// the community, so they suggest what to type for "Search their networks".
const NEEDS = [
  { key: "customer", label: "A customer", example: "Head of procurement at a US hospital" },
  { key: "hire", label: "A hire", example: "a VP Sales who has sold to finance teams" },
  { key: "investor", label: "An investor", example: "seed investors in climate" },
  { key: "expert", label: "An expert", example: "a former CFO" },
] as const;

type NeedKey = (typeof NEEDS)[number]["key"];

// What the network step can do for this member: search, ask them to connect their own network first, or nothing
// (Network off, or Village not set up).
export type NetworkStep = { state: "ready"; search: SearchScreenProps } | { state: "connect" } | null;

type PeopleScreenProps = { canAskIntro: boolean; network: NetworkStep };

function readScope(value: string | null, fallback: SearchWhere): SearchWhere {
  return value === SEARCH_WHERE.global || value === SEARCH_WHERE.network ? value : fallback;
}

function focusSearchBox() {
  document.getElementById(SEARCH_INPUT_ID)?.focus();
}

function NeedChips({ chosen, onChoose }: { chosen: NeedKey | null; onChoose: (need: NeedKey) => void }) {
  return (
    <div className="mt-3.5" data-slot="people-needs">
      <p id="people-needs-label" className="fh-small fh-muted mb-1.5">
        Who are you looking for?
      </p>
      <ChipRow role="group" aria-labelledby="people-needs-label">
        {NEEDS.map(({ key, label }) => (
          <Chip key={key} isPressed={chosen === key} onClick={() => onChoose(key)}>
            {label}
          </Chip>
        ))}
      </ChipRow>
    </div>
  );
}

function ConnectLine() {
  return (
    <p className="fh-small fh-muted mt-3.5" data-slot="people-connect">
      <Waypoints aria-hidden="true" className="fh-i fh-xs mr-1 inline align-[-2px]" strokeWidth={1.5} />
      <Link href={ROUTES.myNetwork}>Connect your network</Link> to search who members know.
    </p>
  );
}

// "Search their networks": the button, then the results while the address asks for them.
function NetworkStepResults({ search }: { search: SearchScreenProps }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isInBrowser = useIsInBrowser();
  const query = (searchParams.get(SEARCH_PROMPT_PARAM) ?? "").trim().slice(0, SEARCH_PROMPT_MAX_LENGTH);
  const scope = readScope(searchParams.get(SEARCH_SCOPE_PARAM), search.defaultScope);
  const isAsked = searchParams.get(NETWORK_STEP_PARAM) === "1" && query !== "";

  const searchNetworks = () => {
    const words = ((document.getElementById(SEARCH_INPUT_ID) as HTMLInputElement | null)?.value ?? query).trim().slice(0, SEARCH_PROMPT_MAX_LENGTH);
    if (!words) {
      focusSearchBox();
      return;
    }
    const active: ActiveSearch = { prompt: words, scope: search.defaultScope, startedAtMs: Date.now(), wasSeen: false };
    queryClient.setQueryData(activeSearchQuery.queryKey, active);
    router.push(toNetworkSearchHref(words, search.defaultScope));
  };

  return (
    <section aria-label="Their networks" data-slot="people-network" className="mt-3.5">
      {isAsked ? null : (
        <Button type="button" variant="secondary" size="sm" onClick={searchNetworks}>
          <Waypoints aria-hidden="true" />
          Search their networks
        </Button>
      )}
      {isAsked && isInBrowser ? (
        <QueryBoundary key={`${query}-${scope}`} loadingMessage="Searching…" failure={NetworkFailure} fallback={<SearchWaiting prompt={query} sharingMemberCount={search.sharingMemberCount} />}>
          <SearchResults {...search} query={query} scope={scope} />
        </QueryBoundary>
      ) : null}
    </section>
  );
}

export function PeopleScreen({ canAskIntro, network }: PeopleScreenProps) {
  const [need, setNeed] = useState<NeedKey | null>(null);
  const chosen = NEEDS.find(({ key }) => key === need);
  const choose = (key: NeedKey) => {
    setNeed(key);
    if (key === "expert") openExpertsView();
    focusSearchBox();
  };
  const between = (
    <>
      {canAskIntro ? <NeedChips chosen={need} onChoose={choose} /> : null}
      {network?.state === "ready" ? <NetworkStepResults search={network.search} /> : null}
      {network?.state === "connect" ? <ConnectLine /> : null}
    </>
  );
  return <MemberDirectory between={between} placeholder={chosen ? `e.g. ${chosen.example}` : undefined} />;
}
