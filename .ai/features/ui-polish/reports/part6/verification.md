# Part 6 (Rooms): verification

Verifier: a different agent from the builder. Branch `absi-agent/ui-p6` at 833962e2 (plus one test-only change), the
built app (`next start`, demo mode, a throwaway database) and the store app's web build (`mobile/dist-web`) in its web
preview. Demo people only: Sam Lee (member), Maya Ortiz (admin, host). Chromium with a fake microphone. Pictures are
1x, viewport-sized. Scripts: `.ai/tmp/verify-p6/` (not committed).

**Overall, first pass: FAIL** (three defects). **Re-check after the repairs (commit 612b2206): PASS. Re-check after
the rebase onto Part 7's native tab bar (head 67a8e68c): PASS. Re-check after Part 2 (head 982ce3e1): PASS (its one
new minor defect, demo mode in the store app, fixed and re-checked).** All three
defects and the smaller ones I re-tested are fixed, and nothing new broke. The parts that need a real phone or Part 3
are still NOT RUN. The rows below are the first pass; "Re-check" at the end replaces rows 1, 8 and 10 and defects 1–5
and 7.

## Results

| # | Check | Result | Measured | Pictures |
|---|---|---|---|---|
| 1 | Rooms list | **FAIL** | "Start a room" is 106×36 on the title's row (title at y 129–163, button at y 128–164), 6 px radius. Live card: 8 px radius, 1 px rule border, 16 px padding, white. "Live" is 12 px/600 #9c4e22, the host 13 px graphite, the dot 8 px. Title 17 px/600 Plex Sans, 22 px line. Faces 40 / 28 / 28 / 28 px, each overlapping the one before by 8 px. "Priya + 4" 14 px graphite. Join 54×36. The scheduled card's time is 13 px/600 and its "Remind me" is 36 px. Tapping the card's corner or its words joins. **Tapping the faces does nothing** (defect 1). Room alerts is the page's last row (63 px: a 20 px bell, 15 px label, 13 px "Quiet times"). Its switch went from on to off, stayed off after a reload, and was put back on (also after a reload). At 1280 there are 2 live cards per row (x 304 and 776, 464 px wide each). With one title made longer, both cards grew to 154 px, so rows stay equal. | after-rooms-390, after-rooms-1280, after-rooms-390-dark |
| 2 | Web room at 390 | PASS | No tab bar and no community bar (both computed hidden). One header, 52 px tall (99 px with --sat 47): "‹ Rooms" 83×44, Leave 64×44 (15 px/600, live colour), More 44×44. Title 22 px Newsreader 600. The line under it is 14 px graphite: "Maya Ortiz · 2 in the room". Faces 64×64, with 4 grid columns at 390, 3 at 360 and 300, and 6 at 1280. Names 13 px, role lines 12 px graphite ("Host", "Listener", "Speaker"; "Hand up" in the live colour). Bar 88 px tall at the screen's foot (bottom 810 with --sab 34). The main button is 56 px round with a 12 px caption. React and Chat are 44 px round with 24 px icons at stroke 1.5. Accessible names: Rooms, Leave, More, Raise/Lower hand, Mic on/off, React, Chat. No emoji or text-character icons; the reaction picker's emoji are the only emoji. The More, React and Chat sheets take 14%, 18% and 20% of the screen and have a 16 px radius. A reaction showed on Maya's screen, and a chat line reached her. | after-room-390, after-room-390-insets, after-room-more-390, after-room-react-390, after-room-360, after-room-300 |
| 3 | Hands and stage | PASS (but see defect 2) | Sam taps Raise hand: the button fills with ink, its caption and name become "Lower hand", and the line "Hand raised. The host sees it." shows with Undo (44 px tall). It lasted about 4.5 s. Maya sees "Hand up" under Sam and a "Raised hands (1)" chip, 156×32. Undo lowered the hand: the chip went away and Maya saw "Listener" again. When Maya chose Invite to speak, Sam was on stage within 23 ms and saw the banner (ink, 374×84 at 390, wrapped onto two rows; Unmute 80×36). Unmute turned his mic on, and Maya's view lost his muted badge. In a second round, "Back to listening" on the banner made him a listener again. Maya's face sheet offered "Move to audience" and "Make co-host", and Move to audience worked. Rename, Leave (header) and End room work. | after-room-hand-390, after-room-banner-390, after-room-hands-sheet-reopens-1280, after-room-host-1280 |
| 4 | App room (web preview, 390) | PASS | Title font Newsreader-SemiBold 22 px. Other text is IBMPlexSans-Regular or SemiBold. Every icon button draws an SVG: Minimise, More, Raise hand, React. "Leave" is a word. No emoji except in the reaction picker. Live dot rgb(156,78,34) = #9c4e22, and #e7a57e in dark. The sheet's top is at y 8 (16 px radius) and the dimmed page shows above it. Raise hand → line with Undo; Undo worked (Maya saw "Listener"). | after-app-room-390, after-app-react-390, after-app-more-390, after-app-hand-390, after-app-room-390-dark, after-app-room-360, after-app-room-300 |
| 5 | Mini player (web preview, insets 0) | PASS; the store build 5 item is NOT RUN | On Today, the bar is 390×56 at y 732–788 and the tab bar is at y 788–844: a 0 px gap, with the tab bar fully visible. Same at 360 (628–684 / 684–740) and 300 (458–514 / 514–570). The main control and Leave are each 44×44, named "Raise hand"/"Lower hand" and "Leave"; the title area is named "Back to Maya's room". The dot is #9c4e22, and the fonts are Plex 15 px SemiBold / 13 px Regular. The hand button raised the hand: Maya saw "Hand up" and the chip. Tapping the title reopened the sheet (top 8). Leave on the room page showed "You left the room." with Join again, cleared --mini, and Maya's room count dropped to 1. | after-app-mini-today-390, after-app-mini-hand-390, after-app-left-390, after-app-mini-rooms-360, after-app-mini-rooms-300 |
| 6 | Page padding | PASS | Today scrolled to the end: the last item ("Source code") ends at y 700 and the mini bar starts at y 732. Main's bottom padding is 144 px. | after-app-mini-today-end-390 |
| 7 | On a pushed screen | PASS for the room page; NOT RUN for a thread | On the room page (data-pushed-screen) the bar sits at the bottom inset (y 788–844, tab bar hidden). On main, an Inbox thread is not a pushed screen yet (Part 3): it keeps the tab bar and its composer sits in the page (sticky, y 474–532), not pinned to the bottom. The mini bar sat correctly above the tab bar there. | after-app-mini-roompage-390, after-app-mini-thread-390 |
| 8 | Sheets hide the mini bar | **FAIL** (the menu) at first; **PASS on re-check** | Real Sheets work. The room page's More sheet set html[data-sheet-open] and the bar hid; it came back when the sheet closed. The /parts sample sheet on a tab page did the same. **The avatar menu (the menu the check names) is a dropdown (role=menu), not a Sheet**: it never sets data-sheet-open, and the mini bar stays over it and covers the menu's lower rows (defect 3). | after-app-mini-sheet-open-390, after-app-mini-menu-390 |
| 9 | Reduced motion | PASS (the app's speaking ring: code read, not seen) | App room sheet, normal: its top moves 852 → 313 → 99 → 36 → 14 → 8 over about 300 ms. Reduced: hidden, then at 8 in the next frame, with no slide. Web, reduced: no element on the page animates. The live dot's animation is "none", against "vr-pulse" normally. A speaking ring, forced on, shows "none" with a solid 2 px ink ring, against "vr-ring" normally. The fake microphone never triggered LiveKit's speaking detector, so I did not see a real speaking ring in either app. The app's SpeakingRing takes `isSteady` from reduced motion (code). | — |
| 10 | Outline | PASS (at the limit); **re-check: exact match** | The Rooms tab, tapped from Today with the page's response held back 4 s, showed the outline. Outline against the real page: title (16,129) on both. Button 112×36 at x 262 against 106×36 at x 268; both right edges at 374. First card top 234 against 242 (**8 px**, the limit), with each row inside it 8 px higher too. The outline's section label is 8 px shorter than the real "Live now" label. | after-rooms-outline-390 |
| S1 | Sizes at 390 in the app with --sab 34 / --sat 47 | PASS with a caveat | The site's side is right: the tab bar grows to 90 px and the page reports 56 px visible. The preview's native insets are 0, so the bar sits at 56 px from the foot and covers the tab bar's icons in this simulation only. On a phone the app adds the real 34 px. That is checked in code, but the real phone is NOT RUN. Since the rebase, Part 7's native tab bar places the bar, so this row no longer applies; I removed its picture. | — |
| S2 | 360×740 and 300×570 | PASS | No sideways scroll (scrollWidth = width) on the list, the web room or the app room. No button label wraps. At 300, "Schedule for later" moves to its own line under the note, which is fine. The app room's buttons stay at 44 px. | after-rooms-360, after-rooms-300, after-room-360, after-room-300, after-app-room-300 |
| S3 | Light / dark | PASS | Dark: "Live" and Leave are #e7a57e, and Start a room is light on ink. The app sheet is #0e0e0d with a #e7a57e dot. | after-rooms-390-dark, after-room-390-dark, after-app-room-390-dark |
| S4 | Bright accent #FFD400 | PASS | Set up made the primary colour #836D00 with white text (its contrast fix). Start a room, Join and the switch use it and read well. The live dot stays the live colour, and the room's main button stays ink. The accent was put back to #111110 (checked in the database). | after-rooms-390-accent |
| S5 | Heights on one row | PASS | Header: back, Leave and More are all 44. Bar: React and Chat both 44, round. Card: Join 36. Scheduled card: Remind me 36. Banner: Unmute and Back to listening both 36. |
| S6 | Accessible names | PASS | Read from the accessibility tree: More, React, Chat, Raise/Lower hand, Mic on/off, Leave, Minimise, "Back to <room>", and a switch named "Room alerts". Reaction buttons are named "React 👏" and so on. |
| S7 | Tests | PASS | `pnpm lint` (0 errors, 1 old warning in deploy/cloudflare), `pnpm typecheck`, and the voice + architecture + public-repo + shell suites (34 files, 821 tests) pass. In `mobile/`, typecheck passes and 20/20 tests pass. I did not run the full `pnpm test`. `site-tour.test.ts` is expected to fail until `pnpm tour:build`, and I did not count it. |
| — | Empty state | NOT RUN (optional) | The seeded live room would have had to be ended. |

## Defects

1. **The card's faces don't join (check 1).** As Sam at 390, open /rooms and tap the big first face on "Pricing your
   first enterprise deal" (any of the 4 faces). Nothing happens. A tap on the card's corner or on "Priya + 4" joins.
   Expected: the whole card joins, as SPEC.md's room card says. Cause: the avatars are `position: relative` (and their
   images absolute), so they paint above the title's stretched `::after` link. `elementFromPoint` on a face returns the
   avatar's IMG, not the link. A fix is `.vr-faces{pointer-events:none}`, or giving the stretch link a z-index under
   `.vr-over`.
