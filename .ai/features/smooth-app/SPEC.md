---
id: smooth-app
status: built (parts 0, A, B, C; pull request open) — Part D waits for the TestFlight 4 test
waits-on: []
size: about a day (a small first part, then 3 parts side by side; a 4th only if the phone still lags)
touches: ["src/app/(app)/", "src/app/layout.tsx", "src/shell/navigation-links.tsx", "src/shell/app-actions-group.tsx", "src/shell/user-menu.tsx (one line)", "src/app/parts.css", "src/app/in-app.css", "src/platform/native-app/", "next.config.mjs", "mobile/src/components/", "mobile/src/screens/PortalScreen.tsx", "mobile/src/lib/"]
---
# Spec: a store app that feels smooth (round 7)

**Direction:** the owner's round-7 goal (20 Nov 2026): tab switches respond at once, no web-style rubber band or jank
on the main tabs, measured before and after. The causes: [DIAGNOSIS.md](DIAGNOSIS.md). The choice: [OPTIONS.md](OPTIONS.md),
option (a), with (b)'s native tab bar held behind a measured gate. The council confirms the path before the build.

## Depends on / check-ins
- Built 20 Nov 2026: how it works today, and why Part A draws its outlines from the tap instead of `loading.tsx`:
  [NOTES.md](NOTES.md).
- Runs beside [room-start-instant](../room-start-instant/SPEC.md) and [less-choice](../less-choice/SPEC.md). Shared
  files, and who does what in them:
  - `src/shell/user-menu.tsx`: Part C adds **one line** rendering `<AppActionsGroup />` (its own new file);
    less-choice Part 3 rebuilds the settings list around it. Whichever merges second rebases; the conflict is one line.
  - The Rooms page: room-start-instant changes its top (a box and a button). Part A's Rooms outline follows that new
    layout, so it is built after room-start-instant Part 1 merges, or to its spec exactly.
  - `src/app/parts.css`: Part A only (hover rules, the pressed tab). Part C puts its rules in a new `src/app/in-app.css`.
- Rebase on main before each pull request.
- Part D was built in round 8 as [ui-polish Part 7](../ui-polish/parts/7-native-tabs.md) (the council, 23 Nov 2026).
- TestFlight build 4 and an Android test APK carry parts B and C (a later step of the round, not this spec).

## What it does (after)
- **A tap on a tab lights it up at once** and shows that tab's page outline in the same frame; the content fills in
  when the server answers. Coming back to a tab you saw in the last 30 seconds shows it straight away.
- **In the app, scrolling feels like the phone's own lists:** no bounce past the top or bottom, native momentum, no
  Android stretch glow, no pull-to-refresh reload, no link-preview pop-up on a long press.
- **One header in the app:** the site's top bar, solid (no blur), reaching up under the status bar. The app's actions
  (Reload, Open in the browser, Switch community) move into the avatar menu under "This app".
- The app opens straight on Today (no redirect).
- In a browser the website gets the same instant tab taps; its look doesn't change.

## Parts

### Part 0: the contract (first, small, about 30 minutes)
Shared words for parts A–C, merged first so the three parts can run side by side.
- The app marks its pages: the bootstrap script sets `document.documentElement.dataset.app = "commonhall"` as its
  **first line, before** the guard that returns when `__commonhallBridge` already exists (`mobile/src/lib/bridge.ts`),
  so the load-end re-run sets it too. The web preview's `PortalView.tsx` builds `CommonhallApp` itself and must set the
  same attribute and fields. The site's CSS may key on `html[data-app]`. A page without it (a browser, an older app
  build) behaves as today.
- One new page → app call: `CommonhallApp.appAction(action)` (like `openRoom`), posting
  `{ type: "app.action", action: "reload" | "browser" | "switch" }`, accepted only from the community's own origin
  (`parseBridgeMessage`). `CommonhallApp.appActions: true` tells the page the app understands it; older builds don't
  set it, and the site then shows no "This app" items. `portal-types.ts` gets the matching `onAppAction` callback.
- The app's pages draw under the status bar: the site's viewport gets `viewport-fit=cover` only when the request's
  user agent carries `CommonhallApp/` (`generateViewport` in `src/app/layout.tsx`), so browsers are unchanged. Part C
  pads the top bar with `env(safe-area-inset-top)`. The app adds no native strip, so the colour above the bar is always
  the site's own theme (light or dark).
