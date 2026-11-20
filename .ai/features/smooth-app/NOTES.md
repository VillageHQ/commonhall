# Notes: a store app that feels smooth (how it works today)

Built in round 7 (20 Nov 2026): parts 0, A, B and C of [SPEC.md](SPEC.md). Part D (a native tab bar) waits for the
owner's phone test of TestFlight 4. The causes these fix: [DIAGNOSIS.md](DIAGNOSIS.md). Numbers before and after:
`reports/` (below).

## The app and the site (Part 0)
- The app's bootstrap script (`mobile/src/lib/bridge.ts`) sets `<html data-app="commonhall">` as its first line, before
  its re-run guard, so the load-end re-run sets it too. The web preview's `PortalView.tsx` sets the same attribute and
  the same `CommonhallApp` fields. The site's CSS keys on `html[data-app]`; a browser or an older app build has none.
- `CommonhallApp.appActions: true` and `CommonhallApp.appAction("reload" | "browser" | "switch")` post
  `{ type: "app.action", action }`. The app reads it with `readPortalMessage` (only from the community's own origin,
  only a known action) and `PortalScreen.onAppAction` does Reload, Open in the browser (the start address) or Switch
  community. The site reads it with `hasAppActions()` / `runAppAction()` (`src/platform/native-app/bridge.ts`).
- The site's viewport gets `viewport-fit=cover` only when the user agent carries `CommonhallApp/`
  (`src/platform/native-app/viewport.ts`, used by `generateViewport` in `src/app/layout.tsx`).

## Instant tabs (Part A, any browser)
- A press on a tab-bar or sidebar item lights it at once (`data-pressed="true"`, styled like the current tab in
  `parts.css`; the current tab lets go while another is pressed). `aria-current` stays on the page shown.
- On the click (not the finger-down), the page area swaps the page for that tab's outline
  (`src/shell/tab-outlines.tsx`, built from `src/components/page-outline.tsx`) until the new page commits. The old page
  stays mounted, only hidden, so a press that never arrives (5 s, `PRESSED_TIMEOUT_MS`) gives it back as it was.
- One press for the whole shell: `PressedTabProvider` and `PendingTabPage` in `src/shell/pressed-tab.tsx`, around the
  page in `app-shell.tsx`. A press ends for good when the address changes, so Back never brings an outline back; a
  tap on the tab already shown records nothing.
- **Why not `loading.tsx`, as the spec said:** React keeps a shown loading screen up for at least 300 ms
  (`FALLBACK_THROTTLE_MS`), so with `loading.tsx` the full page came about 130 ms later than before on the phone
  profile and the outline flashed on fast connections. It also made `notFound()` and `redirect()` in those pages
  answer after a 200, which needed guard layouts and route-group moves. Drawing the outline from the tap has neither
  cost. The price: only taps on the tab bar and the sidebar get an outline, not other links to those pages.
- The Rooms outline is drawn for room-start-instant's layout (the box over a full-width Start button); until that
  merges, it only roughly matches today's Rooms page.
- Adding a tab: give it an outline in `TAB_OUTLINES` (keyed by its address), or it keeps the old page on screen until
  the new one comes.
- Hover looks apply only where there is a mouse: every `:hover` rule in `parts.css` and `globals.css` sits in
  `@media (hover: hover)`, and `.ai/features/fh-foundation/port-css.mjs` wraps them the same way on a re-port.
- Prefetch: Today idle still makes 20 prefetch requests (2 per link). Nothing is doubled: Next 16 asks once for the
  route's tree and once for its segment data. One per link would need Partial Prerendering or no prefetch.
- Not built (the council): the experimental tab cache (`experimental.staleTimes`). A revisit fetches the page again
  behind the outline.

## The app's web view (Part B, `mobile/`)
- `PortalView.native.tsx`: no bounce (`bounces={false}`), no pull-to-refresh, no Android stretch glow
  (`overScrollMode="never"`), native momentum (`decelerationRate="normal"`), no long-press link preview. The iOS back
  swipe stays.
- No native top bar or ••• menu: the web view runs to the top edge; the error screen (Try again, Choose another
  community) stays native, padded below the status bar.
- The app opens on `/today` (`START_PATH`); an alert's or a link's own page still wins.
- An app with this build on a community server from before Part C has no Reload or Switch community (no menu shows
  them); Switch community is still on the native error screen.

## The app's chrome on the site (Part C)
- `src/app/in-app.css` (only under `html[data-app]`): the top bar is solid (`--paper`, light and dark), has no
  backdrop blur, and grows by `env(safe-area-inset-top)`; what sticks under it on a phone moves down with it; sign-in
  and onboarding pages start below the status bar. A browser keeps the approved look (the blurred bar).
- `src/shell/app-actions-group.tsx`: the avatar menu's "This app" group, shown only when the app takes app actions.

## Measuring
- `reports/measure.mjs` (before, from the diagnosis) and `reports/measure-after.mjs` (after: the tab lit by
  `data-pressed` or `aria-current`, the outline, layout shift, the pages under the tabs). Raw results:
  `reports/*.json` (before) and `reports/after-*.json`. The console run needs `START=/admin` (and
  `MSYS_NO_PATHCONV=1` in Git Bash).
- Device-only, checked by hand on TestFlight 4 and the Android APK: bounce, momentum, link preview, the stretch glow,
  the status-bar area in light and dark (`reports/device-check.md`).
