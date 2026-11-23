# Part 7 (the store app's own tab bar): the verifier's report

> **Latest result: see "Re-check on 19cde194" at the end.** The first pass below was on `d0419ea0`.

- **Verifier:** an independent agent that did not build the part. It changed no code.
- **Build:** branch `absi-agent/ui-p7` at `d0419ea0`. The site is the `.next` build from 09:58. The store app's web build
  (`mobile/dist-web`, 10:02:27) is newer than every file under `mobile/src`.
- **Date:** 23 Nov 2026.
- **Setup:** throwaway Postgres `ui-p7-pg` (demo data, made-up people) and LiveKit `ui-p7-livekit`. `next start` ran on
  3797 and `mobile/scripts/web-preview.mjs` on 3798 (APP_URL and EXPO_PUSH_URL point at the preview). The app was opened
  at `http://localhost:3798/__app/`, joined the community at `http://localhost:3798`, and signed in with "Try it as Sam".
  Maya used a second, plain browser context. Playwright drove it with `isMobile`, `hasTouch` and deviceScaleFactor 1.
  The insets are 0 in the preview.
- **Scripts:** `.ai/tmp/verify-p7/` (gitignored), in this order: `a-bar-alive-slide`, `b-links-hides-alert-mini`,
  `c-modes-signout`, `d-debug`, `e-debug`, `f-signout-maya`, `g-sizes-motion`, `h-mini-newtab`, `i-a11y-notab`.
  The servers were stopped at the end of each run, and ports 3797 and 3798 are free.

## Checks

