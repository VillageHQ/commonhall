"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Waypoints } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { QueryBoundary } from "@/components/query-boundary";
import { useIsInBrowser } from "@/components/use-is-in-browser";
import { Button } from "@/components/ui/button";
import { cancelPendingSearch, MemberDirectory, type ElsewhereOffer } from "@/modules/members/components/member-directory";
import { NetworkFailure } from "@/modules/network/components/network-failure";
import { SearchResults } from "@/modules/network/components/search-results";
import { NETWORK_STEP_PARAM, toNetworkSearchHref } from "@/modules/network/components/search-links";
import type { SearchScreenProps } from "@/modules/network/components/search-types";
import { SearchWaiting } from "@/modules/network/components/search-waiting";
import { SEARCH_PROMPT_MAX_LENGTH, SEARCH_PROMPT_PARAM, SEARCH_SCOPE_PARAM, SEARCH_WHERE, type SearchWhere } from "@/modules/network/contract";
import { activeSearchQuery, type ActiveSearch } from "@/modules/network/queries";
import { ROUTES } from "@/platform/http/routes";

// People (round 7, less-choice Part 2): one box finds members as you type (any word), with no Village search spent.
// The network search runs only when the member asks for it: one tap under the list, or the empty state's main action
// when no member matches, with the words already in. Above the list: the box, Filter and "Mentors and experts".

// What the network step can do for this member: search, ask them to connect their own network first, or nothing
// (Network off, or Village not set up).
export type NetworkStep = { state: "ready"; search: SearchScreenProps } | { state: "connect" } | null;

type PeopleScreenProps = { network: NetworkStep };
type OfferPlace = Parameters<ElsewhereOffer>[1];

function readScope(value: string | null, fallback: SearchWhere): SearchWhere {
  return value === SEARCH_WHERE.global || value === SEARCH_WHERE.network ? value : fallback;
}

function readQuery(searchParams: Pick<URLSearchParams, "get">) {
  return (searchParams.get(SEARCH_PROMPT_PARAM) ?? "").trim().slice(0, SEARCH_PROMPT_MAX_LENGTH);
}

function ConnectOffer({ place }: { place: OfferPlace }) {
  if (place === "empty") {
    return (
      <Link className="fh-btn fh-btn-secondary fh-btn-sm" href={ROUTES.myNetwork} data-slot="people-connect">
        <Waypoints aria-hidden="true" />
        Connect your network
      </Link>
    );
  }
  return (
    <p className="fh-small fh-muted mt-3.5" data-slot="people-connect">
      <Waypoints aria-hidden="true" className="fh-i fh-xs mr-1 inline align-[-2px]" strokeWidth={1.5} />
      <Link href={ROUTES.myNetwork}>Connect your network</Link> to search who members know.
    </p>
  );
}

// "Search their networks for “fintech investor”": one tap, the words already in.
function NetworkOffer({ search, words, place }: { search: SearchScreenProps; words: string; place: OfferPlace }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  // Already searched for these words: the results show above.
  if (searchParams.get(NETWORK_STEP_PARAM) === "1" && readQuery(searchParams) === words) return null;
  const label = `Search their networks for “${words}”`;

  const searchNetworks = () => {
    cancelPendingSearch();
    const active: ActiveSearch = { prompt: words, scope: search.defaultScope, startedAtMs: Date.now(), wasSeen: false };
    queryClient.setQueryData(activeSearchQuery.queryKey, active);
    router.push(toNetworkSearchHref(words, search.defaultScope));
  };

  if (place === "empty") {
    return (
      <Button type="button" variant="primary" size="sm" className="wrap-anywhere" onClick={searchNetworks} data-slot="people-network-offer">
        <Waypoints aria-hidden="true" />
        {label}
      </Button>
    );
  }
  return (
    <p className="fh-small fh-muted mt-3.5" data-slot="people-network-offer">
      Not who you need?{" "}
      <button type="button" className="fh-linkbtn wrap-anywhere text-left" onClick={searchNetworks}>
        <Waypoints aria-hidden="true" className="fh-i fh-xs shrink-0" strokeWidth={1.5} />
        {label}
      </button>
    </p>
  );
}

// The network results, while the address asks for them.
function NetworkStepResults({ search }: { search: SearchScreenProps }) {
  const searchParams = useSearchParams();
  const isInBrowser = useIsInBrowser();
  const query = readQuery(searchParams);
  const scope = readScope(searchParams.get(SEARCH_SCOPE_PARAM), search.defaultScope);
  const isAsked = searchParams.get(NETWORK_STEP_PARAM) === "1" && query !== "";
  if (!isAsked || !isInBrowser) return null;
  return (
    <section aria-label="Their networks" data-slot="people-network" className="mt-3.5">
      <QueryBoundary key={`${query}-${scope}`} loadingMessage="Searching…" failure={NetworkFailure} fallback={<SearchWaiting prompt={query} sharingMemberCount={search.sharingMemberCount} />}>
        <SearchResults {...search} query={query} scope={scope} />
      </QueryBoundary>
    </section>
  );
}

function readElsewhere(network: NetworkStep): ElsewhereOffer | undefined {
  if (network?.state === "ready") {
    const { search } = network;
    return function offerNetworkSearch(words, place) {
      return <NetworkOffer search={search} words={words.trim().slice(0, SEARCH_PROMPT_MAX_LENGTH)} place={place} />;
    };
  }
  if (network?.state === "connect") {
    return function offerConnecting(_words, place) {
      return <ConnectOffer place={place} />;
    };
  }
  return undefined;
}

export function PeopleScreen({ network }: PeopleScreenProps) {
  const isNetworkAsked = useSearchParams().get(NETWORK_STEP_PARAM) === "1";
  return (
    <MemberDirectory
      between={network?.state === "ready" ? <NetworkStepResults search={network.search} /> : null}
      elsewhere={readElsewhere(network)}
      isEmptyQuiet={isNetworkAsked && network?.state === "ready"}
    />
  );
}
