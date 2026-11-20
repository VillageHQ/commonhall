# Verify: sharing and posting forms (choice-forms, less-choice Part 5)

- App: http://localhost:9673 (production build, demo mode, db `choice_demo`), commit a2f51a66.
- Viewports: phone 390x844 (isMobile, hasTouch), laptop 1280x860. Dark mode checked at 390.
- Driven with Playwright (playwright-core 1.63, scripts in `.ai/tmp/verify/`). Signed in with the demo buttons: Sam Lee
  (founder, Tallyhealth, linked Ashby board with 2 jobs) and Maya Ortiz (admin).
- Not run: the unit tests (`src/modules/library/`, `src/modules/job-board/`). They wipe their database and none was set
  aside for me. A real board pull also could not run, because a demo pull skips the fetch.

## Results

| Check | Result |
|---|---|
| 1. A hiring request from a job doesn't spend a weekly ask | PASS, with a loophole (P2) |
| 2. Library share in 1 title + 1 paste + 1 tap | PASS |
| 3. Secret scan on pasted text | PASS |
| 4. "Add a job" first, no second card | PASS on every named step, 2 problems found (P3, P4) |
| 5. Nothing visibly broken (390 layout, overflow, dark, double submit) | PASS, small notes (P5, P6) |

## Check 1: hiring request
What I did (390 and 1280): Jobs › "Find candidates" on Tallyhealth's "Founding account executive" › "Post a hiring
request · uses no weekly ask" › the prefilled composer › Post.
- The composer says "A hiring request for your job doesn't use one of your weekly asks." above the pips.
- Asks left, read in the composer:
  - Hiring request at 390: 4 of 5 before, 4 of 5 after.
  - Hiring request at 1280: 4 of 5 before, 4 of 5 after.
  - Database check: both asks have `hiring_job_id` set. The 5 counted asks this week are the seeded one (17 Nov), my
    normal ask, the "hire, no job" ask and 2 filler asks, all with `hiring_job_id` empty.
- Normal ask through the UI: 4 of 5 → 3 of 5 (spends one).
- Crafted POSTs to `/api/asks/create`:
  - `category: "hire"` with no job: 200, spends one (3 → 2).
  - `hiringJobId` set to Ledgerline's job (another company): 404, "That job isn't on the board anymore, or isn't yours
    to hire for…". Nothing posted, still 2.
  - A made-up uuid: 404, same message, still 2.
  - A job id that isn't a uuid: 422.
- At 0 of 5: a normal ask is refused ("You've used this week's 5 asks…"), and the hiring request for my own job still
  posts. 0 of 5 both times (390 and 1280).
- Screenshots: `check1-allowance-before-*`, `check1-hiring-button-*`, `check1-hiring-composer-*`,
  `check1-hiring-posted-390`, `check1-allowance-after-*`, `check1-normal-ask-spends-390`,
  `check1-zero-normal-refused-390`, `check1-zero-hiring-composer-390`, `check1-zero-edited-hiring-*`,
  `check1-free-unrelated-ask-390`. Some 1280 copies were deleted to keep the folder near 8 MB.

## Check 2: library share
- Visible before sharing: 6 controls (Title, the box, Attach a file, "Kind: Prompt · Change", More options, Share).
  - Decisions needed now: 3 (title, paste, Share).
  - Before: 7 (title, pitch, kind, role, content, the visibility radios, Share). The old form required pitch, kind and
    role.
- Title + paste + Share, at 390 and 1280: the item page shows Kind "Prompt" and the pitch "You are a sharp sales
  coach." (the paste's first line).
- Change: Kind becomes a select. I picked Playbook, and the item shows Playbook.
- More options:
  - The pitch placeholder is the paste's first line.
  - "Role it helps" defaults to "Any role". Role is optional: an item shared without one is fine.
  - "A link too" and "How to install" work, and both show on the item.
  - Visibility defaults to "Whole portfolio" (checked), with the other two choices below it.
- A box holding only `https://github.com/example-org/verifier-tool` (with spaces around it):
  - Kind is guessed as "Tool connection" and "A link too" hides.
  - The item's link is that URL, and the pitch is "github.com/example-org/verifier-tool".
- Attaching `sync_crm.py` alone: Kind is guessed as Automation, and the item has the file.
- A title with nothing else is refused: "Paste it, link it or attach a file…".
- Editing a link-only item puts the link back in the box, and Save works.
- Screenshots: `check2-*`.

## Check 3: secret scan
I used made-up keys only: AWS-shaped `AKIAZ7Q3MNB4TRW8HJ2K`, a made-up `sk_live_…`, a made-up Slack webhook and
`OPENAI_API_KEY=q8Zr…`. Every case was refused with "<part>, line N, looks like <what>. … Nothing was saved." The
library_item count did not change (18→18 at 390, 19→19 at 1280).

