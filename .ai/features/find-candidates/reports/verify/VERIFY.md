# Verify: find-candidates (independent, 2026-11-18)

Built app on :9704, demo data, Playwright clicks (scripts: `.ai/tmp/verify/v1.mjs`, `v2.mjs`). Screenshots in this folder.

| # | Criterion | Result | Evidence |
|---|-----------|--------|----------|
| 1 | Button only for the job's company and admins; page 404s for others | PASS | `01-sam-board.png`: Sam sees it on his 2 Tallyhealth jobs only. Maya (admin) sees 5/5. Sam's direct URLs: Ledgerline job 404, Kilnworks job 404, Ledgerline + `&q=` 404, unknown id, `job=abc` and no `job` all 404 (`02-sam-ledgerline-direct.png`). After Sam's profile company was set to Kilnworks, he got the button on the Kilnworks job (page 200) and kept Tallyhealth (he linked its tool). Network module off: no button, page 404. |
| 2 | Search uses the title (and location); normal results with faces and intro paths | PASS | Redirect to `q=Founding account executive in Boston`; "Remote (US)" job gives `q=Clinical product lead` (no place). `03-sam-results.png`: "2 people in reach", photos, path Sam → Marcus Webb → Rosa, "Ask Marcus for an intro". |
| 3 | Without own Village connection: says how to connect, still offers the hiring request | PASS | Sam's `member_network.group_joined_at` set to null: `p2.png` / `p2-phone.png` show "Connect your network to search who members know… Connect your network" with the hiring-request box below it, and a profile-only search. |
| 4 | Hiring request prefilled (hire, title, link) and posts only on send; DB row correct | PASS (see issue A) | `04-sam-asks-prefilled.png`: line "We're hiring a Founding account executive at Tallyhealth. Who do you know?", Details "The job: https://tallyhealth.example.com/careers/tallyhealth-1". Ask count 10 → 10 after opening (nothing posted). After Post (`05-sam-posted.png`) the DB row is `kind=ask, category=hire, detail=The job: https://tallyhealth.example.com/careers/tallyhealth-1`. |
| 5 | Empty/symbol title never sends an empty search; asks to type the role | PASS (see issue B) | Kilnworks "???": no redirect, no `q`, empty box, "Type the role you're hiring for… nothing was searched yet" (`09-maya-odd-title.png`, `11-phone-odd.png`). `&q=` gives a 200 page with no search. Typing "Ceramics engineer" runs the search (`10-maya-typed-role.png`). Draft becomes "We're hiring at Kilnworks. Who do you know?" with the link. |
| – | Phone 390px | PASS (see issue C) | `06`, `07`, `08`, `11`, `p2-phone`: no horizontal overflow (scrollWidth 390), nothing broken. |

Also checked: asks module off → the candidates page still searches and the hiring box is gone (`p3-asks-off.png`). No page errors in the browser console.

## Other problems
- **A (significant): no reader ever sees the job's link.** The `detail` is saved, but the ask page (`05-sam-posted.png`), the board card and the 5 `ask_helper` emails do not show it. I searched the html and text of all 5 outbox rows for `careers/tallyhealth-1` and found 0 matches. The asks UI never shows `ask.detail`. The box says "with the job's link", but the link only feeds search and matching. Steps: post a hiring request from Find candidates, then open the ask as anyone.
- **B (minor): after the role is typed on an odd-title job, the "Type the role… nothing was searched yet" note stays above the results** (`10-maya-typed-role.png`). It is driven by the job's query, not the current `q`. The hiring draft also ignores the typed role ("We're hiring at Kilnworks"). The page then has two community CTAs: "Post a hiring request" (the hire category) and the empty-state "Ask the community".
- **C (minor, cosmetic): at 390px the job rows are cramped** (`06-phone-board.png`). With both "Find candidates" and "Apply" in a row, the title column is ~100px wide, so "Founding account executive" wraps onto 3 lines and the meta line onto 4.
- Note (outside this feature): the full-page phone screenshots show the bottom tab bar highlighting "Directory" on /jobs.

## Data changed and restored
Sam's `member_network.group_joined_at` → null → restored. Sam's `member_profile.company` → Kilnworks → Tallyhealth. `module_state:asks` and `module_state:network` → off → on. I deleted the hiring ask I posted and its 5 `ask_helper` outbox rows. Search usage counters from my runs remain.
