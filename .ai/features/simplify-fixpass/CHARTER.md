# Charter: simplify-fixpass + re-study (round 6, last part)

Approved by: the round-6 lead (autopilot, the owner's Telegram topic 82148, 20 Nov 2026). The lead's brief, word for word:

# Brief: simplify-fixpass + re-study (Commonhall round 6, last part)

Worktree: C:/Users/absi/.autobuild/worktrees/community__simplify-fixpass (branch absi-agent/simplify-fixpass, repo
VillageHQ/commonhall, PUBLIC, AGPL). All six round-6 parts are merged on main (PRs #99-#105). Read
`.ai/features/simplify-round6/SPEC.md` (incl. Decisions), STUDY.md and the part reports first.

## 1. Fix pass (small, one PR)
Fix these items found by the part builders and checkers, grouped by cause, without growing any screen past its word
target:
- "Until tomorrow" pause before 08:00 should end at the NEXT 08:00 (part 4 open q).
- Rooms React hydration error when browser and server time zones differ (room times; part 3 area).
- My profile needs an Alerts row (part 1/2).
- Alert log says "Sent" in demo though nothing is delivered — consider "Allowed" (part 0 q).
- Live now card only compares 5 newest live rooms; consider sorting rooms by people count (part 2 q1).
- Leave yourself out of the Live now faces (part 2 q2).
- /jobs phone tab bar highlights Directory; footer still shows Rooms · Library links (part 1 should fix; check after merge).
- Admin sidebar highlight mapping (part 1 owns; see PR #102 for the mapping) — check after part 1 merges.
- Mail page: move DNS/mail details under Advanced (part 5 q).
- Members tab row "Calls" half cut at 390px; Intro log cuts long state words at 1280px.
- Tour screens.tsx old Rooms subtitle; site/index.html line ~123 still advertises "I'm available to talk" (fix in final pass).
- Today live strip "Nobody in yet" vs Rooms card "Priya + 1" mismatch (demo).
- asks-commonhall test flake: add orderBy.
- .env.example + deploy README: ROOMS_ON_BY_DEFAULT; CLAUDE.md map: room-join-notify NOTES.
- "the directory" wording on Privacy / intro page / welcome step -> "People" (part 1 q1).

## 2. Re-run the persona study on the NEW app
Same 12 personas and journeys as STUDY.md (`.ai/features/simplify-round6/study/`), same method (each persona a separate
subagent on the subscription, run_in_background false, walking real screenshots of the new build at 390px and 1280px on a
throwaway local copy with made-up people). Write `.ai/features/simplify-round6/RESTUDY.md`: per screen and journey,
confusion points and words before vs after, what still confuses, and the kill-criterion check from the Decisions
("more than 3 of 12 personas still miss a live room from Today"). Fix the top issues if they are small and clearly
in scope; list the rest as roadmap lines.

## Done when
- The fix list is done and checked in a real browser by a SEPARATE verifier agent (foreground).
- RESTUDY.md is written with the before/after comparison.
- CI green, rebased on main, tour rebuilt last; a PR is open. Do NOT merge it.

## Rules
- Foreground only; never run_in_background or Monitor; subagents with run_in_background false.
- No private data; no paid API models. Throwaway Postgres on a free port; never the demo database on port 9495;
  pick a free app port (another builder may be running).
- Stop at autobuild's safety stops and report in `.ai/tmp/progress.txt`.
- Final output: PR URL, each fix PASS/FAIL with proof, the before/after table, the kill-criterion result.
