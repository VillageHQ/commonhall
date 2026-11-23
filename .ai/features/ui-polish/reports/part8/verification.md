# Part 8 (fix pass): independent verification

Verifier: a separate agent that did not write the code. Date: 23 Nov 2026. Branch `absi-agent/ui-fixpass` at
`d354569c` (2 commits on `origin/main`).

## Setup
- **Site:** the production build that was already running (`.next/BUILD_ID` 15:24, and no file under `src/` is newer),
  with DEMO_MODE and only made-up people. The site's `APP_URL` is the preview's address, so a demo sign-in sent straight
  to `:3871` is refused ("This request came from another site", 403). Every web check therefore went through
  `http://localhost:3872`, the preview's proxy to the same server.
- **Store app:** the web preview at `http://localhost:3872/__app/`. Its `dist-web` was built at 15:29, after the last
  change under `mobile/src` (15:28). I joined `http://localhost:3872` and used "Try it as Sam" or "Try it as Maya".
- **Browser:** Playwright with Chromium 1243. Phone: 390×844, isMobile, hasTouch, deviceScaleFactor 1. App simulation in a
  plain page: `html[data-app]` with `--sat: 47px; --sab: 34px`. Desktop: 1280×800, plus 1280×600, 1440×900 and 1024.
- **Scripts:** `.ai/tmp/verify-p8/` (gitignored): `f1`–`f11*.mjs`, the app helper `app.mjs` and `lib.mjs`.
- **Throwaway database (`fixpass-pg`):** for the fill-in card I set `fill_in_basis` to `ask`, removed Sam's
  `member_lookup` row and later blanked his card for a minute. All three were put back afterwards: basis `terms`, the
  row restored, and the card's title, company, bio and "can help with" restored from a backup. Maya sent Sam two made-up
  messages ("Made-up verifier note …"). Two test rooms were started and are now ended. Sam was muted and then unmuted
  for Amara (0 mutes left). Sam's waiting intro (Ada) was opened but not answered.

## Results

