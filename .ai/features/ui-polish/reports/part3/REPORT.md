# ui-polish Part 3 (Inbox): independent verification

Two checkers who did not write the code drove the real app. The first pass verified commit 47df54e8; the re-check after the
repairs verified 0858d27b. Both ran a production build (`pnpm build`, `next start`) in demo mode against the throwaway
Postgres `ui-p3-pg`. Made-up people only: Sam Lee (member), Maya Ortiz (admin), Priya Shah, Ada Okafor, Noah Berg.

They used Chromium at 390×844 (touch), 360×740, 300×570 and 1280×800, plus the store app's web preview (`html[data-app]`
set). "With the insets" means `--sab: 34px; --sat: 47px` on html. The council's decision 2 (flat rows, no bubbles) replaces
the part file's bubble wording for check 6. The checkers' scripts are in the git-ignored `.ai/tmp/verify-p3/`. This file
was written by the builder from their reports, because a checker can't save files into the repo.

## Checks
| # | Result | Measured | Pictures |
|---|---|---|---|
| 1 Rows | PASS | At 390:<br>• intro row 115 px, message row 72 px<br>• avatar 48×48 at x 16, text at x 76<br>• names 16px/600<br>• times 13 px flush right on line 1 ("22 Nov", "Sat", "10:38")<br>• line 2 15 px Graphite<br>Same at 360 and 300. At 1280 the list pane is 360 px; avatar 16 px in, text 76 px in. | inbox-390, inbox-intros-390, inbox-360, inbox-300, inbox-1280, inbox-intros-1280 |
| 2 Unread | PASS | Maya messaged Sam from his profile through the real UI.<br>• Sam's row: line 2 Ink and 600 with an 8 px "Unread" dot, then a "2" pill after a second message<br>• tab badge 1→2→3<br>• after opening the thread and going back: no dot, badge 1 (also after a reload) | inbox-unread-390, inbox-unread-count-390 |
| 3 "You:" | PASS | "You: Yes please. Thursday 4pm London…" | inbox-390, thread-1280 |
| 4 Intro row | PASS (partly not checkable) | "Answer" is a 36 px outlined button 10 px under line 2 and opens the intro. The in-place answer of `target-member-ask.tsx` needs a third signed-in person, which the demo lacks. It is covered by the UI test "answers an intro for your yes in the row". | inbox-390, intro-answer-390 |
| 5 Thread | PASS | Plain browser and app alike:<br>• tab bar and top bar hidden<br>• header 99 px (52+47), sticky<br>• Back 77×44 "Inbox" with a 24 px chevron<br>• avatar 32; name + avatar link to the profile<br>• More 44×44 opens a sheet with "Block Priya Shah"<br>Block → confirm → Unblock all work. At 1280 More is a popover. | thread-390, thread-inapp-390, thread-more-sheet-390, thread-blocked-390, thread-more-1280 |
| 6 Flat rows | PASS | First of a run: 36 px avatar and "name · time" (15px/600 · 13 px). Words are 16/22 at x 62, and the rest of a run sits at the same x (0 of 37 off). No fills or bubble radius. Day labels: a 12px/600 Vellum pill between hairlines. | thread-390, thread-long-390, thread-1280 |
| 7 Delete / Report | PASS | A tap on Sam's message shows "Delete" (36 px); a tap on Maya's shows "Report"; a second tap hides it. The keyboard reaches `button "Maya Ortiz, Today, 10:38"`, and Enter toggles it. A real Delete turned the message into "Message deleted". | thread-message-open-390 |
| 8 Composer | PASS | • bar 34 px above the edge with `--sab: 34px`, 90 with `--mini: 56px`<br>• box 40 px (20 px radius, Vellum); Send 40×40; bottoms equal (0 px)<br>• Send disabled while empty<br>• box 40→60→80→100→120, then scrolls<br>• sending empties it<br>After the repair, paper fills the strip under the bar: 12 sampled points all hit the bar, never a message (light and dark, with and without the mini player). | thread-390, composer-6-lines-390, recheck-thread-inapp-scrolled-390, recheck-thread-dark-scrolled-390, recheck-thread-dark-mini-390 |
| 9 Long thread | PASS | 37 messages:<br>• the thread opens at the newest; scrolling further gains 0 px<br>• after the repair, the last message ends 16 px above the bar (771 vs 787)<br>• the bar stays put while scrolling<br>• "Show older messages" loads 30 → 37 and keeps the message you were reading in place (214→214 and 174→174 px at 390, 225→225 at 1280), also when the page wasn't at its top | thread-long-390, thread-long-1280, recheck-thread-end-390, recheck-older-loaded-390, recheck-older-loaded-1280 |
| 10 Web | PASS | • one card, list pane 360 px; "Pick a conversation" when none is open<br>• a click changes the address to /inbox/<id>; the selected row gets the Vellum fill, `inset 3px 0 0 var(--fund)` and aria-current<br>• Back returns to the previous thread<br>• the panes scroll on their own<br>• Enter sends | inbox-1280, thread-1280 |
| 11 Empty | PASS | Maya with no conversations: 48 px icon, "No messages yet", the line, and "Find someone" (36 px, to /people). Under Intros the chips stay. | inbox-empty-390, inbox-empty-intros-390 |
| 12 Outline | PASS | Today → Inbox at 390 with the page held back 3 s. First row top: outline 256, real 256. Second row: 418 / 417. | outline-390 |
| 13 Keyboard | not checkable here | Needs store build 5 on a phone. | — |