| Where the key was | Caught as |
|---|---|
| The box | AWS key, and separately the `NAME=value` secret setting |
| The box holding only a webhook link | Slack webhook, reported as "The link" |
| The pitch | AWS key |
| How to install | Stripe key |
| The "A link too" field (`?key=AKIA…`) | AWS key |
| The title | AWS key |

A harmless text ("Never paste your API key or password…", `OPENAI_API_KEY=your-key-here`) shared fine (count +1).

Screenshots: `check3-*`.

## Check 4: Add a job
- On /me/jobs, "Add a job" (Title, Location, "Apply link or email (optional)", "Leave it empty and members apply by
  messaging you.") sits above "Already on Greenhouse, Lever…? Paste your careers link", which is folded on the second
  line. The company's existing card is still listed above both.
- As Sam I added 3 jobs at each viewport: no link, an email, and a link.
  - Every job went onto the existing Ashby card. Our jobs still has 1 card ("Tallyhealth").
  - The board's company list went from Tallyhealth (2) to (5) to (8), with no second Tallyhealth entry.
  - Database: every job has `is_manual=true` and sits on the Ashby source.
- Apply, as Maya on /jobs:
  - The no-link job's Apply goes to `/messages/new?to=<Sam>`, a message to Sam.
  - The email job's Apply is `mailto:jobs@tallyhealth.example.com` and opens no new tab.
  - The link job's Apply opens the link in a new tab.
  - Sam sees no Apply on his own no-link job.
  - The public board shows no Apply for the no-link job, and mailto or the link for the others.
- A bad apply value (`javascript:alert(1)`) is refused: "Paste a full link that starts with https://, or an email
  address."
- Linking a board for a company that has jobs added by hand: as Maya I added 2 jobs for "Mochi Labs", which made one
  hand-made card ("Mochi Labs (2)"). Then I linked `https://jobs.ashbyhq.com/mochilabs`. The result was still one card,
  now the Ashby card holding both jobs. The hand-made card was deleted, and the board shows "Mochi Labs (2)". The demo
  says "Linked. This is a demo, so the job list isn't read…".
- Whether hand-added jobs survive a real pull: I checked this in the code only, not in the app.
  `service-pull.ts:158` deletes only `is_manual=false` rows.
- Screenshots: `check4-our-jobs-before-390`, `check4-add-job-*`, `check4-our-jobs-after-*`, `check4-board-sam-*`,
  `check4-board-maya-noLink-apply-*`, `check4-apply-direct-*` (the message page), `check4-public-board-*`,
  `check4-admin-manual-card-1280`, `check4-admin-after-link-1280`, `check4-hidden-card-add-390`,
  `check4-hand-job-cut-off-390`.

## Check 5: anything visibly broken
- No sideways overflow at 390 on /library/new, More options, /asks with the hiring composer, /search/candidates,
  /me/jobs, or /library. Dark mode looks fine on the share form, Our jobs and the hiring composer.
- Double submit:
  - A double tap on "Share in the library" made 1 item (20→21).
  - A double click on "Add the job" made 1 job.
- Screenshots: `check5-dark-*`, `check5-library-list-dark-390`.

## Problems (most severe first)

**P1: none.**

**P2: Any ask can skip the weekly allowance through the hiring composer (UI, no crafted request needed).**
The free pass is tied only to the job id. It isn't tied to the words, and it can be used any number of times.
Repro, as Sam at 0 of 5 asks left:
1. Jobs › Find candidates › "Post a hiring request · uses no weekly ask".
2. Replace the prefilled words with "anyone know a good accountant in Boston?" and press Post.

It posts, the count stays 0 of 5, and the ask is saved with category `hire`. That category is wrong, and the partner
report counts it as hiring. The same works by API: `{"title":"…unrelated…","hiringJobId":"<own job id>"}` returns 200
and spends nothing. Posting, closing and posting again gives unlimited free asks. The only limits are 10 per minute and
5 open, and each post notifies helpers again (5 helpers per post here). Admins can do this with any company's job,
since they may "Find candidates" on every job.
Screenshots: `check1-zero-edited-hiring-*`, `check1-free-unrelated-ask-390`.
Possible fixes: limit it to one free hiring request per job (open, or per week), or lock or check the words.

**P3: Adding a job to a hidden company says "It's on the job board now", but it isn't.**
Repro:
1. As Sam, on /me/jobs, tap "Hide this company from the board".
2. Add a job.

The note says "Added "…". It's on the job board now." The job goes onto the hidden card, and /jobs no longer lists
Tallyhealth. When an admin hid the card, the founder can't show it again, so the jobs disappear without a word.
Screenshot: `check4-hidden-card-add-390`.

**P4: Hand-added jobs can fall out of reach of their Remove button.**
Our jobs shows 8 jobs per card ("And N more on the board"). Remove exists only there. Hand-added jobs now share a
linked board's card with the pulled jobs, so they are cut sooner.
Repro: as Sam with 9 hand-added jobs plus 2 pulled ones, the oldest hand-added job ("Verifier 390 ops lead") isn't
listed and can't be removed from /me/jobs. A manual card with more than 8 jobs had the same cut before this change.
Screenshot: `check4-hand-job-cut-off-390`.

**P5: The "Change" next to "Kind: Prompt" doesn't look tappable** (grey text, no underline, light and dark).
Screenshots: `check2-share-filled-390`, `check5-dark-library-new-390`.

**P6: Small gaps.**
- Apply on a no-link job opens an empty message to the founder, with nothing saying which job it's about.
- On a member's profile, "Open jobs at <company>" shows no Apply for a no-link job (the members' board shows one).
- The same hiring request can be posted again and again, and each copy notifies helpers. This is part of P2.

