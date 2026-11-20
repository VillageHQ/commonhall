# Part 2 verifier report (first pass, before fix commit de8e864c)

Saved by the lead from the verifier's final message (its harness blocked writing this file).

All 9 criteria PASS at 390px and 1280px. Five defects found (all fixed in de8e864c, re-check below):
1. Ask for an intro with the week's asks used up: allowance shown twice (pips + 29-word note), 80 words > 70. Proof: shots/intro-form-desktop.png
2. Asker's view of one intro: 126 words, full timeline details in view; "in the portal" vs "here". Proof: shots/intro-sent-asker-phone.png
3. Library filter at 390px: "Role" label and its select on different lines. Proof: shots/library-filter-open-phone.png
4. Today's live card showed the newest, empty room instead of the busiest one. Proof: shots/today-live-{phone,desktop}.png
5. Own ask: "Nobody has a path yet; anyone can help." above "1 answer". Proof: shots/ask-author-sees-offer-phone.png

Outside part 2 (part 1's): on /jobs the phone tab bar marks Directory active; footer still shows "Rooms · Library".

| # | Criterion | Result | Proof (shots/) |
|---|---|---|---|
| 1 | Word counts | PASS | .ai/tmp/study-after/inventory.json |
| 2 | Today: Live now first, Join, no card when none, Waiting before You could help, Is this right? only in first 2 weeks | PASS | today-* |
| 3 | Post an ask focuses the box, posts, appears under Yours/Open | PASS | asks-*, ask-own-new-phone.png |
| 4 | One way to respond; intro form who + note only; intro ask sent | PASS | ask-*, intro-form-* |
| 5 | My profile pages Privacy / Booking link / My network; saves survive reload | PASS | me-me-*, privacy-saved-phone.png, booking-* |
| 6 | Your data: no Dark mode; Export and Delete present | PASS | me-me-data-*, data-delete-confirm-phone.png |
| 7 | Library Role filter, Top sort, /library/leaderboard redirect; Perks claim buttons | PASS | library-*, perks-* |
| 8 | One intro ask: Yes / No first; no email typed when known | PASS | intro-connector-* |
| 9 | Try to break it (overflow, focus, modules off) | PASS | today-*-off-*, me-network-off-phone.png, profile-intros-off-phone.png |

## Words (phone)
| Screen | Before | After | Target |
|---|---|---|---|
| Today | 411 | 150 | ≤150 |
| Asks | 386 | 241 (304 raw with 3 verifier posts) | ≤250 |
| One ask | 141 | 54 | ≤90 |
| A member's profile | 165 | 101 | ≤110 |
| Ask for an intro | 162 | 51 (80 when allowance used up — defect 1) | ≤70 |
| One intro ask (connector) | 170 | 86 | ≤90 |
| One intro (asker view) | – | 126 | (not in table) |
| My profile | 529 | 138 | ≤150 |
| Email | 173 | 60 | ≤80 |
| Your data | 526 | 181 | ≤220 |
| My network | 83 | 49 | ≤50 |
| Jobs | 157 | 99 | ≤110 |
| Perks | 130 | 66 | ≤80 |
| Library | 263 | 195 | ≤200 |
| Share a library item | 157 | 76 | ≤80 |

# Re-check after de8e864c (only what failed and changed)
| Item | Result | Proof (shots/) |
|---|---|---|
| 1 Intro form, asks used up: allowance once + "Your next ask comes back on <date>." 60 words phone (51 with asks left) | PASS | recheck-1-* |
| 2 Asker's intro view: steps ahead titles only, "By email or here"; 100 words (was 126) | PASS | recheck-2-* |
| 3 Library Kind/Role labels on their select's line at 390px; filters work | PASS | recheck-3-* |
| 4 Today Live now picks the busiest room (ties → newest); Join opens it; none live → no card | PASS (6+ live rooms: only the 5 newest are compared — accepted bound, follow-up) | recheck-4-* |
| 5 No "Nobody has a path" above answers; still shown with no answers | PASS | recheck-5-* |
Recount (phone, raw incl. verifier data): Today 151 (~145 on untouched demo data), Asks 304 raw / 241 without verifier posts, One ask 54, Ask for an intro 60 (used up), Library 195.
