# How "Find candidates" works today

- **The button:** `src/app/(app)/jobs/page.tsx` asks `readFindCandidatesLink` (`src/shell/find-candidates.ts`) for a
  link reader and passes it to `JobList` (`findCandidatesHref`). It returns null while the network module is off, so no
  button shows. Per job, `mayFindCandidates` (`src/modules/job-board/rules-candidates.ts`): admins, the member who
  linked the job's hiring tool, or a member whose card company has the job's company slug (`toCompanySlug`).
- **The page:** `/search/candidates?job=<id>` (`src/app/(app)/search/candidates/page.tsx`, owned by network, under
  `ROUTES.findCandidates`). `readFindCandidatesPage` reads the job with `readBoardJob` (listed jobs only, a bad id is
  null) and answers 404 to anyone the rule keeps out. The first visit redirects to add `q=` from `buildCandidateQuery`:
  the role (`readRole`: drops "(m/f/d)"-style tags and stray symbols) plus " in <place>", unless the place starts with
  "Remote" or is no place. A title with fewer than two letters or digits gives no query: the page shows "Type the role
  you're hiring for" and never searches until the founder types.
- **The search:** the page renders network's `SearchScreen` with the new optional props `heading`, `intro`,
  `beforeResults`, `searchPath` and `keepParams`, so results, faces, intro paths, the Connect prompt for an unconnected
  member and the profiles-only fallback are search's own, and a new search stays on the page with `job=`.
  `canAskCommunity` is false there: the hiring-request box replaces search's "Ask the community".
- **The hiring request:** `toAskDraftHref(line, { category: "hire" })` (`src/platform/modules/manifest.ts`) opens
  `/asks?draft=…&category=hire`. `parseAskDraftParts` (`src/modules/asks/rules-board-url.ts`) reads both; the composer
  sends the category with the post. `draftHiringAsk` writes "We're hiring a <role> at <company>: <link>. Who do you
  know?" (the link only when it is http(s); the typed role when the title has none). The link is in the line because
  asks show and email only their line, never `detail`. Nothing posts until the member presses Post. Round 7: the
  draft also carries the job (`&job=`) while the job's first request this week is unused, and that one uses no weekly
  ask ([choice-forms NOTES](../choice-forms/NOTES.md)).
- **Tests:** `src/modules/job-board/rules-candidates.test.ts` (query, role, draft line, access rule),
  `src/modules/asks/rules.test.ts` (the draft's category). Proof and the independent check: `reports/`.
- **Demo data:** the demo's canned Village answers match any search word, so "Founding account executive in Boston"
  finds the Boston story people. Better made-up candidates for the tour belong to tour-new-steps.
