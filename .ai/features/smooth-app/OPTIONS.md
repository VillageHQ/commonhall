# Options: how to make the store app feel smooth

The causes and numbers: [DIAGNOSIS.md](DIAGNOSIS.md). Expo is React Native already, so the real question is how much
of the app stays a web view and how much becomes native screens.

## The point first
**Pick (a), tune the web view and the pages, built so that (b)'s native tab bar can follow if a phone still shows a
lag.** (a) removes or hides every measured cause except the web-drawn tab bar (S6) and the thrown-away tab (T7). It
also speeds up the website for everyone in a browser, adds nothing to the app's size, and keeps one copy of every
screen. Native Rooms and Today screens (b) and fully native screens (c) would mean writing each screen twice for an
AGPL product that funds run and change themselves; the measurements don't show page code as the problem.

## (a) Tune the web view and the pages
**What changes.** In the app's web view: no bounce, no pull-to-refresh (Reload stays in the menu), native momentum,
no Android stretch, no link previews. One top bar (the site's), solid instead of blurred. On the site: a `loading.tsx`
for each tab, so a tap moves at once to the new tab's skeleton and Link prefetch can work. The tab lights up on
press. Visited tabs are reused for a short time. Hover looks only on devices with a mouse. The app opens straight on
`/today`.

**What the user feels.** The tab lights and the page outline appears in the same frame as the tap (under 50 ms); the
content fills in one network round trip later. Scrolling stops bouncing, glides like a native list, and never reloads
by accident. One header. In a browser the website gets the same instant taps.

**How much it removes.** T1 hidden (the round trip still happens but behind an instant change); T2, T4, T6 gone;
T3 unchanged but hidden; T5 smaller (one redirect gone); T7 only partly (scroll restore); S1–S5 and S7 gone; S6 stays
(the tab bar is still drawn by WebKit and still moves with the keyboard).

**Build size.** No change to the app; a little more JavaScript on the site for the skeletons (a few KB).

**Keeping web and native in sync.** Nothing new to sync: still one copy of every screen. The app needs a new store
build for the web view settings (TestFlight 4).

**Cost.** About a day: 3 parts in parallel (site, app, check). **Risk.** `staleTimes` is marked experimental in Next
16 (see the fork in SPEC.md); skeletons must match each tab's layout or the page jumps.

## (b) Native shell: a native tab bar, native Rooms and Today, web views for the rest
**What changes.** A real iOS/Android tab bar (Expo Router's native tabs) with one web view per tab kept alive, as
Basecamp and HEY do. Rooms and Today rebuilt as native screens reading JSON from the server; everything else stays
web.

**What the user feels.** Everything (a) gives, plus: the tab bar never moves with the page or the keyboard, switching
back to a visited tab is instant with its scroll and typing kept, and Rooms and Today open from a local cache with
no wait.

**How much it removes.** All of (a), plus S6 and T7; T1 and T5 gone for the two native screens.

**Build size.** The native tab bar is small (system controls). Two native screens add their JavaScript to the app
bundle (well under 1 MB). Memory: five live web views instead of one; iOS shares web content processes up to a limit
and can discard one in the background, which the app must reload.

**Keeping web and native in sync.** The real cost. Today pulls from 8 modules (asks, intros, jobs, library, members,
network, perks, voice) and has no JSON API: one would be written, and every change to Today or Rooms would be made
twice, web and native, and checked twice. Each fund's own copy (AGPL) must carry both. Badges and the live dot must
come from the server to the native tab bar. Deep links, the room mini bar and the "come back to the room" flow move
into native navigation.

**Cost.** The tab bar with web views per tab: about a day. Native Today and Rooms with their APIs: several days,
then a double cost on every later change to those screens.

## (c) Fully native screens
**What changes.** Every member screen (38 pages) and the admin console (26 pages) rebuilt in React Native, the web
app kept for browsers.

**What the user feels.** The best possible: native lists, transitions, offline caches everywhere.

**How much it removes.** Everything, including the cold website load.

**Build size.** A larger JavaScript bundle (a few MB); no large native libraries needed beyond what the voice room
already has.

**Keeping web and native in sync.** Two complete apps forever: every feature, wording change and test twice. Round 6
alone changed 40+ screens in a day; each such round would double. Shopify's 2026 move to fully native rests on
AI-built twins being cheap, but they have a full team per platform.

**Cost.** Weeks to rebuild, then double every round after.

## Side by side

| | (a) Tune | (b) Native shell | (c) Fully native |
|---|---|---|---|
| Tap to visible change | < 50 ms | < 50 ms | < 50 ms |
| Tap to content, new tab | one round trip (0.2–1 s) behind a skeleton | same; instant for Rooms and Today from cache | instant from cache |
| Coming back to a tab | instant within the reuse window, else skeleton | instant, state kept | instant, state kept |
| Bounce, momentum, accidental reload | fixed | fixed | fixed |
| Tab bar moves with page or keyboard | still | fixed | fixed |
| App size | same | slightly larger; 5 web views in memory | larger bundle |
| Screens written twice | none | Today, Rooms (+ JSON APIs) | all 64 |
| Build time | ~1 day | ~1 day for the tab bar, several more for screens | weeks |
| Later cost per change | same as now | double for Today and Rooms | double everywhere |
| Helps the website in a browser | yes | no | no |

## The recommendation
1. Build (a) now: three parts in parallel (SPEC.md).
2. Measure again on TestFlight 4 with the same script and by hand on a phone. **If** a tab tap still feels late, or
   the tab bar's movement with the keyboard bothers the owner, build (b)'s **native tab bar with one web view per tab**
   (SPEC.md, part D). It costs about a day and adds no second copy of any screen.
3. Native Today or Rooms screens only if, after that, the cached-instant open is still worth writing them twice. The
   voice room is already native, which is where native mattered most (audio, the lock screen).