| # | Fix | Result | What was measured | Pictures |
|---|---|---|---|---|
| 1 | Today's yes-or-no row and card buttons | **PASS** | At 390, all 3 waiting rows (the `target-member-ask` row, Marcus's intro, "Your ask") are children of `.td-rows`, each at x 0 and 390 wide, and every face is at x 16 (48 px). At 1280 every row is at x 288 and every face at x 304. Answer is 36 px tall. After it is tapped, "Yes, introduce us" (137×36) and "No thanks" (91.5×36) are both 36 px. The fill-in card was reached on /me and on /today (once Sam's card was empty): "Yes, fill it in" and "No, don't look me up" are both 36 px at 390 (318 wide, stacked) and at 1280 (100.9 and 158.9 wide). There is no sideways scroll. | fix1-today-intro-row-answer-open-390, fix1-fillin-card-today-390 |
| 2 | "Discard this ask?" over the composer | **PASS** | The body's children are: scrim z 70, composer sheet z 71, scrim z 72, then the question z 73. `elementFromPoint` on the composer (195, 40) returns `div.fh-scrim`. In the picture, the composer and the typed text are visibly dimmed. Tapping the dimmed composer closed only the question: the composer stayed open with its text. "Keep editing" returns to the composer with the text kept. "Discard" closes everything (0 sheets, 0 scrims, `data-sheet-open` gone), and the composer reopens empty. | fix2-discard-over-composer-390 |
| 3 | Sidebar foot under the demo band | **PASS** | Measured as Sam and as Maya, on /people and /today, at 1280×800, 1280×600 and 1440×900. At rest the sidebar runs from y 34 to the window's bottom (800, 600 or 900 respectively). At scroll 17 it runs from 17 to the bottom, and at 400 and at the end of the page from 0 to the bottom. The credit line's bottom is always 16 px above the window's edge (784 of 800), and the member row is never cut off. `animation-name` is `fh-side-fill`. | fix3-sidebar-foot-scrolled-1280 |
| 4 | Back button first in the keyboard order | **PASS** | At 390, on a profile, an ask, Maya's /admin/members/<id> and /me/alerts, the Tab order is: Skip link, then the back button (in the bar), then "Your menu". The back button is at x 4, 44 px tall, 17 px text (y 6 in a browser, y 53 with `--sat` 47), as before. Tapping it goes to /people, /asks, /admin/members or /me. With JavaScript off, the server's single copy sits in the same place (x 4, y 6, 44 px). At 1280 the page's link shows (x 298, y 66, 30 px tall, 15 px) and a click works. Resizing 390 → 1100 → 999 → 1001 → 390 always left exactly one visible back button. The thread page keeps its own header ("‹ Inbox" first, after the skip link). 24 other pushed screens at 390 and 1280 never showed two back buttons. | fix4-back-in-bar-app-sim-390 |
| 5 | Tab outlines land on the page | **PASS** | Each tab was tapped from /people and from /people scrolled to 700, with the server's answer held 2 s, at 390, 390 in the app simulation and 1280. For Rooms, Today and Asks, the outline's h1, first section label and first 44 px or 36 px block land at **0 px** offset from the real page in every case (Today's Answer box is at y 368 and the page's at 369, a 1 px gap). Example at 390 in the app simulation: Rooms h1 y 172 / 172, label 259 / 259, Join box 362 / 362. Today: h1 193 / 193, label 323 / 323, prompt 249 / 249. Asks: h1 173 / 173, prompt 221 / 221, search 287 / 287. At 1280: Rooms h1 70 / 70, "Start a room" box y 73 / 73. No offset remains of the ~34 px or 16–18 px that the earlier notes reported. | fix5-rooms-outline-vs-page-app-sim-390 |
| 6 | A header under the demo band in the store app | **PASS** | Measured with `data-app` and `--sat` 47 on a thread, a live room and a coming-up room. At rest the band runs 47–99 and the header 99–151, so the header sits right under the band with no extra gap (padding-top 0). The `body::before` paper strip runs 0–47 at z 45. Scrolled 600 px, the header sticks at 47–99, just under the strip; `elementFromPoint` at the header's middle is the header and at y 20 the strip. In a plain phone browser nothing changed: band 0–52, header 52–104 at rest and 0–52 scrolled, with no strip. | fix6-thread-header-app-rest-390, fix6-thread-header-app-scrolled-390 |
| 7 | Profile's More sheet: note and switch colour | **PASS** | After the tap, the note ("Their rooms won't alert you." / "Their rooms can alert you again.") is inside the sheet: a 28 px line at y 744 at 390, or in the popover at 1280. `elementFromPoint` on it returns `p.fh-person-menu-note`, so it is not under the scrim. The off track is rgb(181,180,173) = `--fh-switch-off` #b5b4ad. With `.dark` it is rgb(143,141,133) = #8f8d85. On, the track is rgb(17,17,16). On, then reload: still on. Off, then reload: still off. Sam is unmuted at the end (0 rows in `notification_mute`). | fix7-profile-more-muted-note-390 |
| 8 | No hydration warning | **PASS** | Each page was hard-loaded at 390 and at 1280. Maya: 25 /admin pages (including /admin, /admin/settings, members and a member, asks, intros, announcements, features, integrations, jobs, mail, perks, reports, report/send, rooms, village, audit, invites, calls, digest, health, links, weekly-email, start, import), plus /today and /people. Sam: 23 member pages. There were 0 console errors or warnings and 0 page errors: no "hydrat…", #418, #423 or #425. (This is a production build; see "What I could not check".) | — |
| 9 | Rooms | **FAIL** | What works: `.vr-bar` is gone from `globals.css`. The web room's bottom bar sits at the bottom: 756–844 on a phone, 722–810 in the app simulation (34 px inset), and closes the column at 1280. Sam as a listener in "Pricing your first enterprise deal" has no More button (0 `room-more`), and his line reads "Priya Shah · 1 in the room · Never recorded" (once). Maya as host has More with "Rename" and "Leave" only, Rename opens its form, and her line ends with "Never recorded". In the store app, joining from the Rooms tab opens the app's own room sheet: Sam has no More and the line is "1 in the room · Never recorded", while Maya has More with Rename and Leave. **What fails:** a coming-up or ended room's page prints code instead of "Never recorded": "Coming up · Hosted by Elena Rossi · function(){throw Error("Attempted to call NEVER_RECORDED() from the server but NEVER_RECORDED is on the client. …")}". I saw the same for my ended test room ("Ended · Hosted by Maya Ortiz · function(){…}"), at 390 and 1280. | fix9-FAIL-coming-up-line-390, fix9-room-listener-390, fix9-host-more-sheet-390, fix9-app-room-sheet-listener-390 |
| 10a | Tabs load behind the open one | **PASS** | After sign-in, the number of tab web views over time was: 1 (Today) at 0.5 s, 2 (+Rooms) at 1.5 s, 3 (+Asks) at 3.1 s, 4 (+People) at 4.1 s and 5 (+Inbox) at 5.7 s. It stayed at 5 until 12 s. So they load one at a time, about 1.2–1.6 s apart. A first tap on each preloaded tab created no new web view and showed no spinner in any frame. | — |
| 10b | Slide starts at about 30% | **PASS** | I sampled the incoming tab every frame from the tap. People: opacity 0.30 with x +40 px, then 0.36/+36, 0.45/+31, 0.77/+13, and 1/0 by 450 ms. Asks, Rooms and Today also started at 0.30 (with x −40 or +40) and ended at 1. With reduced motion every frame was at opacity 1 and x 0 (no slide). | — |
| 10c | Placeholder bar on a tab's first load | **PASS** | (Service workers were blocked so that the delay could be applied.) Cold start, with /today held 3 s and the app reloaded: for about 2.7 s the screen shows a 56 px bar with a grey mark, "Northwind Founders" and a grey face circle over paper rgb(250,250,247), with a small spinner below. Then the page lands. A tab tapped before it preloaded (Inbox, held 3 s) shows "Northwind Founders / Members" in the bar, with the hairline rgb(214,213,207). See "Other things I saw" for its background. | fix10c-first-tab-placeholder-app-390 |
| 10d | An alert moves a live tab in place | **PASS** | Sam was on People with Inbox alive. Maya sent him a message and the preview banner "Message from Maya Ortiz" showed; I tapped it. The Inbox tab showed the thread. Its frame's `performance.timeOrigin` stayed the same (1795441821137.3) and a marker left on `window` before was still there, so it did not reload. It had 1 navigation entry. The list's scroll comes back on a history back (scrolled to 120, opened a thread the way the alert does, `history.back()`: 120). The thread's "‹ Inbox" link is a new push, so it starts at the top. That is the same as an ordinary row tap, not new. | fix10d-alert-moves-inbox-in-place-app-390 |
| 10e | Low-memory Android | **PASS (read)** | Checked by reading the code. `PortalTabs.tsx` has `IS_LOW_MEMORY = Platform.OS === "android" && (Device.totalMemory ?? Infinity) < LOW_MEMORY_BYTES` (3 GiB), and the preload effect returns first thing when `IS_LOW_MEMORY` is true. `tabs.test.ts` covers `pickTabToPreload`. No unit test covers the low-memory skip itself, because it is a constant computed when the module loads. | — |
| 11 | Regressions | **PASS** | Today, Asks, People, Inbox and Rooms at 390, 390 in the app simulation, 1024 and 1280: no sideways scroll (scrollWidth − width = 0) and no element past the right edge. I looked at every screenshot and saw nothing overlapping or cut. Dark mode on Today and on a profile looks right. The tab bar navigates. The People filter sheet and the avatar menu sheet open at z 71 over a z 70 scrim and close cleanly. | — |
| 12 | Tests and size | **PASS** | `mobile/`: `npm run typecheck` is clean and `npm test` passes 32 of 32. This folder holds 15 pictures plus this report, 231,420 bytes in all (under 300 KB). `.ai/features/ui-polish/` totals 9,658,450 bytes including this folder, under 10 MB. | — |

## The failure: fix 9 (rooms that aren't live)
- **To reproduce:** sign in as Sam and open Rooms. Under "Coming up", tap "Hiring your first salesperson"
  (`/rooms/036418ad-…`). The line under the title shows the code above instead of "Never recorded". An ended room shows
  the same. (I started a room as Maya, ended it and reloaded its page.)
- **Cause:** `src/app/(app)/rooms/[roomId]/page.tsx` is a server component. It imports `NEVER_RECORDED` from
  `src/modules/voice/components/room-header.tsx`, which starts with `"use client"`. On the server, every export of a
  client module is a client reference, so the constant is a function, and `.join(" · ")` writes out its source.
- **Possible fix:** keep `NEVER_RECORDED` in a module that isn't a client module (for example
  `src/modules/voice/contract.ts`) and import it from there in `page.tsx`, `room-header.tsx` and `live-room.tsx`.