## Checks every part's verifier also runs
| Check | Result | Measured |
|---|---|---|
| Sizes at 390 (plain, in-app) and 1280 | PASS after repair | No sideways scroll and no cut or wrapped labels; long names end in an ellipsis. The first pass found messages under the bar's inset strip; the repair fixed it (check 8). The phone page foot under a thread is now hidden there (it is Part 2's to remove everywhere). |
| 360×740, 300×570 | PASS | No sideways scroll, clipping or wrapped labels. |
| Dark | PASS | Unread line and dot are light on the dark background; Send, box and day pill are readable. dark-390, dark-thread-390. |
| Accent #FFD400 | PASS | `--fund` became `#836d00`, and the selected row's bar follows it. Restored to `#111110`. accent-390, accent-1280. |
| Reduced motion | PASS | The sheet opens with no animation or transform. |
| Heights | PASS | Back 44, profile link 44, More 44×44, View profile 36, box 40 / Send 40, Delete/Report 36, Answer 36, chips 32, sheet row 48. |
| Names | PASS | link "Inbox", button "More", button "Send", message buttons "<sender>, <day>, <time>", form "Reply to Priya Shah". |
| Break-it | PASS | • a link inside a message opens the link without toggling the message<br>• selecting text doesn't open the message<br>• long words wrap<br>• a double-click on Send sends once<br>• resizing across 1000 px swaps the panes and the pushed screen |
| Tests | PASS (with 2 known) | lint 0 errors, typecheck clean. pnpm test 3706/3708 at the re-check. The 2 known failures: `deploy-setups` (the Windows CRLF check) and `site-tour`, which the builder fixed after with `pnpm tour:build` (see the pull request). |

## Other things seen (not this part's files)
- Part 2: the "Source code (AGPL-3.0)" page foot still shows under the Inbox list on phones. Part 2 removes it.
- Demo only: `.fh-app` has `min-height: 100vh` under the demo banner, so every page scrolls by the banner's height (34 px at 1280).
- Part 4: Today's "intro to make" row uses a filled Answer, while the Inbox uses an outlined one.
- Notes:
  - The web thread header is 64 px, while the phone's is 52 plus the inset.
  - A short thread starts under the intro block, at the top, as LinkedIn's does.

## Reference (Mobbin; compared, not copied, never committed)
From the round's scratch folder `ui-benchmark/mobbin/`:
- inbox-linkedin-thread.png: flat rows, a day label between hairlines, a solid strip under the composer.
- inbox-linkedin-list.png
- inbox-linkedin-web-thread.png: two panes, the selected row with a fill and a left bar.
- inbox-airbnb-list.png: an outlined action under a row.
- inbox-instagram-thread-new.png: the intro block.

## What could not be checked
- Check 13 (the keyboard on store build 5).
- The in-place answer as the person asked for (it needs a third signed-in person; a UI test covers it).
- Android at font scale 1.3 (300×570 stood in).

Data left in the throwaway database: a Sam↔Maya thread and a Sam↔Noah conversation.