## Test data left in `choice_demo`
- Library: about 22 items titled "Verifier …".
- Jobs: Tallyhealth has 9 hand-added "Verifier …" jobs on its Ashby card. Maya has a "Mochi Labs" Ashby card with 2 jobs.
- Asks: about 10 "Verifier …" and hiring asks by Sam, all closed. Sam has 0 of 5 asks left this week.

## Re-check after the builder's fixes (same database, app rebuilt)
The fixes are uncommitted changes in the worktree: the asks reads and service, find-candidates, the candidates page,
Our jobs, the job-board service and the share form. Before testing I raised the asks allowance to 20 as Maya, through
`/api/asks/allowance`, and set it back to 5 afterwards.

| Item | Result |
|---|---|
| P2: a job's hiring request is free once a week per job | PASS (one gap remains, R1; one new small problem, R2) |
| P3: adding a job to a hidden company says so | PASS |
| P4: every hand-added job is listed with Remove | PASS |
| P5: "Change" next to Kind is underlined | PASS |

**P2** (390 and 1280, as Sam):
- **Tallyhealth's seeded job** (its free request was already used this week):
  - The button reads "Post a hiring request", with no "uses no weekly ask".
  - The composer link carries no `job=`, and the composer has no "doesn't use one of your weekly asks" line.
  - Posting spends one ask: 15→14 at 390, 12→11 at 1280. The database shows `hiring_job_id` empty and category `hire`.
- **A fresh job added by hand:**
  - The first time, the button reads "Post a hiring request · uses no weekly ask" and the composer shows the line.
    Posting spends nothing (14→14, 11→11), and the database keeps the job id.
  - The second time, the button reads "Post a hiring request" and the line is gone. Posting spends one (14→13,
    11→10), and the job id is not saved.
- **API, same job, other words:** 200, spends one (13→12, 10→9), and the job id is not saved.
- Screenshots: `recheck-p2-tallyhealth-button-*`, `recheck-p2-tallyhealth-composer-390`, `recheck-p2-fresh-first-*`,
  `recheck-p2-fresh-second-*`.

**P3** (390 and 1280):
- Hidden by Sam: "Added "…". This company is hidden from the board: tap "Show this company on the board" to list it."
- Hidden by Maya through `/api/job-board/sources/hide` (database `hidden=t, hidden_by_admin=t`): "Added "…". An admin
  hid this company's jobs, so it shows on the board once an admin shows them again."
- Shown again: "Added "…". It's on the job board now."
- Screenshots: `recheck-p3-founder-hidden-*`, `recheck-p3-admin-hidden-*`.

**P4** (390 and 1280):
- With 16 (later 18) hand-added and 2 pulled jobs, Our jobs listed all 18 (later 20) rows. Every hand-added row has a
  Remove button, and the "more on the board" line is gone.
- The oldest hand-added job, cut off before, is now listed. Its Remove deleted it (checked in the database).
- Not exercised: the "pulled jobs cut at 8" half. The demo card has only 2 pulled jobs and a demo pull adds none; I
  checked that half in the code only.
- Screenshots: `recheck-p4-oldest-hand-job-*`.

**P5:** computed `text-decoration-line: underline` at 390 and 1280. Screenshots: `recheck-p5-change-underlined-*`.

### Re-check problems
**R1 (P3 severity, what remains of P2): every new job brings one free ask in any words.**
The free request is checked per job, and its words still aren't, so a founder can add throwaway jobs by hand (up to 50
per card) to get more free asks.
Repro, as Sam:
1. On /me/jobs, add a job "Recheck 390 throwaway".
2. POST `/api/asks/create` with `{"title":"Recheck: unrelated ask, intro to a hospital CFO","hiringJobId":"<that job>"}`.

