# Charter: search needs your own Village, plus three search fixes (approved 2026-11-17)

Approved by Absi on the decision page "Real Village search: results and two choices" (page 9EHlu-7qTE6U-vVyq8t5oQ):
- "How should members without their own Village get search?" → **Each member must connect Village** (works today, fewer searchers).
- "Should Qareen fix the three small findings in one pull request?" → **Qareen fixes them and merges after checks**.

## Why
The real-service test on Fly (2026-11-16, report in
`C:/ai/code/.workspace/scratch/founderhall-vs-community/real-test-2026-11-17-village/report.md`) showed:
- a member who connected Village searches real networks (22 people, intro paths);
- a member who did not connect is refused: the app's shared search identity (`openPooledSearchSession`) is unsynced, and
  real Village refuses it. The member sees "Your Village account isn't linked yet. Sync your network first.";
- "Everywhere" search found 25 people, but its bundled intro-path read failed with a Village error, so every result said
  nobody knows the person;
- the admin, the only sharing member, read "Paths come from 0 members who share their network so far".

## Direction
- In: (1) network search needs the member's own connected Village. A member who has not connected sees a clear,
  friendly prompt to connect (with the link), not an error, and the app no longer uses the shared search identity for
  them. Remove the shared search identity code if nothing else needs it (simplest end state), with its settings and
  docs/README wording; keep a migration-free change if possible. (2) Fix the "Everywhere" intro-path failure at its cause
  (or degrade gracefully: results still show, paths say "couldn't load" rather than "nobody knows"). (3) The sharing
  count counts the viewer when they share.
- Out: any Village platform change; anything outside search and its prompts.

## Deciding facts
- Members who don't connect can still use everything else (Directory, intros from profiles, asks).
- Admin settings that only served the shared identity (the service email) go away or are hidden, if nothing else uses them.
- Estimate: build about 1 hour, tests about 20 minutes. A revert undoes the merge.