| # | Check | Result | What was measured | Pictures |
|---|---|---|---|---|
| 1 | Bar | **PASS** | The bar is 56 px tall and sits at y 788–844 at 390×844, with Rooms · Today · Asks · People · Inbox. Every icon is 24×24 and starts 10 px under the bar's outer edge, so 9 px under the 1 px hairline. The open tab's icon stroke is 2 and the others' 1.5. Labels are 11 px, weight 600 when open and 500 otherwise. The open tab has `aria-selected=true`. The indicator is 28×3 on the top edge, its centre at x 117 under a tab centred at 117 (0 px off), and it was centred within 0 px on every tab. The Inbox count "1" and the Rooms live dot match the site's bar in the same page (`1 new in your inbox`, `live-dot`). The count is 16 px and the dot 8 px, each with a 2 px ring; inside the ring they start 6 px under the border and 7 px right of the tab's middle. The site's bar is `visibility:hidden` in all 5 tabs. | after-today-390, after-tabbar-closeup-390 |
| 2 | Kept alive | **PASS** | Today was scrolled to 580 (its end). After People and back, Today's scrollY was still 580 and its `performance.timeOrigin` hadn't changed. No frame navigated during the switch, and each of the 5 tabs had 1 navigation entry. | after-people-390 |
| 3 | Slide | **PASS** | People → Today slides in from the left: translateX −40 → 0. Today → People slides in from the right: +40 → 0. The first frame that moved came 16 ms after the tap and the slide had settled by 232 ms, so it runs about 216–232 ms. At about 0 ms: opacity 0, −40 px. At 33 ms: 0.24, −30 px. At 115 ms: 0.93, −3 px. At 300 ms: 1, 0. The outgoing page goes straight to opacity 0. A first visit doesn't slide (opacity 1, no transform all through). With reduced motion there are only 2 states, a jump, and the indicator jumps too (259 → 103). | after-slide-midway-110ms-390 |
| 4 | Tapping the open tab | **PASS** | On Today, tapping Today scrolled 580 → 0. On a profile under People, tapping People went back to `/people` in the same document. In an Inbox thread, tapping Inbox went to `/inbox`. On `/me` (opened from the menu inside the People tab), tapping People went to `/people`. | after-profile-under-people-390 |
| 5 | Links and alerts | **PASS** | Today's "All asks" opened the Asks tab when Asks wasn't loaded yet, and again when it was alive. Today stayed on `/today`. Maya sent Sam a message while Sam was on People. The preview banner "Message from Maya Ortiz" showed, and tapping it opened the Inbox tab on `/inbox/1937cdf0…`. That web view loaded the thread as a new document, so the list's scroll is lost. | after-alert-banner-on-people-390, after-alert-opens-inbox-thread-390 |
| 6 | Hides | **PASS** | With `data-pushed-screen` in an Inbox thread, the bar is gone (the site's bar is `display:none`). It comes back when the marker is removed and on the list. `html[data-sheet-open]` hides the bar and the mini bar slot, and both come back when it is removed. Maya's `/admin` has no native bar and the site's own console tabs are visible (`/admin`, `/admin/asks`, `/admin/members`, `/admin/announcements`, `/admin/settings`). The keyboard is a store build 5 check. | after-pushed-screen-no-bar-390, after-maya-admin-console-390 |
| 7 | Sign-out and sign-in | **FAIL** | A member can't sign out from the avatar menu in the app. The menu's foot (Dark mode, Sign out) and its "This app" group (Reload, Open in the browser, Switch community) run under the native bar. A tap on "Sign out" (y 785–829) lands on the People tab instead. When "Sign out" is clicked from inside the page, the rest works: one web view is left on `/signin` with no bar, Maya's sign-in shows the bar, and People loads fresh and signed in. | (fault picture removed after the fix; compare before-31-app-avatar-menu.png) |
| 8 | Mini player slot | **FAIL** | For the tabs that were open when the room was minimised, it works. The mini bar is at y 732–788 and the tab bar's top is at 788 (0 px gap). Every live page has `--mini: 56px`. Today's last item, at y 700, is above the mini bar's top at 732. When the bar is hidden, the slot drops to the bottom (788–844). But a tab first opened while the mini bar shows never gets the frame: its html has `style=null`, so no `--mini` and no `--tab-h`, and no `data-mini-player`. Its footer ("Source code (AGPL-3.0)") sits under the mini bar. | after-mini-bar-over-tabbar-390, after-mini-bar-today-end-390, after-mini-bar-pushed-screen-390 (after-mini-bar-new-tab-asks-end-390 now shows the fixed state; compare before-35-app-room-minimised-miniplayer.png) |
| 9 | Small screens and dark mode | **PASS** | At 360×740 the tabs are 72 px wide and at 300×570 they are 60 px. No label is cut: each label's scrollWidth equals its clientWidth (Rooms 34, Today 30, Asks 23, People 34, Inbox 28). No labels overlap, there is no sideways scroll, and the indicator stays centred within 0 px. In dark mode the bar takes the open page's colours exactly: bar rgb(22,22,21), rule rgb(51,51,47), active rgb(244,242,236), inactive rgb(184,182,174). But see "dark mode across tabs" below. | after-today-360, after-inbox-360, after-today-300, after-dark-today-390 |
| 10 | Memory | **PASS** (written down) | See "Memory" below. | — |
| 11 | Tests | **PASS** | In `mobile/`: `npm run typecheck` passes; `npm test` passes 28 of 28; `npx expo-doctor` passes 20 of 20 checks. At the root, `pnpm lint` has 0 errors (1 old warning in `deploy/cloudflare/worker.js`) and `pnpm typecheck` passes. As the brief allowed, `pnpm test` was not rerun; the builder reports 3,699 passing plus the known deploy-setups CRLF failure. | — |

### More checks

| Check | Result | Notes |
|---|---|---|
| Something visibly broken: dark mode across tabs | **FAIL** | Turn dark mode on in Today, then tap People, which is already alive. People is still light (`html.dark` is false), and the native bar turns light with it. Each live web view keeps the mode it loaded with until it loads again. Before Part 7 there was one web view, so this couldn't happen. (Fault picture removed after the fix.) |
| Something visibly broken: Reload in "This app" | **FAIL** | Reload is under the native bar, the same fault as Sign out in check 7. Clicked from inside the page, it reloads only the open tab (People got a new timeOrigin) and the other 4 stay alive, which is right. |
| Accessible names | **PASS** | The bar is a `tablist`. The tabs are `tab "Rooms, A room is live"`, `tab "Today" [selected]`, `tab "Asks"`, `tab "People"` and `tab "Inbox, 1 new in your inbox"`. Each icon has its label next to it. |
| Hidden tabs in the preview | note | In the web preview, the containers of hidden tabs aren't `aria-hidden`: React Native Web ignores `accessibilityElementsHidden` and `importantForAccessibility`. They do have `pointer-events:none` and opacity 0. This only affects the preview, but VoiceOver and TalkBack should be checked on store build 5. |
| Reduced motion | **PASS** | The page reports `prefers-reduced-motion: reduce`. A switch has no slide or fade, the indicator jumps, and tapping the open tab scrolls to the top straight away (0 within 60 ms). |
| Rapid taps | **PASS** | 14 taps 30 ms apart ended on Asks. The selected tab, the only visible container (opacity 1, z-index 1) and the indicator (centre 195) all agree. |
| Tapping while a tab first loads | **PASS** | With a slowed network, People shows a spinner on the paper and the bar stays. Asks → People mid-load ended on People with no spinner left. No tab was lost or duplicated. Picture: after-first-visit-spinner-390. |
| Signing out, then in as Maya | **PASS** (once Sign out is reached) | The web view that signed in became the Today tab. `/admin` has no native bar. "See it as a founder" shows the native bar, and People loads fresh. "Admin console" from founder view hides the bar again. |
| No leak from switching | **PASS** | After 40 and 80 more switches: heap 20.7 → 21.3 → 21.5 MB; DOM nodes 3,269, 3,269, 3,269; documents 32, 32, 32. |
| Android back button | not tested | Not testable in the web preview (store build 5). |

## Memory (Chrome, the web preview, CDP `Performance.getMetrics` after `HeapProfiler.collectGarbage`)

| State | JS heap used | DOM nodes | Documents | JS listeners |
|---|---|---|---|---|
| One tab (Today) | 11.0 MB | 664 | 3 | 598 |
| All five tabs alive (run A) | 23.8 MB | 3,286 | 32 | 2,159 |
| All five tabs (run F) | 20.7 MB | 3,269 | 32 | 2,162 |
| Run F, after 80 more switches | 21.5 MB | 3,269 | 32 | 2,162 |

Each tab adds about 2.5–3 MB of JS heap and about 650 DOM nodes in the preview. The real figures for Android web views come from
store build 5 (Android Studio's profiler).

## The FAILs, with exact steps to reproduce

1. **The avatar menu's foot is under the native bar (Sign out, Dark mode, Reload, Open in the browser, Switch community).**
   - Steps: open the app as Sam at 390×844. In any tab, tap the avatar (top right). The menu runs down to y about 833. Its sticky foot (Dark mode, then Sign out at y 785–829) and the "This app" group are drawn under the native bar (y 788–844). Tap "Sign out": the People tab opens and nothing signs out. Tap "Reload": the same.
   - Before: in before-31-app-avatar-menu.png the menu covered the site's own bar.
   - Cause: in the app the native bar is drawn over the web view, so nothing in the page can rise above it.
   - Fix ideas: keep page menus above `--tab-total` (collision padding or a max-height). Or hide the native bar while a menu is open, as it already does while a sheet is open.
2. **A tab first opened while the room's mini bar shows never gets `--mini` (or `--tab-h`).**
   - Steps: as Sam, open Rooms, tap Join on the live room, then tap ↓ Minimise. Tap Asks, which hasn't been opened yet, and scroll to the end. The footer "Source code (AGPL-3.0)" is under the mini bar.
   - What the page shows: `getComputedStyle(html).getPropertyValue('--mini')` is `0px`, and the `style` attribute is null throughout the load (watched every frame).
   - It fixes itself only when another tab opens later.
   - Cause, from the code: in `buildTabsScript`, `start()`, which calls `report(true)`, runs before `window.__commonhallTabs` is assigned at the end of the script. In the preview, `__commonhallTabsSend` is synchronous, so the app's reply to `isFirst`, `buildFrameScript` (which starts `window.__commonhallTabs && …`), does nothing.
   - On the phone, `postMessage` is asynchronous, so it is probably fine there, but that is unverified. Assigning `window.__commonhallTabs` before `start()` would fix it in both.
3. **Dark mode doesn't reach the tabs that are already alive.**
   - Steps: as Sam, open People, then Today. In Today, avatar menu → Dark mode, which the menu's top half still allows. Today and the bar turn dark. Tap People: the page and the bar are light.
   - Fix idea: the tab script could watch the theme in storage, or the app could pass the theme to every live tab.

## Taste notes (not checks)

- **Against the references** (Mobbin, read-only): tabbar-facebook (the line on the top edge), tabbar-airbnb (hairline,
  a dot on the icon's corner) and tabbar-instagram (icons only).
  - The bar reads as calm and well-spaced, and the 28 px line is a tidier accent than Facebook's long blue bar.
  - The open tab rests mostly on the line. Ink against graphite, 600 against 500 and a 2 against 1.5 stroke are all subtle; Airbnb uses colour and Facebook a filled icon. It is fine for this brand, but at arm's length the line does all the work.
- **The slide's curve is front-loaded:** 93% opaque by 115 ms. The old page vanishes at once, so the first 1–2 frames are almost bare paper (opacity 0–0.24): a faint flash on quick switches. Starting the fade at about 0.3, or holding the old page for one frame, would soften it.
- **A first visit shows a spinner on bare paper with no header:** the community bar appears only when the page lands. A header-only placeholder (or Part 2's outlines) would avoid the jump.
- **The alert reloads the Inbox web view** rather than moving inside it, which costs about 300 ms and the list's scroll position. A client-side move to the thread, when the Inbox tab is alive, would feel more native.
- **Live dot and count:** the live dot's colour follows the site, rust in light mode and lighter in dark. The count pill keeps its ring in dark mode. Both look right.

## Re-check on 19cde194

- **What was re-checked:** commit `19cde194` ("the bar steps aside for page menus, dark mode follows across tabs, no missed frame"). It changes `mobile/src/lib/tabs.ts`, `PortalTabs.tsx` and `tabs.test.ts`.
- **Build and setup:** `mobile/dist-web` was rebuilt from it at 10:57:45, and nothing under `mobile/src` is newer. The setup, ports and people are the same as above.
- **Script:** `.ai/tmp/verify-p7/r-recheck.mjs`.
- **How it was driven:** every menu item was tapped where a member would tap it: Playwright `tap()` at the item's place on the app's screen. For each item, the script first read what is drawn on top at that point (`elementFromPoint`).
- **Servers:** stopped. Ports 3797 and 3798 are free.

| # | Check | Result | What was measured | Pictures |
|---|---|---|---|---|
| 7 | Sign-out and sign-in | **PASS** | **Menu:** opening the avatar menu hides the native bar. "Sign out" is at y 786–830, and the page's own frame is on top there, so nothing covers it. **Sign out as Sam (tapped):** one web view is left on `/signin`, with 1 iframe and no bar. **Sign in as Sam again:** the bar is back, with only Today alive; People loads fresh and signed in. **Sign out again, then sign in as Maya:** she lands on `/today` with the bar. On `/admin` there is no native bar, and the site's console tabs are visible. "See it as a founder" (tapped at y 698–742) brings the native bar back. | after-avatar-menu-sign-out-reachable-390, after-signed-out-one-view-390, after-maya-admin-console-390, after-maya-founder-view-390 |
| — | "This app" > Reload (tapped) | **PASS** | Reload is at y 789–833 and the page is on top there. Tapping it reloads only People: its timeOrigin goes from …365384 to …404519. Today, Inbox and Asks keep theirs. The bar comes back, with People selected. | — |
| — | Menu closes → the bar comes back | **PASS** | Menu open: no bar. Escape: the bar is back. Opened again, then a tap outside it (40, 450): the bar is back and Today is still the open tab. | after-avatar-menu-open-bar-steps-aside-390 |
| 8 | Mini player slot | **PASS** | Join, then Minimise: the mini bar is at y 732–788 and the bar's top is at 788 (0 px gap). Asks and People, never opened before, then opened: each page has `--mini: 56px`, `--tab-h: 56px` and `data-mini-player`. Scrolled to the end, the last item ("Source code (AGPL-3.0)") ends at y 700, above the mini bar's top at 732. With the menu open, the bar and the mini bar both step aside; Escape brings both back. | after-mini-bar-new-tab-asks-end-390 (replaced), after-mini-bar-over-tabbar-390 |
| — | Dark mode across tabs | **PASS** | **Dark:** in Today, avatar menu, then tap Dark mode. Today turns dark (page rgb(14,14,13), bar rgb(22,22,21)). People and Inbox, already alive, are dark as soon as you switch to them. Their own menus read "Dark mode · On". Asks, never opened before, also loads dark. **Light again:** switched off in People; Today, Inbox and Asks are light again (page rgb(250,250,247), bar rgb(255,255,255)). | after-dark-today-390, after-dark-people-follows-today-390, after-light-again-across-tabs-asks-390 |
| 1 | Bar (regression) | **PASS** | The bar is 56 px at y 788. Icons are 24×24, 10 px from the bar's outer edge (9 px under the hairline). Labels are 11 px, 600 on the open tab and 500 on the others; strokes are 2 and 1.5. The indicator is 28×3, centred at 117 under a tab whose centre is 117. The badges and accessible names are unchanged, and the site's bar is hidden in every tab. | after-today-390 |
| 3 | Slide (regression) | **PASS** | Today → People: from +40 px, first movement at 18 ms, settled by 233 ms; at 117 ms, opacity 0.93 and +3 px. People → Today: from −40 px, first movement at 16 ms, settled by 233 ms. | — |
| 6 | Hides (regression) | **PASS** | A pushed screen hides the bar and it comes back afterwards. `data-sheet-open` hides it and it comes back once removed. `/admin` has no native bar. | after-pushed-screen-no-bar-390 |
| 11 | Tests (the changed code) | **PASS** | `mobile/`: `npm run typecheck` passes, `npm test` passes 29 of 29, `npx expo-doctor` passes 20 of 20. | — |

- **Pictures:** I deleted the ones that showed faults now fixed (after-avatar-menu-foot-under-native-bar-390, after-dark-then-people-tab-stays-light-390). I replaced after-mini-bar-new-tab-asks-end-390 with the fixed view.
- **Memory:** a quick reading after the room run (four tabs alive) gave a 23.1 MB JS heap and 2,773 DOM nodes, in line with the first pass.
- **Still open, unchanged:**
  - **Hidden tabs and screen readers:** in the web preview, hidden tabs aren't `aria-hidden`. Check this on store build 5.
  - **Native-only checks:** the keyboard and Android's back button need store build 5.
  - **Taste notes:** those in the first pass still apply.
