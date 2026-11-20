# Charter: choice-asks (round 7, Part 1 of less-choice)

**Approved by:** the owner's round-7 spec on main, `.ai/features/less-choice/SPEC.md` (spec commit 89980e40), with the
council decisions of 20 Nov 2026 (Rams, Torvalds, Watts, 3 of 3). This build is Part 1 of that spec, run as one part
of an orchestrated round; the orchestrator owns the other parts.

## Direction
Asks and intros, decided in one tap. Simplicity first: when in doubt, cut.

## In
- Ask matching reads the ask's own words and the target's together. The target box stays folded, named
  "Name who you're trying to reach" (no "(optional)").
- The composer starts as an ask: no Ask/Update switch; "Post a win instead" is a small link under Post. Today's
  "Post an ask" opens the composer focused, with a box that shows the whole sentence on a phone.
- An intro ask (`/intros/<id>`): the asker and their note first, then "Introduce" and "No thanks" (one kind of no;
  the asker sees the same decline as today). Introduce shows the link with "Copy link" first; "Email it to <name>"
  is a second action holding the email field, shown only when the community sends email.
- The prefilled intro note comes from the person asked for and the asker, never from an earlier need.
- "I can help" commits on the first tap from Today; its note is private to the asker ("A note only <name> sees");
  the public line is the fixed sentence.
- "Not for me" on a For you ask hides it there and on Today.

## Out (not in this round)
Invite links skipping the second confirm; Copy returning the same invite link; merging My network consent with
Privacy's switch; anything in Parts 2–5.

## Checks (driven at 390 px and 1280 px by a separate verifier)
1. The same ask text finds at least as many helpers with the target box empty as with it filled.
2. Answering an intro ask yes from Today: 2 taps to a copyable link, 0 fields required.
3. The composer shows 1 box and 1 button before typing (before: 7 elements).
4. A note left with I can help is visible to the asker and not to a third member.
5. `src/modules/asks/*.test.ts`, `src/modules/intros/*.test.ts` updated and green.
