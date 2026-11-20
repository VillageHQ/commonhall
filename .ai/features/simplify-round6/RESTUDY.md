# Re-study: the same 12 personas on the simplified app (round 6, after)

**Run:** 20 Nov 2026, on the round-6 fix pass (all six parts merged, plus the fix list). Before: [STUDY.md](STUDY.md).
The plan it checks: [SPEC.md](SPEC.md).

## The point first
- **Kill criterion: passed.** The Decisions say to revisit opening on Rooms "if more than 3 of 12 personas still
  miss a live room from Today". **0 of 12 missed it.** Asked first, before any journey, all 12 named the "LIVE NOW ·
  Pricing your first enterprise deal" card on Today, unprompted. 6 would tap its Join first. The other 6 would first
  answer what waits on them ("Read" on their own ask, "Answer" on an intro ask). Today stays the opening screen.
- **Half the words.** Member screens went from 5,414 words to 2,617 (median 147 → 69). Admin screens went from
  4,450 to 2,274 (median 187 → 81). Every screen meets its word target except Rooms (see below).
- **The old problems mostly went away.** Each persona checked its own top 5 problems from the first study: of 60,
  **20 are fixed, 31 better, 9 the same, none worse.** All 9 "same" are fund-side (Hannah, Marco, Helen, and one of
  Lina's): admins still can't nudge, the partner still can't introduce two people herself, and the Report counts
  intros, not engagement. These were already listed as follow-ups, not round-6 work.
- **Confusion moved, it didn't vanish.** Fresh eyes still found something unclear on most screens: 144 of 179
  screen visits (80%), against 163 of 198 (82%) before. What changed is what confuses. Before, it was where things
  are (Rooms hidden, three ways to find a person, an intro wizard behind "Post an ask"). Now it is smaller labels: preset
  chips with no hours, bare bells, "Not this time" next to "I don't know them well". The top 6 are repaired in this
  pull request, and the rest are roadmap lines.

## How it was run
The first study's method, unchanged ([study/](study/)):
1. **A throwaway copy:** the built app in demo mode (made-up people at example.com) on its own Postgres database and a
   local LiveKit dev server, never the live demo. Rooms on, one live and one scheduled room from the demo, plus the
   capture's own two rooms. The capture script is [study/capture.mjs](study/capture.mjs), run with
   `CAPTURE_ROUTES=round6`. Screenshots stay in the git-ignored `.ai/tmp/restudy/`.
2. **Counting:** words and controls in each page's main area, at 390px and 1280px ([study/table.mjs](study/table.mjs)).
3. **Personas:** the same 12 ([study/personas.md](study/personas.md)), with the same jobs, and journeys remapped to
   the new screens (for example, Directory and Search became People, and Intros became Inbox's Intros filter).
4. **Walkthroughs:** each persona ran as its own AI agent on the new screenshots. It first answered "what is happening
   right now, what do you tap first?" on Today. Then it walked its journeys screen by screen. Last, it read its own
   old walkthrough and marked each old top problem FIXED, BETTER, SAME or WORSE. Full walkthroughs:
   [reports/persona-feedback-after/](reports/persona-feedback-after/).

**Limits:** the personas are AI-played, so they predict friction; they don't measure real use. Three findings come
from the capture, not the app, and are not counted against it:
- Inside the room, nobody is really connected, so the stage reads "Nobody on stage yet" under a card that says
  "Priya + 4" (6 personas noticed).
- The time zone reads "Asia/Beirut": the capture machine's zone becomes a new member's zone (8 noticed).
- The note on "Ask Ada for an intro" is drafted from the demo member's own profile, which personas who aren't that
  member read as someone else's words (3 noticed).

The personas walked the build just before the repairs below. The word counts are from after them.

## Words per screen, before and after (phone, main area, demo data)
| Screen | Before | After | Target | |
|---|---|---|---|---|
| Today | 411 | 142 | ≤ 150 | ✓ |
| Rooms | 96 | 66 | ≤ 50 | over (the capture's 4 cards; about 40 on the demo's 2) |
| Room (live, after Join) | 48 | 34 | ≤ 40 | ✓ |
| Asks | 386 | 237 | ≤ 250 | ✓ |
| One ask | 141 | 50 | ≤ 90 | ✓ |
| People (was Directory 685 + Search 46) | 731 | 192 | ≤ 400 | ✓ |
| A member's profile | 165 | 98 | ≤ 110 | ✓ |
| Ask for an intro | 162 | 47 | ≤ 70 | ✓ |
| Inbox (Intros folded in, was 80 alone) | 77 | 40 | ≤ 40 | ✓ |
| One intro ask | 170 | 88 | ≤ 90 | ✓ |
| My profile | 529 | 136 | ≤ 150 | ✓ |
| Alerts | 154 | 91 | ≤ 110 | ✓ |
| Email | 173 | 56 | ≤ 80 | ✓ |
| Your data | 526 | 177 | ≤ 220 | ✓ |
| My network | 83 | 45 | ≤ 50 | ✓ |
| Jobs / Perks / Library | 157 / 130 / 263 | 95 / 62 / 191 | ≤ 110 / 80 / 200 | ✓ |
| Share a library item | 157 | 72 | ≤ 80 | ✓ |
| Admin Home | 136 | 59 | ≤ 90 | ✓ |
| Partner report | 520 | 276 | ≤ 280 | ✓ |
| Asks & intros (Asks / Intro log) | 518 / 378 | 298 / 209 | ≤ 350 / 220 | ✓ |
| Members / Invites / Import | 253 / 272 / 219 | 212 / 110 / 84 | ≤ 220 / 120 / 100 | ✓ |
| Announce / Weekly email | 196 / 200 | 104 / 106 | ≤ 140 / 110 | ✓ |
| Set up (was Set up + Guided start + Settings) | 208 + 101 + 102 | 87 | ≤ 160 | ✓ |
| Features | 198 | 26 | ≤ 100 | ✓ |
| Rooms server / Village / Job board / Calls / Perks set up | 89 / 270 / 251 / 157 / 134 | 32 / 124 / 107 / 85 / 38 | ≤ 40 / 130 / 140 / 100 / 80 | ✓ |

Totals: member 5,414 → 2,617 words (target ≤ 2,900), admin 4,450 → 2,274 (target ≤ 2,600). The median member screen
is 69 words (target ≤ 80). **Rooms** was 59 when part 3 merged. This pass adds 5 words to it: "Follow"/"Following"
on each card's bell and "Start or schedule a room". 6 of 12 personas read the bare bells as alert switches, and 6
never found Schedule behind "Start a room". A roadmap line takes Rooms back under 50.

## Per journey: what confused them, before and after
| Journey | Before (first study) | After (this study) |
|---|---|---|
| F2 Drop into a live room | Rooms only a footer link; 11 of 12 couldn't find it; "0 in the room" | 12 of 12 saw the Live now card on Today; Rooms is the first tab, with a dot. Left: unlabelled bells (fixed here); scheduling hidden behind "Start a room" (fixed here) |
| F1 Quick help | "Post an ask" opened an intro wizard (5 personas) | "Post an ask" opens the Asks box, focused: FIXED for all 5. Left: their own answered ask on Today not marked as theirs (fixed here) |
| F3 Warm intro | Search, Directory and a profile looped ("three ways to find a person") | One People page. Left: "Who should Ada introduce you to?" asks for a name, role and company typed blind (4 personas, roadmap) |
| F4 Help others | Others' asks first; "Declined, expired and withdrawn…" on 4 screens | Today leads with "Waiting on you". Left: a plain message sat under "Waiting for your yes" in Inbox (fixed here); "Not this time" vs "I don't know them well" unclear (6 personas, fixed here) |
| F5 Hire and save | Leaderboard, "Job" filter, perks with no claim | One "Top" sort, Claim buttons. Left: Jobs and Perks feel buried under More (Jordan, Tomas); "Apply" on your own jobs (roadmap) |
| Profile and settings | My profile 529 words, 52 controls, four Saves | 136 words, one row per setting; Alerts has a row now. Left: two "ask me for intros" switches (roadmap) |
| Alerts (R3, everyone) | One quiet window hidden behind a switch; no pause | Pause and three quiet times. Left: presets with no hours or "add" look (8 personas, fixed here); "blocked" with no way out (7, fixed here) |
| M1–M5 Manager | Home was a finished checklist; three setup screens | One Set up, Advanced folded. Left: the demo's Home still opened on "Four steps to launch" (3 personas, fixed here: the demo counts as launched); no nudge, numbers that disagree (follow-ups) |
| P Partner | Partner view behind a "Founder" tab | Asks with no help first. Left: can't introduce two people directly; console Home isn't made for her (follow-ups) |

## Tabs and alerts, after
- **Tabs:** 6 keep Rooms · Today · Asks · People · Inbox (Hannah for the member side; she wants a weekly pulse in
  the console). Daniel and Aisha would only reorder them (Today first). Mei would swap Asks for Jobs. Tomas and Jordan
  would drop the Rooms tab and keep Today's card (Jordan adds Perks & jobs). Helen wants Report. Nobody asked for
  Search, Directory, Intros or Feed back.
- **Rooms:** 9 of 12 would join, all from Today's card first (Lina and Omar would also host from the Rooms tab).
  Jordan maybe, Helen only if a founder asked for her, Tomas no.
- **Quiet times:** all 12 found them under the avatar's Alerts (or the "Alerts on" button on Rooms). Nadia and Mei
  said "partly", because the presets showed no hours. That is fixed in this pull request.

## Repaired in this pull request (small, in scope; checked by a separate verifier)
1. Alerts: each quiet-time preset is an add button ("+ Working hours") with its days and hours below. The blocked
   line says how to allow notifications.
2. Rooms: the card's bell says "Follow" or "Following". The top button reads "Start or schedule a room".
3. Inbox: "Waiting on you" above the intro asks, then a "Messages" heading.
4. Today: an answered ask of yours reads "Your ask · 1 answer".
5. One intro: "I don't know them well" says "Same for Marcus: never told why."
6. Demo: the community counts as launched, so admin Home opens on "This week" (the checklist stays at
   `/admin?checklist=1`).

## Still confusing: the roadmap lines
These are in [the roadmap](../../roadmap.md) under "Follow-ups from the round-6 re-study":
- Ask for an intro: pick from the people the connector knows, instead of typing a name, role and company blind.
- One "members can ask me for intros" switch instead of two.
- Room alerts by topic or host.
- Jobs: no "Apply" on your own jobs, and say what "Find candidates" does.
- Rooms back under 50 words, and a bell that tells the truth when the browser blocks alerts.
- Admin Home's "Next setup step" agreeing with the checklist, and the Report's title on a phone.
- The Inbox intro row on a phone, and one way of showing Library upvotes.
- Still open from the first study: nudges, a partner's direct intro, room attendance and recurring rooms, usage on
  feature switches, and the numbers that disagree.
