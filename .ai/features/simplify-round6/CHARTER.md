# Charter: simplify-study (part 1 of Commonhall round 6)

Approved by: the round-6 lead (autopilot, owner's Telegram topic 82148, 20 Nov 2026). This part writes the study and the specs only, no product code. The lead's brief, word for word:

# Brief: simplify-study (part 1 of Commonhall round 6)

Worktree: the simplify-study worktree (branch absi-agent/simplify-study, repo
VillageHQ/commonhall, PUBLIC, AGPL). Main is at the round-5 merge (AI library, Rooms, alerts, store app in `mobile/`).

## Why
The owner says the app is "super complex now: so many tabs, so much text". He wants only the most important tabs,
with **Rooms** (live voice rooms, like Clubhouse) as the primary thing people join, and a drastic cut in text everywhere.
This part produces the evidence and the plan. Later parts build it. Do NOT change product code in this part.

## What to produce (all in the repo unless marked)
1. **Screen inventory**: run the app locally on a throwaway copy (its own Postgres container on a free port, demo mode or
   seeded made-up people at example.com, never a real person, key or the live demo database). For every member-facing and
   admin screen, take screenshots at phone width (390px) and desktop (1280px), and count the words and the controls on
   each. Also list every tab / menu item a member and an admin see. Screenshots go in `.ai/tmp/simplify-study/`
   (git-ignored). The table (screen, role, words, controls, purpose) goes in the repo.
2. **Personas and journeys**: about 12 made-up personas, AI-played: founders (pre-seed to Series B, technical and not,
   busy, phone-first, skeptical of "another community app"), portfolio managers / platform leads at funds (run the
   portfolio community, want engagement and to see who needs help), plus one fund partner and one mentor. For each role,
   write the 3–5 jobs they hire the app for (e.g. founder: "get quick help from a peer who has done this", "drop into a
   live room", "find an intro"; manager: "get founders to show up", "announce", "see asks"). Map each job to a journey
   through today's screens.
3. **Per-screen feedback**: run each persona as a separate subagent (Agent tool, the Claude subscription, no paid API
   models) that walks its journeys screen by screen from the screenshots and screen text, in character, and answers for
   every screen: what is confusing, what is complicated, what text they would skip, what they expected to find, and the
   fastest path to their goal. Ground answers in the real screens; quote the exact confusing words.
4. **Synthesis -> SPEC** (`.ai/features/simplify-round6/SPEC.md`, plus `STUDY.md` with the evidence): group the feedback
   by cause (not one line per complaint). Propose: the member tab set (at most 4–5 tabs, Rooms first), what each removed
   tab becomes (merged, moved to a profile/more menu, admin-only, or turned off by default), a text rule (e.g. headline +
   one line per screen, no paragraphs of explanation), screen-by-screen cuts with before/after word counts as targets,
   and the phone app's tab bar. Keep every capability reachable unless the study shows nobody needs it; say which.
   Split the build into 3–5 independent parts that can run in parallel worktrees, each with acceptance checks that a
   separate verifier can drive in a real browser.
5. **Two feature specs** in the same style as other `.ai/features/*/SPEC.md`:
   - `room-join-notify`: when a member joins (or starts) a room, they can choose "notify others" (opt-in at join, default
     off unless the study says otherwise). Who gets it (everyone / people I follow / chosen people), one-tap open of the
     room from the alert, respects mutes and the schedule below, a rate limit (see the existing "I'm available" limit of
     3 a day). Reuse `notify()` and `src/shell/voice-alerts.ts`.
   - `notify-schedule`: a member sets when they do NOT get portfolio alerts, e.g. working hours. Quiet hours already exist
     (`src/platform/notifications/contract.ts`, page `/me/alerts`) as one window: decide from the study whether to
     extend it (several windows, "working hours" preset, "pause for 1 hour / today") and make it reachable in one obvious
     place (e.g. from Rooms and the profile).
6. A PR with the specs and the study only (`.ai/` files), CI green. Do not merge it; the lead merges after review.

## Rules
- Run everything in the foreground; never run_in_background or Monitor (a background job dies when you end).
- No private data in the repo: made-up people, example.com. No paid API models; subagents run on the subscription.
- Stop at autobuild's safety stops and report in `.ai/tmp/progress.txt` (money, publishing, anything outside this
  worktree and its throwaway database).
- Clean up your throwaway Postgres container and dev server when done.
- Final output: the PR URL, the proposed tab set, the top 5 causes of confusion with evidence, and the build parts.
