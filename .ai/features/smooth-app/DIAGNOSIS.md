# Diagnosis: why the store app doesn't feel smooth (round 7, 20 Nov 2026)

The owner tested TestFlight build 3: "not very smooth: bad scroll effects, and delays when I click a menu item".
This file lists every cause found, with numbers where they could be measured. Options and the pick: [OPTIONS.md](OPTIONS.md).
The build plan: [SPEC.md](SPEC.md).

## The point first
- **The delay after a tap is a server round trip with nothing on screen.** Every tab tap asks the server for the new
  page, and the tab bar only lights up when the answer arrives. On a throttled phone profile that is 200–300 ms of
  nothing; in WebKit, the iPhone's engine, with 150 ms of added network delay it is 220–350 ms. On a real phone and
  a server farther away it adds the real round trip again (typically 0.3–1 s in all).
- **The "bad scroll effects" come from web-view defaults nobody set.** The web view bounces at both edges (Pull to
  refresh forces that on iOS), its momentum stops sooner than a native list, a pull at the top reloads the whole site,
  and the app shows two top bars, the native one and the site's own, which is sticky, blurred and moves with the page.
- **None of this needs a different technology to fix.** Expo is React Native already. The causes sit in how the web
  view is set up and in how the site's pages load. The Next.js docs describe our tap delay exactly and give the fix.

## How it was measured
- A throwaway copy: the production build of main (`pnpm build`, `next start`), demo mode (made-up people), its own
  Postgres, a local LiveKit. Signed in as the demo member, 390 px phone viewport.
- Three profiles. **Fast:** Chromium, no throttling (the floor). **Phone:** Chromium with 4× slower CPU, 150 ms network
  latency, 9 Mbit/s. **WebKit:** Playwright's WebKit (the iPhone's engine) with iPhone settings, every request delayed
  150 ms by a small proxy (`reports/slow-proxy.mjs`).
