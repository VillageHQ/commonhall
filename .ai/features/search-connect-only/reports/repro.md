# Repro first, then the fix

The fake Village was changed to answer like live Village did on 2026-11-16: an unsynced user can't join a group or
search, and the bulk paths call fails when any id isn't a bare slug (`^[a-z0-9-]{3,100}$`, from Village's API schema).
Then `src/modules/network/search-first.test.ts` was written and run before any fix:

| Test | Before the fix | After |
|---|---|---|
| A member who hasn't connected gets member profiles, no Village call | fail: status still claimed `canSearch: true` and the search went to the shared identity | pass |
| Paths ask an unconnected member to connect | fail: 503 "needs a service email" (the shared identity) | pass (409 `network_connect_needed`) |
| An Everywhere page keeps its paths when one LinkedIn name isn't a plain slug | fail: every person's paths `[]` (the whole bulk call refused) | pass (bulk sent only `target-person`) |
| Village failing the page's paths says "couldn't load" | fail: `pathsUnavailable` missing, so "Nobody … knows" | pass |
| Refusers never named; search as yourself once connected; profiles only without Village | pass | pass |

In the running app (demo mode, made-up people), an independent verifier checked all three items at 390 and 1280 px:
see `verify/VERIFY.md` (first pass: three items PASS, one new gap in the guided ask, fixed; re-check PASS).

Why Everywhere failed on live Village: the app log had `search_paths_skipped, reason VillageError` in the same second
as the search, with no Village failure line, so Village refused the request outright. Village's docs give the bulk id
pattern; "Everywhere" results often carry accented or short LinkedIn names. The log now records the code and status, so
a live run can confirm it.