The result is 200, 12→12 at 390 and 9→9 at 1280, saved with category `hire`. The same works through the UI by editing
the words in that job's first hiring composer. This is much narrower than before: it costs one visible job per free
ask, and removing the job afterwards keeps the ask.

**R2 (P5 severity): an old hiring composer still says the request is free after the free one is used.**
The composer shows the free line whenever its URL carries `job=`. Only the server decides whether the post is free.
Repro, as Sam:
1. Open `/asks?draft=We're+hiring+again&category=hire&job=<a job whose free request is used this week>`. This is the
   same page you reach with Back from the first request, or from a bookmark.
2. The composer says "A hiring request for your job doesn't use one of your weekly asks."
3. Post.

It spends one ask (9→8). Screenshot: `recheck-p2-stale-composer-390`.

P6 was not re-checked; it was left as a follow-up.

Re-check test data: the Tallyhealth card now has about 20 hand-added "Verifier"/"Recheck" jobs. There are about 13 new
closed asks by Sam, and the asks allowance is back at 5.

## Re-check 2: R2 (commit a2e4526e, app rebuilt)
For this test I raised the asks allowance to 30 as Maya and set it back to 5 afterwards.

| Item | Result |
|---|---|
| R2: an old hiring link for a job whose free request is used | PASS |

- **The old link** (`/asks?draft=…&category=hire&job=a478c6d9…`, a job whose free request is used): the composer shows
  no free line. Posting spends one ask (18→17 of 30 at 390, 17→16 at 1280), and the ask is saved with the job id empty
  and category `hire`. Screenshots: `recheck2-stale-composer-390`, `recheck2-stale-composer-1280`.
- **A link for a fresh job added by hand:** the free line shows. Posting spends nothing (17→17 at 390, 16→16 at 1280),
  and the ask is saved with the job id. Screenshots: `recheck2-fresh-composer-390`, `recheck2-fresh-composer-1280`.

**R3 (P5 severity, new): a link carrying another company's job, or a job no longer on the board, still shows the free
line.**
Repro, as Sam:
1. Open `/asks?draft=We're+hiring…&category=hire&job=b3967c35-4859-4c25-97f7-e3e0a4db0a48` (Ledgerline's job).
2. The composer says "A hiring request for your job doesn't use one of your weekly asks."
3. Post.

The post is refused: "That job isn't on the board anymore, or isn't yours to hire for. Post this as an ordinary ask
instead." Nothing is posted and nothing is spent, but the page keeps the job, so posting again from it fails the same
way. You only reach this with a hand-made link, or a hiring link whose job was removed after the link was made.
Screenshot: `recheck2-other-company-job-390`.

## Re-check 3: R3 (uncommitted change to `src/app/(app)/asks/page.tsx`, app build 00:48, after the edit)
Signed in as Sam Lee (Tallyhealth) with the demo button. Sam had 0 of 5 asks left, so I raised the allowance to 30 as
Maya and set it back to 5 afterwards (confirmed: 0 of 5). Script: `.ai/tmp/verify/r4.cjs`. Each link was
`/asks?draft=<words>&category=hire&job=<id>`. I checked for the free line (`[data-slot=hiring-free]`), posted, read the
ask row in the database, then closed the ask.

| Item | Result |
|---|---|
| 1. Another company's job (Ledgerline `b3967c35…`; the database shows `job_source.company` = Ledgerline, not Sam's) | PASS at 390 and 1280 |
| 2. A made-up job uuid (`11111111-2222-4333-8444-555555555555`) | PASS at 390 |
| 3. Sam's own job with no hiring request this week (Clinical product lead `eca447cf…`, 0 asks with that `hiring_job_id`) | PASS at 390 |

- **1:** No free line. The post went through, with no refusal: 16→15 of 30 at 390 and 14→13 at 1280. The ask was
  saved with `hiring_job_id` NULL, category `hire`, author Sam Lee. Screenshots: `recheck3-other-composer-390`,
  `recheck3-other-posted-390`, `recheck3-other-composer-1280`, `recheck3-other-posted-1280`.
- **2:** No free line. The post went through: 15→14. Saved with `hiring_job_id` NULL, category `hire`. Screenshots:
  `recheck3-madeup-composer-390`, `recheck3-madeup-posted-390`.
- **3:** The free line "A hiring request for your job doesn't use one of your weekly asks." shows. The post spent
  nothing (14→14) and was saved with `hiring_job_id` = `eca447cf…`, category `hire`. Screenshots:
  `recheck3-own-composer-390`, `recheck3-own-posted-390`.

R3 is fixed. No new problems found. Test data: 4 more closed asks by Sam. "Clinical product lead" has now used its free
request this week, and the allowance is back at 5.
