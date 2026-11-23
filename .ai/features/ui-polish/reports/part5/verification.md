# Part 5 (People and profiles): the verifier's report

Build `aeaaa09a` on `absi-agent/ui-p5`, checked on 23 Nov 2026 by a verifier who did not build it. The app was the dev
server on 3795 (demo seed, Sam as a member, Maya as an admin), plus a production build (`pnpm build`) served on 3796
behind the store app's web preview on 3797. Every number below was measured in Chromium (Playwright); the scripts are in
`.ai/tmp/verify-p5/`.

**Verdict: FAIL.** Two things fail: the "Book a call" button on the web experts list sits over the text, and focus
is lost when the filter panel closes. The rest passes.

## Checks 1–9

| # | Check | Result | Measured | Pictures |
|---|---|---|---|---|
| 1 | Search row, 390 and 1280 | **PASS** | 390: box 306×44 at y 182–226 (radius 6), Filter 44×44 at y 182–226 (radius 6), gap 8. Accessible name "Filter" (an sr-only word; the button has no aria-label). 1280: box 613×44, Filter 98.9×44 with its word, both y 132–176, radius 6, gap 8. 360 and 300: the same 44/44, top and bottom edges equal. | after-people-390, after-people-1280 |
| 2 | Filter sheet | **FAIL** (focus) | 390: Filter opens a bottom sheet (`data-form=sheet`, top radius 16, y 435–844, `html[data-sheet-open]` set). Its foot is pinned: "Clear all" (44 high, 16/600, underlined) and "Show 20 people" (145×44, radius 6). Choosing Sector = Agritech applies at once (`/people?sector=Agritech`), and the label turns to "Show 2 people". Show closes the sheet on 2 rows (Diego Alvarez, Ines Costa), the same as opening `/people?sector=Agritech` directly. The count pill is 16×16 with "1" and the name "Filter, 1 on". Clear all goes back to `/people` and the pill goes. Escape and a tap on the backdrop both close it. In the experts view the Role filter gives `/people?view=experts&role=mentor`, "Show 1 person", and Grace Kim only. 1280: the panel opens in place (720 wide, radius 8), with Clear all and "Show N people" (44) at its end; Filter toggles it shut. **The fail: after the sheet closes (Escape, Show, or the web's Show), the focus falls to `<body>`.** The next Tab lands on "Skip to main content", not on Filter. Tab stays inside the sheet while it is open. | after-people-filter-sheet-390, after-people-filtered-390, after-people-filter-1280, after-people-filtered-1280, after-people-experts-mentor-390 |
| 3 | Chips | **PASS** | Chips are 32 high with radius 6 at y 240 (12 under the row). "Mentors and experts" gives `/people?view=experts` with 5 rows (Grace Kim, Ines Costa, Lena Fischer, Marcus Webb, Oliver Grant). "Everyone" gives back `/people` with the same 20 names in the same order. `aria-pressed` follows the view. | after-people-experts-390 |
| 4 | Rows | **PASS** | At 390, 360, 300 and 1280, all 20 rows are at least 72 high (72, or 103 with tags). Avatar 48 at x 16 (1280: 320, which is 16 into the row). Text at x 76 (1280: 380). Name 16px/600 Plex Sans. The line-2 mark (logo or letter square, 16 px) starts at x 76 on all 20 rows (one distinct value). At most 2 tags, each 24 high. Line 2 ends in an ellipsis on one line. | after-people-390, after-people-300-full |
| 5 | Web: one column | **PASS** | The list is one block, 720 wide, and every row has x 304. | after-people-1280 |
| 6 | Empty | **PASS** | `/people?q=zzzz` shows the 48 px Search icon, "No one matches “zzzz”", "Try a name, a company or a skill." and a 36 px Clear. The networks row sits under it: 56 high and full width at 390 (x 0–390), "Search their networks for “zzzz”", two 20 px icons. The chips stay. With results (`q=Founder`) the row reads "Not who you need? …" and grows to 58 over two lines. | after-people-empty-390, after-people-empty-1280 |
| 7 | Profile at 390 | **PASS** | Avatar 96×96 at x 16, name x 16 (±0), and nothing beside it (the head is one 358 px grid column). Name 24px/600 Newsreader, headline 16 px, place 14 px. Tags are 24 high, 12 under the place. The action row is 16 under the tags: "Ask for an intro" 153×36 and "Message" 153×36 (equal), and "More" 36×36 named "More". At 360: 138/138/36. At 300 the buttons stack: "Ask for an intro" is 268×36 on its own line, then "Message" 224×36 with More beside it. Every label is one line (scrollWidth = clientWidth). No button is 52 or more high, and no label is on two lines. More holds "Don’t notify me about Priya’s rooms" (`role=switch`, 56 high). Tapping it POSTed `/api/notifications/mutes {isMuted:true}`, showed "Their rooms won’t alert you." and stayed on after a reload. Tapped again it POSTed `isMuted:false`. "Block Priya Shah" asked first with the same words as before, then POSTed `/api/members/block {isBlocked:true}` and showed "Unblock Priya Shah" and "You blocked this member…". Unblock POSTed `isBlocked:false`. **Priya is left unblocked and unmuted (checked after a reload).** Escape gives the focus back to More. | after-profile-390, after-profile-300, after-profile-more-390, after-profile-more-muted-390, after-profile-more-block-confirm-390, after-profile-more-blocked-390 |
| 8 | Cards and Apply | **PASS** | At 390, all 4 cards have gaps of 16 / 16 / 16 and radius 8. At 1280 the column gaps are 16 and 16, and the gap between the columns is 16. Section titles are 19px/600 Newsreader. "Apply" is 36 high, radius 6, 1 px outlined, and 292 wide inside a 324 tile (the tile's full content width) at 390. | after-profile-390-full, after-profile-1280 |
| 9 | Outline | **PASS** | I caught the real tap by holding People's RSC fetch back 4 s (`data-pending-tab="/people"` was set). Outline compared with the page, 390: search box, Filter, first row and face at dx 0, dy 0. Chips within 2.5 px (x) and 12 px wide (the outline's chip is wider, same x and y). First line dy 5. 1280: box dw 1.9, Filter dx 1.9, row and face dx 0, dy 0. Everything is within 8 px. | after-people-outline-390, after-people-outline-1280 |

## Checks every verifier runs

| Check | Result | Measured | Pictures |
|---|---|---|---|
| Expert row with Book a call (named in the brief) | **FAIL** | At 1280 in `/people?view=experts`, "Book a call" (122.5×36, radius 6) is **not at the row's right**. It sits at x 733–856, but the row ends at 1024 (the spec wants right 16, so 1008). It is also not centred on the row (button y 333–369, row middle 323.5). **On Lena Fischer's row it covers the end of her help line** ("…Berlin hiring" runs under the button). Cause: `.fh-lr-slot` (Part 1's ListRow) is `position: relative`, so the `position: absolute; right: 16px; top: 50%` in people.css anchors to the slot (right edge 872), not the row. Everything else passes: Book a call is not inside the row link (`closest('a')` is itself), tapping the row elsewhere opens Grace's profile, Tab goes from the name link to Book a call to the next row, and Book a call opens a new tab while the page stays. At 390 it sits in the slot under line 2 with no overlap. | after-people-experts-1280 |
| Sizes 390 / 360 / 300 | **PASS** (one visible flaw, below) | No sideways scroll on People, its empty state or the profile at 390 (390), 360 (360), 300 (300), or 1280. Chips stay one row. No label wraps in a button. Long-name test (my own long name put into a row, the profile h1 and the More sheet at 300): the row title ends in an ellipsis, the h1 wraps (overflow-wrap), the More rows grow to 60 and 82 high, and nothing spills out (sheet scrollWidth 300). | after-people-300-full, after-profile-300-full, after-people-longname-300, after-profile-more-longname-300 |
| In the app (web preview), 390 with `--sab: 34px; --sat: 47px` | **PASS** | `data-app` is set and there is no sideways scroll. The top bar is 103 high with the inset. On People the search row is 44/44 at y 229, chips 32, first row 72 with a 48 face at x 16. Scrolled to the end, the last content ends at 722, above the tab bar (754–844). The filter sheet ends at the screen's foot, its footer padding is 46 (12 + 34), and Show ends at 798. Profile: avatar 96 at x 16, name x 16, actions 153/153/36 × 36. In the More sheet the last row ends at 794 and the body's bottom padding is 50. The plain phone browser with the same variables also has its last content at 722 and the tab bar at 754. | after-inapp-people-390, after-inapp-people-filter-sheet-390, after-inapp-profile-390, after-inapp-profile-more-390 |
| Dark mode | **PASS** | Primary buttons, Show N people and the count pill: 16.18:1. Active chip 17.25:1. Tags 12.9 to 14.4:1. The sheets, rows and switch read well. | after-people-dark-390, after-profile-dark-390, after-profile-more-dark-390, after-people-filter-sheet-dark-390, after-people-experts-dark-390 |
| Bright accent `#FFD400` (as Maya, Set up › Brand colour, then set back to `#111110`) | **PASS** | `--fund` became `#836d00`. Ask for an intro, Show N people and the count pill: white on `#836d00`, 5.06:1. Role tags 6.25:1. The switch when on uses `--fund`. **The accent was restored to `#111110`** (read back from the form). | after-people-accent-390, after-profile-accent-390, after-profile-more-accent-390 |
| Reduced motion | **PASS** | With `prefers-reduced-motion: reduce`, the filter sheet's and More sheet's animation is `none`, the scrim's is `none`, and the switch and its knob have 0 s transitions. | after-people-filter-sheet-390-reduced |
| Heights of touched controls | **PASS** | Search 44, Filter 44, chips 32, Show 44, Clear all 44, empty-state Clear 36, networks row 56 (58 over two lines), ListRow ≥ 72, tags 24, profile buttons 36, More 36 (with a 44 tap area from `::after`), Apply 36, More-sheet rows 56, block confirm buttons 36. Pairs on one row are equal: box and Filter 44/44, the two action buttons 36/36, Clear all and Show 44/44. | |
| Accessible names | **PASS** | Filter → "Filter" (", 1 on" while filters are set). More → "More" (aria-label; `getByRole('button', {name:'More', exact})` finds 1). Message in More → "Message Grace Kim". The switch has `role=switch` and `aria-checked`. | |
| Own profile (`/people/<Sam>`) | **PASS, with a visible flaw** | "Edit my profile" is 314×36 and goes to Edit, with no More and no Block. **But the grid keeps an empty 36 px More column, so the button stops at x 330 while the cards below run to x 374** (a blank 44 px slot at its right). | after-profile-sam-390 |
| A profile with Book a call (Grace Kim) | **PASS** | 390: "Ask for an intro" 153×36 and "Book a call" 153×36, then More. More holds Message (56 high, named "Message Grace Kim", opens `/messages/new?to=…`), the alerts switch and Block. 1280: the buttons are sized to their words (151 / 122.5 / 36), and More opens as a 300 px popover under the button. | after-profile-grace-390, after-profile-grace-more-390, after-profile-grace-more-1280, after-profile-grace-1280 |
| Keyboard through the More menu | **PASS** | Enter on More opens it with the focus on Close. Tab cycles switch → Block → Close inside it. Escape closes it and gives the focus back to More. | |
| `pnpm lint` | **PASS** | 0 errors, 1 warning, in `deploy/cloudflare/worker.js` (not touched by this part). | |
| `pnpm typecheck` | **PASS** | `tsc --noEmit` exit 0. | |
| `pnpm build` | **PASS** | Exit 0. | |
| `pnpm test` | not run | The brief said not to. The builder reports 3698 passed and 2 known failures. | |

## Reference pictures (Mobbin, not copied into the repo)
In `C:/Users/absi/.autobuild/worktrees/community__ui-benchmark/.ai/tmp/ui-benchmark/mobbin/`:
- `search-linkedin-results.png` and `search-linkedin-web-people.png`: rows and the web's one column.
- `search-airbnb-filters.png`: the sheet's foot.
- `search-instagram-typeahead.png`: the search field.
- `profile-linkedin-member.png` and `profile-instagram-me.png`: the profile head and action row.

Before pictures (main's code): `before-*.png` in this folder.

## Other things I saw
- **The filter sheet loses focus on close.** It is opened as a controlled Sheet with no `trigger`, so nothing hands the focus back. The More sheet, which passes a `trigger`, does it right.
- The More sheet's flash ("Their rooms won’t alert you.") shows at the top of the page, under the dimmed backdrop, so it reads dimmed while the sheet is open.
- Sam's own profile: the empty More column described above.
- The count line sits 14 px under the chips (chip bottom 272, count top 286); the part says 12.
- The profile photo starts 28 px under the "‹ People" back link (y 154 → 182). The part's "16 px under the bar" is ambiguous with the back link in between.
- "In Priya’s own words": the card's padding is 16, but its first block adds 14 more, so its first line starts 31 px in, while the other cards start 16 in. This was already so on main.
- The switch's off colour is a fixed `#b5b4ad` (people.css), not a token. The spec says colours come from the tokens only. It still reads in both modes.
- Grace Kim (Ledgerline) shows the letter square "L" while Priya Shah (Ledgerline too) shows the logo. This is data: Grace has no logo URL. The rule works as written, but the same company looks different on two rows.
- People and the profile still end with "Source code (AGPL-3.0)" (Part 2's footer, not this part's).

## What I could not check
- A real phone. The 300×570 run stands in for 130% text, and store build 5 on Android is the real check.
- Drag-down to close the sheet. I closed it by Escape and the backdrop only.
- The "{first} has paused intro asks." note: no seeded member has paused asks.
- A profile where asks can't be made (Message as the primary).
