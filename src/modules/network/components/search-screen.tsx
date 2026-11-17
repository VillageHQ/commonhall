"use client";

import { useQueryClient } from "@tanstack/react-query";
import { KeyRound, Waypoints } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { QueryBoundary } from "@/components/query-boundary";
import { useIsInBrowser } from "@/components/use-is-in-browser";
import { ExampleChips } from "@/components/ui/chip";
import { FhIcon } from "@/components/ui/fh-icon";
import { Note } from "@/components/ui/note";
import { SearchBox, StripLine } from "@/components/ui/search-box";
import { SegmentedControl } from "@/components/ui/segmented";
import { ROUTES } from "@/platform/http/routes";
import { SEARCH_PROMPT_MAX_LENGTH, SEARCH_PROMPT_PARAM, SEARCH_SCOPE_PARAM, SEARCH_WHERE, type SearchWhere } from "@/modules/network/contract";
import { activeSearchQuery, type ActiveSearch } from "@/modules/network/queries";

import { NetworkFailure } from "./network-failure";
import { SearchResults } from "./search-results";
import type { SearchScreenProps } from "./search-types";

export type { SearchScreenProps } from "./search-types";
import { SearchWaiting } from "./search-waiting";

const EXAMPLES = ["Head of procurement at a US hospital", "someone at Halcyon Health", "seed investors in climate", "a former CFO"];
const SCOPE_SEGMENTS = [
  { value: SEARCH_WHERE.network, label: "In our network" },
  { value: SEARCH_WHERE.global, label: "Everywhere" },
] as const;
const QUERY_FIELD = "q";


export function toSearchHref(query: string, scope: SearchWhere) {
  return `${ROUTES.network}?${new URLSearchParams({ [SEARCH_PROMPT_PARAM]: query, [SEARCH_SCOPE_PARAM]: scope }).toString()}`;
}

function readScope(value: string | null, fallback: SearchWhere): SearchWhere {
  return value === SEARCH_WHERE.global || value === SEARCH_WHERE.network ? value : fallback;
}

function StripWords({ sharingMemberCount }: { sharingMemberCount: number }) {
  const members = sharingMemberCount === 1 ? "member who shares" : "members who share";
  return (
    <StripLine>
      <FhIcon name="users" className="fh-s" />
      <span>
        Paths come from {sharingMemberCount} {members} their network so far.
      </span>
    </StripLine>
  );
}

// Village searches only for a member who connected their own network. Until then, search finds member profiles.
function ConnectPrompt({ communityName }: { communityName: string }) {
  return (
    <Note icon={Waypoints} className="mt-4" data-slot="connect-prompt">
      <b>Connect your network to search who members know.</b> It takes a few minutes, and then you see the people in reach
      through {communityName} and who can introduce you. Until then, this searches member profiles.{" "}
      <Link href={ROUTES.myNetwork}>Connect your network</Link>
    </Note>
  );
}

// Commonhall's search (village/views.mjs searchPage): the question as the title, the field, In our network |
// Everywhere, example searches, the strip line, then the results.
export function SearchScreen(props: SearchScreenProps) {
  const { communityName, sharingMemberCount, isConnected, isVillageOn, defaultScope } = props;
  const canSearchNetworks = isVillageOn && isConnected;
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const query = (searchParams.get(SEARCH_PROMPT_PARAM) ?? "").trim().slice(0, SEARCH_PROMPT_MAX_LENGTH);
  const scope = canSearchNetworks ? readScope(searchParams.get(SEARCH_SCOPE_PARAM), defaultScope) : SEARCH_WHERE.network;
  // The search runs from the browser (it can take two minutes), never while the server renders the page.
  const isInBrowser = useIsInBrowser();

  const search = (words: string, where: SearchWhere) => {
    const prompt = words.trim();
    if (!prompt) return;
    const active: ActiveSearch = { prompt, scope: where, startedAtMs: Date.now(), wasSeen: false };
    queryClient.setQueryData(activeSearchQuery.queryKey, active);
    router.push(toSearchHref(prompt, where));
  };

  return (
    <>
      <div className="fh-pagehead">
        <h1 className="fh-h1">
          <label htmlFor={QUERY_FIELD}>Who are you trying to reach?</label>
        </h1>
      </div>
      <SearchForm key={`${query}|${scope}`} query={query} scope={scope} canChooseScope={canSearchNetworks} onSearch={search} />
      {canSearchNetworks ? <StripWords sharingMemberCount={sharingMemberCount} /> : null}
      <div id="results">
        {isVillageOn && !isConnected ? <ConnectPrompt communityName={communityName} /> : null}
        {isVillageOn ? null : (
          <Note icon={KeyRound} className="mt-4">
            {communityName} hasn’t switched on network search yet, so this searches member profiles only.
          </Note>
        )}
        {query && isInBrowser ? (
          <QueryBoundary
            key={`${query}-${scope}`}
            loadingMessage="Searching…"
            failure={NetworkFailure}
            fallback={canSearchNetworks ? <SearchWaiting prompt={query} sharingMemberCount={sharingMemberCount} /> : undefined}
          >
            <SearchResults {...props} query={query} scope={scope} />
          </QueryBoundary>
        ) : null}
      </div>
    </>
  );
}

type SearchFormProps = { query: string; scope: SearchWhere; canChooseScope: boolean; onSearch: (words: string, where: SearchWhere) => void };

// The field, In our network | Everywhere and the examples. It starts again from the address on every search.
function SearchForm({ query, scope, canChooseScope, onSearch }: SearchFormProps) {
  const [draft, setDraft] = useState(query);
  const [chosenScope, setChosenScope] = useState(scope);
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(draft, chosenScope);
      }}
    >
      <SearchBox
        id={QUERY_FIELD}
        name={QUERY_FIELD}
        autoComplete="off"
        placeholder="A person, a company or a role"
        maxLength={SEARCH_PROMPT_MAX_LENGTH}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      {canChooseScope ? (
        <div className="fh-period" style={{ marginTop: 12 }}>
          <SegmentedControl
            label="Where to search"
            segments={SCOPE_SEGMENTS}
            value={chosenScope}
            onChange={(where) => {
              setChosenScope(where);
              if (draft.trim()) onSearch(draft, where);
            }}
          />
        </div>
      ) : null}
      {query ? null : (
        <ExampleChips>
          {EXAMPLES.map((example) => (
            <button key={example} type="button" onClick={() => onSearch(example, chosenScope)}>
              {example}
            </button>
          ))}
        </ExampleChips>
      )}
    </form>
  );
}
