# Journey: Today, the member's home

> ⚠ RECONSTRUCTED from code on 2026-11-10 — needs confirmation
> Sources: `.ai/features/today-weekly/NOTES.md`, `src/app/(app)/page.tsx`, `src/shell/today.ts`, `src/shell/today-list.tsx`.

Who: a member opening the app, often from a link in an email.

1. The member opens Today → "<name>, 2 things wait for you" (the count is exactly the items shown), "<name>, you
   could help", or "Nothing needs you right now".
2. "Waiting on you" comes first (round 7): intros for their yes, intros they are asked to make or finish, answers to
   their own asks; at most 3.
3. Then the live room (while one is live), the "add to home screen" card (one visit only, never in the store app),
   "Fill in your card from public profiles?" (only while the card is empty), asks they could help with, "Is this
   right?" lines in their first two weeks, next steps, and "More for you".
4. They act on an item in place (answer, offer help, open the intro) or tap "Not for me" on an ask → it leaves Today
   and the weekly email for them.
5. When everything is handled → "That's everything this week."
6. With the feed switched on, the same list sits beside the feed (above it on a phone). Perks shows a card when the
   Perks module is on.

The weekly email reads the same list (`readTodayItems`), so the two never disagree ([weekly-email.md](weekly-email.md)).
Tests: `src/shell/today-list.test.ts` (the order and the count), `src/shell/weekly-email.test.ts`, `src/modules/asks/asks-helpers.test.ts`, `src/modules/network/components/network-search.test.ts` (the box).