- The script (`reports/measure.mjs`) loads each tab cold, then taps the tabs in a loop. It records: the tab lighting up
  (the tab's `aria-current`), the address changing, and the new page's heading painted (two frames after it appears).
  It also records the page request each tap makes, the prefetches, page weight and scroll frame times. Raw results:
  `reports/*.json`.
- Not measured: a real iPhone or Android phone (none on this PC), and the owner's own server. The rubber-band and
  momentum effects are from the web view's documented defaults, and need a device to feel.

## Tap delay: the causes

| # | Cause | Measured | Notes |
|---|---|---|---|
| T1 | **Every tab tap waits for the server.** All five tab pages are dynamic (the layout reads the session), and none has a `loading.tsx`. For such a page Next.js prefetches nothing useful, so the tap fetches the page and shows nothing new until it arrives. Visited tabs are fetched again too (Next 16 keeps dynamic pages 0 s). | A page request on **every** tap in every run, first visits and repeats alike (`rscOnTap`). Tap → page painted: Fast 54–92 ms · Phone 231–294 ms · WebKit +150 ms 259–401 ms. | Next.js docs: "When navigating to a dynamic route, the client must wait for the server response… the impression that the app is not responding. We recommend adding `loading.tsx`…" ([linking and navigating](https://nextjs.org/docs/app/getting-started/linking-and-navigating), [prefetching](https://nextjs.org/docs/app/guides/prefetching)). |
| T2 | **No feedback while waiting.** The tab lights up from the address, which changes only when the page arrives; tap highlight is switched off (`-webkit-tap-highlight-color: transparent`) and the tab links have no pressed style. | Tab lights up after 17–53 ms (Fast), 199–270 ms (Phone), 219–347 ms (WebKit): always within a few ms of the address change, so at the same moment as the page. | The user's finger lifts and nothing moves for a quarter to a full second. This is the "delay when I click a menu item". |
| T3 | **The network round trip dominates; the server is fast.** | Server time to first byte for a tab's page data: 1–5 ms; whole answer 5–42 ms, 1–16 KB (People is the largest). | On the demo's small data. A real community with a remote database adds tens of ms; the phone network adds 50–300 ms per round trip. |
| T4 | **Prefetches happen but are wasted.** Idle on Today, the router prefetched 20 addresses (each of the 5 tabs and 5 linked pages, twice), yet every tap still fetched again (T1). | 20 prefetch requests on Today in 3 s. | Costs data and battery on a phone for no gain. |
| T5 | **Opening the app is a full website load.** Each page load brings ~970 KB of JavaScript (316 KB compressed, 20 files), 44–83 requests, and the app opens `/`, which redirects to `/today` (one more round trip). | Cold load: Fast 76–259 ms · Phone 240–769 ms · WebKit +150 ms 765–1,301 ms (JavaScript cached after the first page). | Happens at launch, after iOS discards the web view in the background (the app reloads it), after a pull-to-refresh, and on any plain link. |
| T6 | **Some taps are full page loads.** Perks is a plain link (it needs its own security headers), and pull-to-refresh reloads the whole site. | A full load is T5's 0.8–1.3 s (WebKit +150 ms). | |
| T7 | **The tab's page is thrown away when you leave it.** One web view, one page at a time: a tab you come back to starts at the top, refetches and loses what you typed. | Seen in every loop. | Native apps keep each tab alive. |

## Scroll: the causes

| # | Cause | Evidence | Notes |
|---|---|---|---|
| S1 | **Rubber-band bounce at both edges, with the site's own bars inside it.** The web view's `bounces` is on by default on iOS, and `pullToRefreshEnabled` forces it on; Android's `overScrollMode` defaults to "always" (glow and stretch). | `PortalView.native.tsx` sets `pullToRefreshEnabled` and neither `bounces` nor `overScrollMode`. react-native-webview [reference](https://github.com/react-native-webview/react-native-webview/blob/master/docs/Reference.md). | The site's top bar and tab bar are part of the bouncing page, while the native bar above stays put, so the chrome visibly separates when the page bounces. CSS `overscroll-behavior` doesn't stop it on iOS ([WebKit bug 275947](https://bugs.webkit.org/show_bug.cgi?id=275947)). |
| S2 | **A pull at the top of any tab reloads the whole site.** Pull to refresh is on everywhere. | Same file. | A fling up to the top can trigger a 0.8–1.3 s reload with a blank flash (T5). |
| S3 | **Web momentum, not native momentum.** iOS web views default to `decelerationRate` "fast" (0.99); native lists use "normal" (0.998). | react-native-webview reference. | Scrolling stops early and feels sticky: the clearest "this is a website" signal. |
| S4 | **Two top bars.** The native bar (community name, •••) sits above the site's own 56 px bar (fund mark, name again, avatar). In demo mode the demo banner sits between them. | Screenshot `../mobile-app/reports/build3/01-signed-in.png`. | About 100 px of the screen for two headers saying the same name. |
| S5 | **The site's top bar is sticky with a blur (`backdrop-filter: saturate(1.2) blur(8px)`).** | Computed style in every run. | Blur re-renders behind the bar on every scroll frame. WebKit has open bugs on sticky elements lagging the scroll ([231953](https://bugs.webkit.org/show_bug.cgi?id=231953)) and on blur under sticky parents ([298709](https://bugs.webkit.org/show_bug.cgi?id=298709)). Desktop engines kept 60 fps (below), so the cost on older phones is likely but unproven: cheap to remove and compare. |
| S6 | **The fixed tab bar is laid out by WebKit, not the phone.** | Known WebKit behaviour. | It rides the bounce (S1), and jumps when the keyboard opens in a composer. A native tab bar would do neither. |
| S7 | **Website gestures.** Long-press on a link shows iOS's link preview (`allowsLinkPreview` defaults to on); text can be selected anywhere; 21 hover styles aren't limited to devices with a mouse, so a tapped item keeps its hover look; swipe-from-edge uses WebKit's page snapshot, not a native back. | `parts.css` has 21 `:hover` rules and no `@media (hover: hover)`. | Each small, together a "website in a frame" feel. |

**Frame times (3 s of scrolling up and down, Today, People, Rooms):** Chromium Fast and Phone: median 16.7 ms, 95th
percentile 16.8 ms, at most one frame over 33 ms. WebKit: median 15 ms, 95th percentile 16–30 ms (People), max 33 ms.
So the pages themselves are not heavy to scroll on a desktop CPU. The roughness the owner felt is the web view's
behaviour (S1–S3, S6) and the double, blurred chrome (S4–S5), not slow page code. The blur on an older phone is the
one open question; a device check settles it.

## How good React Native apps handle this
- **Discord** (React Native on iOS and Android): the hot spots are native, the chat list is native with JavaScript only
  fetching data, and they built their own list when the shared one showed blank rows on cheap phones
  ([Discord, 2025](https://discord.com/blog/supercharging-discord-mobile-our-journey-to-a-faster-app)).
- **Shopify** went all-in on React Native and built FlashList
  ([FlashList v2](https://shopify.engineering/flashlist-v2)); in September 2026 it announced a move back to Swift and
  Kotlin, because AI makes building twice cheaper, not because React Native was slow
  ([back to native](https://shopify.engineering/back-to-native)).
- **Coinbase** moved fully to React Native in 2021; its speed work was cutting extra re-renders
  ([Coinbase](https://www.coinbase.com/blog/optimizing-react-native)).
- **Bluesky:** one Expo codebase for iOS, Android and the web, with real native views on phones, no web views
  ([social-app](https://github.com/bluesky-social/social-app)).
- **Slack** is native Swift and Kotlin, not React Native ([Slack](https://slack.engineering/stabilize-modularize-modernize-scaling-slacks-mobile-codebases/)).
  Clubhouse and X Spaces: native apps per press reports (unverified).
- **Basecamp and HEY (Hotwire Native)** are the closest to us: "Content is all web. Navigation is all native." A
  native tab bar, each tab with its own navigation stack, every tab's start page loaded up front "so switching tabs is
  instant", and a cached snapshot for the back gesture ([how it works](https://native.hotwired.dev/overview/how-it-works),
  [tabs](https://native.hotwired.dev/ios/tabs)).
- **Expo** now ships a real system tab bar for Expo Router (`expo-router/native-tabs` from SDK 58; tapping the current
  tab pops to its top) ([native tabs](https://docs.expo.dev/router/advanced/native-tabs/)). Expo says its own
  web-view-inside-native "DOM components" "aren't a silver bullet" for scrolling and gestures
  ([DOM components](https://docs.expo.dev/guides/dom-components/)).

The common thread: lists, navigation and the tab bar are native or feel native; nobody good runs the tab bar inside
the web page.

## What this means
| Cause | Fixed by tuning the web view and pages | Needs a native tab bar | Needs native screens |
|---|---|---|---|
| T1 tap waits for the server | Yes: `loading.tsx` per tab makes the tap move at once; reused visited tabs | Partly: keeping each tab alive makes revisits instant | Only with a local cache |
| T2 no feedback | Yes: light the tab on press | Yes | Yes |
| T3 network | No (physics); hidden by T1/T2 fixes | No | Hidden by a cache |
| T4 wasted prefetch | Yes (prefetch becomes useful) | — | — |
| T5 cold load | Partly: start on `/today`, keep the web view warm | Partly | Yes, for those screens |
| T6 full loads | Yes: no pull-to-refresh | — | — |
| T7 tab thrown away | Partly (scroll restore) | **Yes**: one web view per tab | Yes |
| S1–S3 bounce, reload, momentum | **Yes**: three web view settings | — | — |
| S4 two bars | Yes: one bar | — | — |
| S5 blur | Yes: solid bar | — | — |
| S6 fixed web tab bar | No | **Yes** | Yes |
| S7 website gestures | Yes: settings and CSS | — | — |
