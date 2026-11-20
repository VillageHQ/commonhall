# Charter: Today and People lead with what waits (less-choice, Part 2)

Approved scope: Part 2 of [less-choice/SPEC.md](../less-choice/SPEC.md), with the council's decisions of 20 Nov 2026
(network search never on Enter; one tap offers it when no member matches). Built by one round-7 builder beside the
other parts; smooth-app owns the tab bar and the `loading.tsx` files, so none are added here.

## Direction
- **Today:** "Waiting on you" first; the heading counts exactly the items shown. The "add to home screen" card shows
  on one visit (or until closed), never inside the store app. "Fill in your card from public profiles?" stops once
  the card has words in it.
- **People:** the "Who are you looking for?" chips go; "Mentors and experts" stays as one link under the box. Member
  search matches any word, those matching most first. "Search their networks for “…”" is one tap: the empty state's
  main action when no member matches, and one line under the list when some do.
- **Not in this part:** everything in Parts 1, 3, 4, 5; loading screens; Today's "Read" clearing; the Filter panel.

## Small calls taken
- The network offer stays under the list when members match, so a founder who wants an outside investor still gets
  there in one tap (the spec's "at most 3 controls above the list" holds: box, Filter, Mentors and experts).
- "Connect your network" moves to the same places as the network offer (under the list, or in the empty state).
- Small linking words ("in", "of", "the"…) don't count as search words; a plural's "s" is dropped ("investors" finds
  "investor"). A search of only such words is looked for as typed.
- The waiting list keeps its cap of 3; the heading counts the shown items.

## Checks (from the spec)
1. Today's first block is the waiting item (p02's account), at 390 and 1280 px.
2. "fintech investor" lists members (before: 0), those with both words first.
3. The empty state's one tap starts the network search with the words in.
4. Controls above People's list: at most 3 (before: 7).
5. `src/shell/today-list.test.ts` and People's tests (`src/modules/members/members.test.ts`,
   `profile-rules.test.ts`) green.
