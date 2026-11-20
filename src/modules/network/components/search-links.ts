import { ROUTES } from "@/platform/http/routes";
import { SEARCH_PROMPT_PARAM, SEARCH_SCOPE_PARAM, type SearchWhere } from "@/modules/network/contract";

// "Search their networks" is a step on People (round 6): it runs only while the address says so, so typing a name
// there never spends a Village search. Old /search links land on People without it, as a member search.
export const NETWORK_STEP_PARAM = "net";

export function toNetworkSearchHref(query: string, scope: SearchWhere) {
  return `${ROUTES.people}?${new URLSearchParams({ [SEARCH_PROMPT_PARAM]: query, [SEARCH_SCOPE_PARAM]: scope, [NETWORK_STEP_PARAM]: "1" }).toString()}`;
}