2. **The host's "Raised hands" sheet opens by itself (new in this part).** Maya hosts and Sam listens. Sam raises his
   hand. Maya taps the "Raised hands (1)" chip, then Invite to speak, and the sheet closes because the list is empty.
   Later Sam is back in the audience (Move to audience, or Back to listening) and raises his hand again. Maya's Raised
   hands sheet then pops open over her room although she tapped nothing (html[data-sheet-open] goes false → true).
   Cause: `isHandsOpen` stays true when the list empties, and the sheet is
   `isOpen={isHandsOpen && hands.length > 0}`. It should be reset when the list empties or the sheet closes that way.
   Picture: after-room-hands-sheet-reopens-1280.
3. **The mini bar covers the avatar menu (check 8).** In the app's web preview, join a room as Sam, minimise, go to
   Today and tap the avatar ("Your menu"). The menu is a dropdown (role=menu, y 100–837) and doesn't set
   html[data-sheet-open]. The 56 px mini bar stays on top and hides the menu rows behind it (around "Feed" … "Sign
   out"). On a phone those rows can't be tapped under the native bar. Expected: the mini bar hides while the menu is
   open. Either the menu becomes a Sheet (if Part 2 does that, say so and recheck), or the page's watcher also reports
   an open `[role=menu]` / `data-state=open` menu. Picture: after-app-mini-menu-390.

Smaller ones (each is visible but doesn't block):

4. **The raise-hand line outlives the hand.** If the host brings Sam on stage within 4 s of his raise, the line "Hand
   raised. The host sees it." with Undo stays under the stage banner (after-room-banner-390), and its Undo would lower
   the hand of someone already on stage. Expected: it goes when the role changes.
5. **At 1280 the React panel opens under the sticky bar.** As Maya with chat open, tap React. The emoji panel appears
   below the chat panel, and its foot is hidden behind the sticky bottom bar (after-room-host-1280). With more people
   it would open fully off screen. The "Raised hands" chip also sits over the chat panel's bottom edge.
6. **A listener's "More" is nearly empty.** On the web and in the app, a listener's More sheet holds only "Never
   recorded." (after-room-more-390, after-app-more-390). The button looks like it leads somewhere and doesn't.
7. **The outline is at the 8 px limit** (card top 234 against 242). Any change to the head's spacing pushes it over. The
   outline's section-label row is 8 px shorter than the real one.

Not this part's (for the owners of Parts 2 and 3):
- The shell's "Source code (AGPL-3.0)" phone footer still shows on the room page (a pushed screen), between the faces
  and the bar, and after Room alerts on the list (Part 2: "No footer").
- An Inbox thread is not a pushed screen yet, and its composer isn't pinned (Part 3), so the thread half of check 7
  waits for it.

## Re-check after the repairs (commit 612b2206)

Both apps were rebuilt from 612b2206 and the containers were unchanged. I ran it in the foreground and stopped every
server and browser. Scripts: `.ai/tmp/verify-p6/recheck-web.mjs` and `recheck-app.mjs`.

| Item | Result | Measured | Pictures |
|---|---|---|---|
| Check 1, card taps (defect 1) | PASS | On the live card, a tap on the first face, the third face, or "Priya + 4" now joins. What sits under the finger is now the card's link, not the avatar's image. Join still joins. On the scheduled card, Remind me goes to "Reminder on", stays on /rooms, and goes back on a second tap. A tap on its host face or name opens that room's page ("Hiring your first salesperson"). | after-rooms-390 |
| Raised hands sheet (defect 2) | PASS | Maya opens the sheet (data-sheet-open on) and taps Invite to speak: the sheet closes. Sam goes back to the audience and raises again: Maya's sheet stays closed, and the chip shows "Raised hands (1)". Then Maya opens the sheet and Sam lowers his own hand: the sheet closes and the chip goes. | after-room-host-1280 |
| Check 8, avatar menu (defect 3) | PASS | In the web preview with the mini bar showing on Today, opening "Your menu" (role=menu, data-state=open, y 100–837) hides the bar. It came back after Escape and after a tap outside. Real Sheets still work: on the /parts sample sheet the bar hides while it is open and comes back when it closes. | after-app-mini-menu-390 |
| The hand line (defect 4) | PASS | On the web, Sam raises his hand and Maya invites him 118 ms later: Sam is on stage with the banner and no hand line. In the app preview, at 179 ms: on stage, banner shown, no hand line. | after-room-banner-390, after-app-banner-390 |
| 1280: chat and React (defect 5) | PASS | Maya with chat open taps React. Both panels come into view: chat 368–498 and emoji 514–600, both above the bar at 648. All 6 emoji are tappable (the point at each one's centre is the button). The "Raised hands" chip (608–640) overlaps neither panel. | after-room-host-1280 |
| Check 10, outline (defect 7) | PASS | Outline against the real page at 390. Title (16,129) 82×34 on both. The line under it is (16,170) 358×26 on both. First card (16,242) 358×132 on both, with each row inside it at the same y (259 / 285 / 317). The button is 112 px wide in the outline and 106 px on the page, with both right edges at 374. | after-rooms-outline-390 |
| Regression: web room at 390 | PASS | Header 52 px: Rooms 83×44, Leave 64×44, More 44×44. Tab bar hidden. 4 columns of 64×64 faces. Bar 88 px at y 756–844 with a 56 px main button. React and Chat 44×44. | after-room-390 |
| Regression: app room and mini bar | PASS | Sheet top 8, title in Newsreader-SemiBold, dot #9c4e22. Minimise, More, Raise hand and React draw SVGs and are 44 px (the main button is 64×76). On Today the mini bar sits at 732–788 against the tab bar's 788: a 0 px gap. Tapping the title reopens the room. | after-app-room-390, after-app-mini-today-390 |
| Tests | PASS | `pnpm lint` (0 errors, the same old warning), `pnpm typecheck`, and the voice + shell + architecture tests (33 files, 811 tests). In `mobile/`, typecheck passes and 20/20 tests pass. |

Still open from the first pass (not asked to change): defect 6 (a listener's near-empty More sheet), the Part 2 and
Part 3 items, and everything marked NOT RUN.

## Re-check after the rebase onto Part 7 (head 67a8e68c)

The store app now has Part 7's native tab bar, with one web view per tab. Its bottom slot docks the mini bar and
sends each tab's page `--mini`. Both apps were rebuilt and the containers were unchanged. I ran it in the foreground
and stopped every server and browser. Scripts: `.ai/tmp/verify-p6/recheck2-app.mjs` and `recheck2-web.mjs`. The web
preview is 390×844 with insets of 0.

| Item | Result | Measured | Pictures |
|---|---|---|---|
| Check 4, the app room | PASS | Title Newsreader-SemiBold 22 px, live dot rgb(156,78,34) = #9c4e22, sheet top at y 8. Buttons: Minimise, More, Raise hand and React draw SVGs (44×44; the main button is 64×76). "Leave" is a word. No emoji. The native tab bar is hidden while the sheet is up. | after-app-room-390 |
| Check 5, the mini bar | PASS (store build 5: NOT RUN) | On a tab page the bar is at y 732–788 and the native tab bar at 788–844, so there is no gap. It is the same on Rooms, Today, People, Inbox and Asks. The main control is 44×44 at (292,738), named "Raise hand"/"Lower hand"; Leave is 44×44 at (340,738), named "Leave". The hand button raised the hand (Maya saw "Hand up" and the chip) and lowered it again. Tapping the title reopened the sheet (top 8, bar gone). Leave on the room page showed "You left the room." with Join again: the bar went, --mini went to 0px, and Maya's room went down to 1 person. Back on Today afterwards: no bar, and --bottom-stack is the tab bar only. | after-app-mini-today-390, after-app-mini-hand-390, after-app-left-390 |
| Check 6, Today's end | PASS | The last item ("Source code") ends at y 700 and the bar starts at y 732. Main's bottom padding is 144 px. | after-app-mini-today-end-390 |
| Check 7, a pushed screen | PASS | On the room page the native tab bar is hidden and the bar sits at the bottom inset, y 788–844. The page has --mini 56px and --bottom-stack `calc(0px + 56px)`. The thread half is still waiting on Part 3. | after-app-mini-roompage-390 |
| Check 8, menus and sheets | PASS | With the avatar menu open, the mini bar and the native tab bar both hide. After Escape both are back. The /parts sample Sheet behaves the same. | after-app-mini-menu-390, after-app-mini-sheet-open-390 |
| Check 9, app reduced motion | PASS | Sheet top over time, normal: 702 → 212 → 71 → 26 → 11 → 8 over about 300 ms. Reduced: at 8 in the first frame, with no slide. | — |
| Switching tabs with the bar showing | PASS | Today → People → Inbox → Asks → Rooms → Today: the bar stays docked at 732–788 on every tab. Each tab's page has html[data-mini-player], --mini 56px and --bottom-stack `calc(calc(56px + 0px) + 56px)`. | — |
| Web, unchanged | PASS | Rooms list at 390: the title, Start a room 106×36, card 358×132 at y 242, faces 40/28/28/28, Join 54×36 and Room alerts at y 576 are the same as before. Tapping a face joins. Web room at 390: header 52 px (Rooms 83×44, Leave 64×44, More 44×44), title 22 px Newsreader, 4 columns, 64 px faces, bar 88 px at 756, 56 px main button, React and Chat 44 px. No tab bar or community bar. At 1280: cards 464 px wide in 2 columns, no sideways scroll. | (pictures from the first pass still hold) |
| Tests | PASS | `pnpm lint` (0 errors, the same old warning), `pnpm typecheck`, and the voice + shell + architecture tests (33 files, 811 tests). In `mobile/`, typecheck passes and 29/29 tests pass. |

Notes:
- `after-app-mini-rooms-360.png` and `-300.png` are from the first pass and show the site's own tab bar, not the native
  one. I didn't re-run 360 and 300 in the app.
- Inside each tab's page, the site's own tab bar still has `display:grid` under the native bar. The native bar covers it
  exactly (788–844), so nothing shows twice. Whether it should be hidden is Part 7's call.

## Re-check after Part 2 (head 982ce3e1)

Main now has Part 2: the frame, the menu sheet, no phone footer, the demo band under the top bar, and 16 px of top
padding on the page area. `.next` was rebuilt and `mobile/dist-web` is current. I ran it in the foreground and stopped
every server and browser. Scripts: `.ai/tmp/verify-p6/recheck3-web.mjs` and `recheck3-app.mjs`.

| Item | Result | Measured | Pictures |
|---|---|---|---|
| Check 10, the outline | PASS (an exact match) | Rooms tapped from Today, 390, with the page held back. Outline against the page: title (16,125) 82×34 on both, the line under it (16,166) 358×26 on both, "Live now" (16,212) 358×18 on both, first card (16,238) 358×132 on both, and the rows inside the card at 255 / 281 / 313 on both. Only the button's width differs (112 against 106), with both right edges at 374. I can't reproduce Part 2's "about 34 px" note on this head. 34 px is the demo band's height on wide screens, so the note was probably taken against the old page or with the band in the way. | after-rooms-outline-390 |
| The web room at 390 | PASS | Plain browser: the demo band is at 0–52 and the room's header at 52–104, so no gap, no overlap and no 4 px overshoot. Rooms 83×44, Leave 64×44, More 44×44. Title at y 112, the line under it at 144, bar 88 px at 756, 4 columns, no tab bar, no community bar, no footer. These are the same numbers as before. With --sat 47 / --sab 34: header 52–151 (99 px), its row at 103, bar 722–810. On a short screen, scrolled, the header stays at y 0 (row at 4 plain, at 51 with --sat 47). There is no `.fh-back` or other "Back" control on the room page, in a plain browser or in the app. | after-room-390, after-room-390-insets |
| In the app, the room page under the sheet | PASS, except the defect below | With html[data-app] and insets 0: band 0–52, header 52–104, and no stray back button from Part 2's rules. | after-app-mini-roompage-390 |
| Check 1, quick | PASS | 390: Start a room 106×36 on the title's row, card 358×132 with an 8 px radius, a 17 px/600 title, faces 40/28/28/28, Join 54×36, Room alerts the last row, no footer, no sideways scroll. Tapping a face joins. 1280: 2 cards in 2 columns, 464 px each. | after-rooms-390, after-rooms-1280 |
| Checks 5 and 8, quick (web preview) | PASS | On Today the mini bar is at 732–788 and the native tab bar at 788–844, so there is no gap. The main control and Leave are 44×44. The avatar menu is now a Sheet: while it is open, html[data-sheet-open] is set and both the mini bar and the native tab bar hide. After Escape, or a tap outside, both come back. Leave from the bar removes it. | after-app-mini-today-390, after-app-mini-menu-390 |
| Tests | PASS | `pnpm lint` (0 errors, the same old warning), `pnpm typecheck`, and the voice + shell + architecture tests (33 files, 818 tests). |

**New minor defect (demo mode, store app only): a status-bar-sized gap above the room's header.**
1. Run the store app's web preview in demo mode.
2. Join a room and minimise it, so the room page shows under the sheet.
3. On the page's `<html>`, set `--sat: 47px; --sab: 34px` to stand in for a phone's status bar.

Result: the demo band grows to 0–99 because, for an own-header page in the app, it already pads `8px + var(--sat)`. The
room's header then sits at 99–198 and adds `var(--sat)` again, so its row starts at y 150. That leaves a 47 px blank
strip between the band and "‹ Rooms" (after-app-roompage-sat47-390). Expected: the header's row sits right under the
band. It still needs the status-bar padding once it sticks at the top after the band has scrolled away.

The plain browser isn't affected (no band padding there), and neither is a community outside demo mode (no band). One
possible fix: when the band is present in the app, drop the header's `--sat` padding while it isn't stuck. Another:
let the band stop carrying `--sat` on own-header pages and let the header carry it, with the band inside the header's
sticky area or the header's sticky top set to the band's foot.

**Re-check of that defect, with the fix** (voice.css, under 1000 px:
`html[data-app]:has(.fh-app .fh-demo-bar) .vr-header{min-height:52px;padding-top:0}`; `.next` rebuilt): **PASS.**
I re-ran the same steps in the web preview: room page after minimising, with --sat 47px on html.
- 390×844: band 0–99, header 99–151, the "‹ Rooms" row at 103–147, More 44×44 at 103–147, title at 159. The strip is
  gone. With insets 0: band 0–52, header 52–104, row at 56–100.
- 300×570: the same, band 0–99, header 99–151, row at 103–147.
- In the app the room page doesn't scroll at 390×844 or 300×570 (scrollHeight minus the window height is 0), so the
  header never sticks under the status bar without its padding. In the app this page has no Leave in its header (Leave
  is on the sheet and the mini bar), so only More is measured.
- Plain browser at 390 (no data-app), unchanged: band 0–52, header 52–104 (padding 0), Rooms 83×44, Leave 64×44, More
  44×44, all at 56–100, title at 112, bar at 756–844. With --sat 47: header 52–151 (99 px, padding 47), row at
  103–147, bar at 722–810. Scrolled on a short screen, the header is stuck at 0–99 with its row at 51–95.
- after-app-roompage-sat47-390.png was replaced and now shows the row right under the band.

## Undo after 4 s instead of 2.5 s
4 s (about 4.5 s measured) is the right call. With a 44 px Undo target, 2.5 s is too short to read the line and reach
Undo, and 4 s is still brief enough not to sit over the bar. Tie the line to the hand state, though (defect 4).

## References compared (read-only, not copied)
the benchmark's scratch folder `.ai/tmp/ui-benchmark/mobbin/` (not committed)
- rooms-x-miniplayer.png, rooms-x-live-host.png, rooms-x-live-speaker.png, rooms-x-space-sheet.png (the live room and
  the docked bar)
- rooms-clubhouse-roomcard.png, rooms-clubhouse-hallway.png, rooms-clubhouse-liveroom.png,
  rooms-clubhouse-raisehand-sheet.png, rooms-clubhouse-invited-to-speak.png (cards, faces, hand, the stage banner)
- rooms-discord-voice-empty.png (the empty room's words)
