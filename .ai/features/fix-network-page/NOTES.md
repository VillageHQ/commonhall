# Notes: the network page error (how it works now)

- **Why it failed:** `MyNetworkScreen` is a client component, but Next renders client components on the server too.
  Its `useSuspenseQuery(networkStatusQuery)` ran there, and `postRequest`'s relative `fetch("/api/network/status")`
  has no site to reach on the server, so it threw "We couldn't reach the server". React then gave up on that
  Suspense boundary on the server (the logged error) and rendered it again in the browser (error #419).
- **The fix:** `src/components/use-is-in-browser.ts` (`useIsInBrowser`, false on the server and during hydration)
  gates `CurrentNetwork`; until then the boundary shows the same `LoadingState`. The search screen already did this
  for its results and now uses the same hook.
- **Other screens checked:** directory, feed, inbox, inbox threads and the admin members, reports and audit pages
  put their data into the query cache on the server (`HydrationBoundary`), so their suspense queries never fetch
  there. Search results already waited for the browser. Other ways to reach someone (intro page) and comment threads
  with more replies than the inline few only open after a click. So My network was the only screen with the problem.
- **Rule for new screens:** a suspense query against this site's own API needs either the data put in the cache on
  the server, or `useIsInBrowser()` before it renders.
- **Test:** `src/modules/network/components/my-network-screen.test.ts` prerenders the screen as the server does and
  fails if it fetches, logs a render error, or leaves out the loading state.
- **Proof:** `reports/` holds the before and after screenshots of the built app in demo mode (pixel-identical), each
  sync stage after the fix, and `probe.mjs`, the script that took them.
