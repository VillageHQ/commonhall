# ui-polish Part 1: independent verification

I verified build `8befb542` (branch `absi-agent/ui-p1`) without having written it. The app ran with `next start` in demo mode
against the throwaway Postgres `ui-p1-pg` (127.0.0.1:9561), using the made-up people Sam Lee (member) and Maya Ortiz (admin).
Chromium (playwright-core) drove it at 390×844 (mobile, touch), 360×740, 300×570 and 1280×800. I also ran it inside the store
app's web preview (`mobile/dist-web` served by `mobile/scripts/web-preview.mjs`, with `html[data-app]` set by the app). The
scripts are in `.ai/tmp/verify-p1/` (a, asks, b, c, d, preview, preview2). All numbers are CSS px.

## Checks

| # | Result | Measured | Pictures |
|---|---|---|---|
| 1 | PASS | `/parts`, section "Round 8: shared sizes and parts", the same at 390 and 1280. Button 44, small 36 (14 px/600), Input 44, SearchBox 44, Chip 32 (14 px/500), Filter 44. Every radius 6 px. Search field `box-shadow: none`. Search icon 20 px at x 12, text at 40 px. Textarea 96. The chip row scrolls (`overflow-x: auto`, nowrap, 674 > 374 at 390). | after-parts-round8-390/1280, before-parts-search-390/1280 |
| 2 | PASS | Today's intro-row "Answer" (`.fh-btn-sm`): 36 px, radius 6, 14 px/600. Asks' chips "Open", "For you 2" and "Yours": 32 px, radius 6, 14 px. | after-today-390, after-asks-390, before-today-390, before-asks-390 |
| 3 | PASS | People at 390, as Sam: the search box 44 px (top 182, bottom 226, radius 6) and Filter 44 px (top 182, bottom 226, radius 6). Edges line up to 0 px. Same at 1280 (132/176). | after-people-390, before-people-390 |
| 4 | PASS | After typing "fintech", the list drops from 20 people to 4 (`?q=fintech`). ✕: 44×44 hit area with a 28 px circle in `rgb(236,236,232)` and a 14 px ✕, flush right; the picture shows the grey circle, not the browser's blue ✕. A touch tap empties the value (""), keeps the focus in "Search people", brings back 20 people (URL `/people`) and removes the ✕. Accessibility tree: `button "Clear search"`. Same at 1280 with a mouse click. | after-people-search-typed-box-390, after-people-search-typed-390/1280, before-people-search-typed-390 |
| 5 | PASS | Computed font-size 16 px for: the Asks box (textarea), Asks search, People search, the settings fields `/me/booking` (url), `/me/network` (linkedinUrl) and `/me/password`, and the Inbox box (a thread's "Write a message"). The Inbox list itself has no field. | — |
| 6 | PASS | Asks at 390: `resize: none`, starts at 96 px, `field-sizing: content`. With Shift+Enter it grows 96 → 110 → 132 → … → 220 → 240 (9 lines), then stays at 240 and scrolls (scrollHeight 262…350, overflow-y auto). Emptied, it goes back to 96. Plain Enter posts the ask, which is the page's existing behaviour. | after-asks-typed-390 |
| 7 | PASS | `--sab: 34px` on html: tab bar 90 px (754–844), icon bottoms 59 px over the screen's bottom edge (≥ 34), tab links end exactly 34 px over it. Main padding-bottom 122 (= 90 + 32). Last item of Today ends at 722, 32 px over the bar (754). A toast (an injected `.fh-toast`; no real toast trigger was reachable) sits at bottom 738 < 754, CSS bottom 106 = 90 + 16. Adding `--mini: 56px`: last item 722 → 666 and toast 738 → 682, so both move up exactly 56. The bar stays put. | after-tabbar-inset-390, before-tabbar-iphone-inset-390 |
| 8 | PASS | At 390, adding `[data-pushed-screen]` hides the tab bar (`display: none`). `--tab-total` becomes the inset, and main padding-bottom drops to 66 (34 + 32) with `--sab: 34px`, or 32 with no inset. Removing it brings back the 56 px bar. `[data-own-header]` hides `.fh-topbar` and sets `--topbar-h: 0`. As Maya on /people, scrolled 900, the founder-view strip moves from top 56 (under the bar) to top 0. In the store app with `--sat: 47px` it moves from 103 to 0. | after-founder-strip-390, after-own-header-390, after-own-header-scrolled-390, after-inapp-founder-strip-390 |
| 9 | PASS | Sample sheet at 390×844: height 717.4 (≤ 718), max-height 717.4, flush with the bottom, 16 px top radius, grabber. Every way of closing works and clears `data-sheet-open`: Escape, a backdrop click, a backdrop touch tap, a 120 px mouse drag on the grabber, a 100 px mouse drag on the head, and 120 px real touch drags (CDP) on both the grabber and the head. A 50 px drag springs back and stays open. Tab ×12 and Shift+Tab ×12 keep the focus inside every time. After closing, the focus returns to "Open the sample sheet". `data-sheet-open` is set while open. At 1280 it is a centred dialog: 680 high, 60 px from top and bottom, 360 px from each side, with a fade and no slide. | after-sheet-390, after-sheet-1280, after-inapp-sheet-390 |
| 10 | PASS | As Maya at 390 and 1280, /admin/members and /admin/invites: small buttons are 32 px ("Resend", "Send invites", "Revoke"), and the one medium button ("Clear this profile", inside a closed section) is 40 px, as decision 5 says. No table cell overflows (scrollWidth ≤ clientWidth on every td/th), no button is cut, no label wraps, and there is no sideways scroll (390/390, 1280/1280). | after-admin-members-390/1280, after-admin-invites-390/1280, before-admin-*-390/1280 |
| 11 | FAIL (one sub-item; the page belongs to another part) | No sideways scroll anywhere: scrollWidth equals the viewport on /rooms, /today, /asks, /people, /inbox, a profile (/people/<Ada Okafor>), /me and /parts, at 390, 360 and 300. No button or chip is cut or off screen, and the chip rows scroll. **But one label wraps inside a button:** on the profile, the quiet small button "Don't notify me about Ada's rooms" breaks onto 2 lines (264×50 at 390, 234×50 at 360, 174×50 at 300). At 300, /parts' sample public card "Try it as Sam (member)" also wraps (194×54). | after-profile-mute-button-390, after-today/asks/people-360, after-today/asks/people-300 |
| 12 | PASS | `pnpm lint` exits 0 (1 warning, in `deploy/cloudflare/worker.js`, not this part). `pnpm typecheck` exits 0. `pnpm test` (test DB 9561/community_test): 3698 passed and the 2 known failures: `deploy-setups` (CRLF) and `site-tour` (needs `pnpm tour:build`). | — |

### Checks every part's verifier also runs
- **Dark mode (PASS).** With `class="dark"` on html, primary buttons are `rgb(243,213,107)` with ink text `rgb(22,22,21)` (accent #FFD400), and the clear circle is `rgb(42,42,39)` with a light ✕. Readable. Pictures: after-today-dark-accent-390, after-parts-dark-390.
- **Bright accent (PASS).** I set the accent to #FFD400 in Set up as Maya (throwaway DB), then put it back to the original `#111110`. `--fund` became `#836d00` (darkened for contrast) with white text on Save, Post, Answer, Join and I can help. Pictures: after-parts-accent-ffd400-390, after-today-accent-ffd400-390.
- **Reduced motion (PASS).** With `prefers-reduced-motion: reduce`, the sheet is in place 20 ms after opening (`animation: none`, `transform: none`). Without it, 20 ms after opening the sheet is still at `translateY(524px)` (`fh-sheet-up 0.25s`).
- **Names (PASS).** The clear button is "Clear search" and the sheet's ✕ is "Close" (accessibility tree).
- **In the store app (web preview, PASS).** Sam signed in with "Try it as Sam" inside the app; html has `data-app`. With `--sab: 34px; --sat: 47px`:
  - the top bar is 103 px (padding-top 47) and the tab bar 90 px (icons 59 over the bottom), on all of /today, /rooms, /asks, /people, /inbox, /me, /admin/members and /admin/invites;
  - nothing scrolls sideways (390/390);
  - the sheet's footer pads 46 (12 + 34);
  - pushed screen plus own header hides both bars, with main padding 66.

  Pictures: after-inapp-today/people/asks/sheet/founder-strip-390, after-inapp-signedin-390.

## Reference (Mobbin, not ours; compared, not copied)
- `.ai/tmp/ui-benchmark/mobbin/search-linkedin-typeahead.png` (the clear ✕ in a search field)
- `.ai/tmp/ui-benchmark/mobbin/search-instagram-typeahead.png`
- `.ai/tmp/ui-benchmark/mobbin/search-airbnb-filters.png` (a filter sheet with a pinned footer)
- `.ai/tmp/ui-benchmark/mobbin/rooms-x-space-sheet.png` (a bottom sheet with a grabber)
- `.ai/tmp/ui-benchmark/mobbin/tabbar-instagram.png`, `.../tabbar-whatsapp.png` (a tab bar above the home indicator)
- `.ai/tmp/ui-benchmark/mobbin/search-linkedin-web-people.png` (People search and Filter on one row)

## Other things I saw (not failures of this part's own files)
- Profile: "Don't notify me about <name>'s rooms" wraps onto two lines at 390 and narrower (see check 11). The Button keeps main's
  `whitespace-normal` ("a label too long for a phone wraps"), so this is very likely pre-existing; I did not run main to
  confirm. It belongs on the profile part's list.
- Today: inside the "You could help" cards, "I can help" and "Not for me" are 44 px medium buttons. The spec's size table lists
  "I can help" as a small 36 px action in a card. That is Today's own markup (Part 4's), not this part's classes.
- Asks: the 96 px text box sits beside a 44 px Post button. They don't share a height, which is the Asks part's layout, not Part 1's.
- Data side effect: while testing check 6, plain Enter posted 3 short test asks by Sam ("Line 1 of my ask", …) in the
  throwaway DB. Sam's week shows "2 of 5 asks left". It's throwaway data only.

## What I could not check
- A real toast trigger: I didn't find a copy/save action on the member tabs that raises `.fh-toast`, so I measured an injected
  `.fh-toast` element (computed position and bottom).
- Real device insets and the Android 130 % font scale: I simulated them with `--sab`/`--sat` and the 300×570 viewport, as the
  spec allows. Store build 5 on a device is out of my reach.

## Builder's follow-up on check 11
The builder measured the same profile button on a build of main (`390cbda2`, same demo data): "Don’t notify me about Ada’s
rooms" is already 264 px wide on two lines at 390 (234 at 360, 174 at 300). So the wrap predates Part 1, which changed only its
height (52 → 50, now `height: auto` instead of a fixed 40 px that the two lines spilled out of). Part 5 moves this button into
the profile's "More" sheet (parts/5-people-profile.md), which removes the wrap. Listed there as a follow-up.