- **Missing test:** a page or render test that the coming-up and ended line reads "… · Never recorded" would have caught
  this.

## Other things I saw
- **The placeholder's colour once colours are known:** the loading cover uses `pageColors.bar ?? theme.paper`. After a
  page has reported its colours, that is the tab bar's white rgb(255,255,255), not the page's paper rgb(250,250,247). So
  a tab's first load is white, and the page then lands on paper. The difference is 2%, barely visible. The cold-start
  case uses paper. (`mobile/src/components/PortalTabs.tsx`, the `styles.loading` background.) Not a fail.
- **The app's room line has no host for a seeded room:** for Priya's demo room it reads "1 in the room · Never
  recorded". `RoomScreen` takes the host's name from the people connected in LiveKit, and the made-up host never
  connects. This was already the case before this change.
- **Today's intro row shows a date:** the intro row's meta shows "19 Nov" while the rows under it say "yesterday".
  `TargetMemberAsk` uses `formatDayMonth`. This was already the case before this change.
- **"Never recorded" in a closed web room:** the web room's line includes "Never recorded" only while live. Once
  closed ("This room has ended.") it shows just the host. That is reasonable, but different from the page line.
- **Room under 10 MB:** the round's folder is about 0.34 MB under 10 MB, so a further part's pictures need to stay small.

## What I could not check
- Real phones: true safe-area insets, the native slide's timing, the keyboard, and Android's memory check at runtime
  (10e was checked by reading the code).
- React's development-only warnings, such as "<div> cannot be a descendant of <p>": the running server is a production
  build, which reports only real hydration mismatches. None appeared. The admin Home outline's lede is now a `<span>`
  (`OutlineLine as="span"`) by reading.
- I did not rerun the site's `pnpm lint`, `typecheck` or `test`, nor `pnpm tour:build`, as the brief allowed.
- The browser processes of all my runs were closed. No Playwright Chromium is left running (the only chrome.exe
  processes are the user's own Chrome in Program Files). I did not stop or restart the servers.