- Files: `src/platform/native-app/bridge.ts` (+ test), `mobile/src/lib/bridge.ts` (+ `lib.test.ts`),
  `mobile/src/components/PortalView.tsx`, `mobile/src/components/portal-types.ts`, `src/app/layout.tsx`.
- **Check:** unit tests on both sides (the message parses; a foreign origin is refused; an unknown action is
  refused; the attribute is set on a re-run); a browser user agent gets no `viewport-fit=cover`.

### Part A: instant tabs on the site (web; any browser)
- A `loading.tsx` for each member tab (`/rooms`, `/today`, `/asks`, `/people`, `/inbox`) and console tab (`/admin`,
  `/admin/members`, the console's Asks, Announce, Set up): the page heading and grey blocks shaped like that page's
  first screen, from the parts. With it, Link prefetch fetches each tab's shell and a tap navigates at once
  ([Next.js prefetching](https://nextjs.org/docs/app/guides/prefetching)).
- **Each outline covers only its list page, never the pages under it** (a `loading.tsx` applies to every page below
  its folder): the list page moves into a route group with its outline, e.g. `rooms/(list)/page.tsx` +
  `rooms/(list)/loading.tsx`, so `/rooms/<id>`, `/people/<id>`, `/asks/<id>`, `/inbox/<id>` and the ~22 admin pages
  under `/admin` keep today's behaviour. Addresses don't change.
- The tab bar and sidebar light the tapped item on press (client state set on `pointerdown`/`click`, cleared when the
  route changes or after 5 s), marked `data-pressed="true"` and styled like the current tab; links also get a pressed
  style. `aria-current` stays on the real current page.
- Reuse visited tabs for 30 seconds: `experimental.staleTimes.dynamic = 30` (see Fork 1). The member's counts
  (messages, intros, asks) stay live as client queries; the Rooms live dot and the admin badges are server values and
  can be up to 30 s old, and so can a room's state on Rooms right after it ended in the app (the room page itself
  always reads fresh).
- Hover looks only where there is a mouse: wrap the `:hover` rules of `parts.css` and `globals.css` in
  `@media (hover: hover)`.
- Find why Today prefetches each link twice (20 prefetches in 3 s) and stop the duplicate.
- **Checks (driven by a separate verifier, `reports/measure.mjs`, Phone profile and WebKit +150 ms):**
  1. Tap → tab lit: **≤ 50 ms** on every tap (today 199–347 ms). The verifier changes the script's `feedbackMs` to
     read `data-pressed` or `aria-current`, whichever comes first.
  2. Tap → that tab's heading or outline on screen: **≤ 100 ms** (today 231–401 ms).
  3. Revisit within 30 s → content painted with no page request (`rscOnTap` empty).
  4. No layout jump when content replaces the outline (Cumulative Layout Shift under 0.1; the verifier adds a
     layout-shift reading to the script).
  5. Prefetches on Today idle: at most one per link.
  6. A screenshot of each tab's outline at 390 px, read by the verifier: it looks like the page that follows.
  7. Opening a room, a profile, an ask, a conversation and three admin sub-pages shows no tab outline first.

### Part B: the app's web view (store app, `mobile/`)
- `PortalView.native.tsx`: `bounces={false}`, `pullToRefreshEnabled={false}`, `decelerationRate="normal"`,
  `allowsLinkPreview={false}` (iOS settings) and `overScrollMode="never"` (Android); keep
  `allowsBackForwardNavigationGestures` (the iOS back swipe), checked on the device.
- The native top bar and its ••• menu go (`PortalScreen.tsx`); the web view fills the screen up to the top edge
  (Part 0's `viewport-fit=cover` lets the site pad its own bar). The three actions arrive through `onAppAction` and do
  what they do today; the error screen's Try again and Choose another community stay native.
- Start on `/today` instead of `/` (`START_PATH` in `mobile/src/lib/links.ts`); an alert's own address still wins.
- **Checks:** `npm run typecheck`, `npm test`, `npx expo-doctor`; in the web preview (`scripts/web-preview.mjs`) a
  verifier sees one header, uses Reload and Switch community from the avatar menu, and opens the app on Today with no
  redirect in the network log. Bounce, momentum, link preview, the stretch glow and the status-bar area need the
  device: they are checked on TestFlight 4 and the Android APK by hand (pull past the top does nothing; a fling glides;
  the bar's colour reaches the top in light and dark), and that check is written into `reports/`.

### Part C: the app's chrome on the site (web, only when `html[data-app]`)
- In `src/app/in-app.css`: `html[data-app] .fh-topbar` gets a solid background, no `backdrop-filter`, and
  `padding-top: env(safe-area-inset-top)` with its height grown by the same.
- `src/shell/app-actions-group.tsx`: a "This app" group (Reload, Open in the browser, Switch community) shown when
  `CommonhallApp.appActions` is true, calling `CommonhallApp.appAction`; one line in `user-menu.tsx` renders it.
- Nothing changes for a browser: the web's top bar keeps its look (an approved design).
- **Checks:** a component test (the group shows only with `appActions`); the verifier in the web preview reads the
  computed style (no blur) and taps each action.

### Part D (only if the gate opens): a native tab bar, one web view per tab
**Gate:** after A–C ship on TestFlight 4, re-measure on a phone (the same script in the web preview plus a 30-second
screen recording of tab taps and a keyboard opening on Asks). Build D if a tab tap still takes over 100 ms to show
anything, or the owner still calls tab switching slow, or the web tab bar moving with the keyboard bothers him.
- Expo Router's native tabs (`expo-router/native-tabs`, SDK 58) with the five member tabs; each tab its own web view,
  loaded on first visit and kept alive; tapping the current tab scrolls it to the top.
- The site hides its own tab bar when the page says it is in a tabbed app (`CommonhallApp.nativeTabs`); badges and
  the Rooms live dot reach the native bar through a page → app message (`app.badges`), sent from the live badge queries
  (the live dot becomes a client query for this).
- Admins: the console keeps the site's own tabs inside the app (one web view), or a second native tab set: decided at
  the gate.
- Alert taps and `commonhall://` links pick the right tab; the room mini bar sits above the tab bar.
- iOS may discard a background tab's web content; the tab reloads when shown (already handled for the one web view).
- **Checks:** tap → native tab lit in one frame (screen recording on the device); revisiting a tab keeps its scroll
  and typed text; badges match the site's; memory with five tabs open, read from Xcode or Android Studio, written down.

## Situations the plan was tested on
- **A mid-range Android phone on a slow network:** gets the instant tab feedback and outlines (Part A) and no stretch
  glow; the momentum and bounce settings are iOS-only, and Android's own are already close to native. The ~970 KB of
  JavaScript at launch is unchanged, so launch stays slow on such a phone (out of scope; a "lighter first load" line).
- **An admin on the console tabs in the app:** the console tabs get their own outlines, scoped to the five tab pages
  only; the "This app" group shows in the admin's avatar menu too.
- **A member typing a long ask with the keyboard open:** unchanged by A–C (the web tab bar and the composer sheet
  still move with the keyboard); it is part of Part D's gate.

## Forks for the council
1. **Reuse visited tabs for 30 s (`experimental.staleTimes`).** The Next.js docs mark it "not recommended for
   production". **My pick: use it** (30 s; the page can be up to 30 s old, the member's counts stay live), because it
   is what makes coming back to a tab instant without Part D. The fallback: skip it and rely on the outline (each
   revisit costs a round trip behind an instant outline).
2. **Pull to refresh.** Removing it removes the accidental reloads and the forced bounce. **My pick: remove it**;
   Reload stays in the menu, and a tab re-tap could refresh later.
3. **The web view settings ship in TestFlight 4 only** (a store build). Nothing for the public stores without the
   owner's "publish".

## Out of scope
Native Today or Rooms screens; changes to the web's look in a browser; offline mode; a lighter first load.

## Decisions (council pass, 20 Nov 2026 — Rams, Torvalds, Watts, 3 of 3)
- Path A only now (instant tab feedback, loading screens, bounce/momentum/blur fixes). Do NOT turn on the experimental Next.js tab cache. Part D (native tab bar) waits for the owner's phone test of TestFlight 4.
- Remove pull-to-refresh; Reload stays in the menu.
- Kill criterion: owner says taps still feel slow on TestFlight 4 -> build Part D.
