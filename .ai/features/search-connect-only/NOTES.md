# How search works for members who haven't connected

- `src/modules/network/service.ts` `readSearcher`: returns the member's network only when they joined the group
  (`group_joined_at`), else null. `searchMemberNetwork` answers a null searcher with the profiles-only result (as with
  no Village keys). `readMemberPaths` throws `network_connect_needed` (409). `readAskableConnectors` reads only cached
  paths, so it needs no joined network.
- The shared search identity (`community-pooled-search`), its `village_search_group_id` setting, the pooled path filter
  and the "search identity leaves first" step for a group creator are gone. A stale `village_search_group_id` row in an
  older install is harmless: nothing reads it. If an older install's identity ever did join the group (live Village
  refused it in the 2026-11-16 test), Village would block the creator from leaving until it leaves inside Village.
- `src/modules/network/service-path-sharing.ts`: `dropNonSharingMembers` and `readNonSharingSlugs`, for every searcher.
- `src/platform/village/client.ts` `readVillagePathsBulk`: lowercases and drops ids outside `^[a-z0-9-]{3,100}$`
  before the call (one bad id made Village fail the whole page). `readPagePaths` in `service.ts` returns
  `pathsUnavailable`; the result schema carries it and `search-results.tsx` shows "Couldn’t load intro paths…".
- UI: `search-screen.tsx` shows `ConnectPrompt` when Village is on and the viewer isn't connected, and hides the scope
  switch and the strip line. `src/shell/guided-ask.tsx` asks an unconnected member to connect instead of "Nobody knows
  them". `src/app/(app)/search/page.tsx` passes the whole sharing count.
- Fakes: `src/test/fake-village-server.ts` refuses an unsynced user's group join and search, and fails a bulk call
  with a bad id, like live Village. The demo's canned answers (`src/platform/demo/village-answers.ts`) refuse bad bulk
  ids too.
- Not confirmed with live Village: the exact answer to a bad bulk id (the docs give the pattern; the 2026-11-16 log
  only says `VillageError`). `search_paths_skipped` now logs the code and status.
- Tests: `src/modules/network/search-first.test.ts`, `src/modules/network/components/search-screen.test.ts`.
