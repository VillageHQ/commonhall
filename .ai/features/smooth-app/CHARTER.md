# Charter: round 7, part 1 — evidence and specs only (smooth-diagnose)

**Approved:** the owner's round-7 goal, 20 Nov 2026, run on autopilot by the round's orchestrator, which wrote this
part's brief. No product code changes in this part.

## Direction (the owner's words, after testing TestFlight build 3)
- "Not very smooth: bad scroll effects, and delays when I click a menu item." Should the app go more native than Expo?
  (Expo is React Native; the real question is web view versus native screens.)
- "Start a room" starts right away and notifies everyone by default, with no options; people control what they
  receive ("don't notify me"); picking specific people is for later.
- Find similar complexity and analysis paralysis elsewhere in the app. Simplicity is the top value.

## In
1. `smooth-app/DIAGNOSIS.md`: every cause of scroll jank and tap delay, measured where possible.
2. `smooth-app/OPTIONS.md`: tune the web view / native shell / fully native, with trade-offs and one pick;
   `smooth-app/SPEC.md`: the build spec for the pick, in parallel parts with driven checks.
3. `room-start-instant/SPEC.md`: one tap starts a room and alerts everyone; members control receiving.
4. `less-choice/AUDIT.md` from ~12 AI-played personas on the current build, and `less-choice/SPEC.md` with the top fixes.
5. One pull request with these `.ai/` files only, CI green, not merged.

## Out
Product code, store builds, merging. The council settles the forks listed in each spec before the build.

## Rules kept
A throwaway Postgres on a free port and made-up people only; the demo database on 9495 untouched; subagents in the
foreground on the subscription.

---

# Charter: round 7, part 2 — the build (smooth-app)

**Approved:** the round's orchestrator brief (20 Nov 2026), on the owner's round-7 goal and the council's decisions in
[SPEC.md](SPEC.md) ("Decisions"). The spec is the approved page; this section only records the scope.

## In
Part 0 (the contract), Part A (instant tabs on the site), Part B (the app's web view), Part C (the app's chrome on the
site), measured before and after with `reports/measure.mjs`, checked by a separate verifier at 390 px and 1280 px and in
the store app's web preview. One pull request, not merged.

## Out (the council, 20 Nov)
- Part D (a native tab bar): waits for the owner's phone test of TestFlight 4.
- The experimental Next.js tab cache (`experimental.staleTimes`): not turned on. Spec Part A's "reuse visited tabs for
  30 seconds" and its check 3 (a revisit with no page request) are dropped with it; a revisit shows the outline at once.
- Store builds and publishing.
