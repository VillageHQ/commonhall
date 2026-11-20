# Notes: Today and People lead with what waits (less-choice Part 2, how it works today)

Spec: [less-choice/SPEC.md](../less-choice/SPEC.md) Part 2 · charter: [CHARTER.md](CHARTER.md) · proof: `reports/`.

## Today (`src/shell/today-list.tsx`, `src/app/(app)/today/page.tsx`)
- Order: the header, "Waiting on you" (at most 3), then the live room, the install card, the fill-in question, "You
  could help", "Is this right?", next steps, "More for you". `today.css` keeps the sections' gap after the waiting list.
- The heading counts the waiting items shown (the cap of 3 included), never the ones held back.
- "Fill in your card from public profiles?" shows only while the admin asks each member, the member hasn't answered,
  and the card is empty (`isCardFilledIn`: role, company, bio or "can help with").
- `src/components/alerts/install-card.tsx`: shown on one visit. The first time it shows (or is closed) it writes
  `commonhall:install-card-dismissed` in `localStorage`; the visit reads that once on mount, so it stays for the rest of
  that visit. Never inside the store app (`isInNativeApp`, the bridge's `window.CommonhallApp`) or once installed.

## People (`src/shell/people-screen.tsx`, `src/modules/members/components/member-directory.tsx`)
- Above the list: the box, Filter, and "Mentors and experts" (a link-styled button that switches the view and keeps
  the words; "Everyone" switches back). The "Who are you looking for?" chips are gone.
- Search (`reads-directory.ts`, `toSearchWords` in `rules-directory-url.ts`): the words split on spaces; small linking
  words drop out ("in", "of", "the"…); a plural's final "s" is dropped ("investors" → "investor", never "business").
  A member matches when any word does; with 2 words or more, those matching most words come first, then by name. A word
  of 3 letters or fewer matches whole words only (Postgres `~* \mword\M`), so "us" doesn't find "business" and "ai"
  finds "Applied AI". A search of only small words or a sign ("%") is looked for as typed.
- `MemberDirectory`'s `elsewhere(search, place)` slot: People passes the network offer. With Network on, Village set up
  and the member's network connected it is "Search their networks for “…”": the empty state's main button when no
  member matches, one line under the list when some do; gone once the address already searched those words. A member
  not yet connected gets "Connect your network" in the same places. Without Network or Village: nothing.
- The search itself never runs on typing or Enter (council, 20 Nov 2026): only the tap moves the address to `net=1`.

## Tour
`tour/src/steps.ts`: the Search step taps the empty state's offer (`[data-slot='people-network-offer']`); Book a call
taps `[data-slot='people-view-link']`.

## Checks
`node .ai/features/choice-today/reports/proof.mjs` (needs a build and `.ai/tmp/study.env`): 16 checks at 390 and
1280 px. Tests: `src/shell/today-list.test.ts`, `src/modules/members/members.test.ts` (search), `profile-rules.test.ts`
(`toSearchWords`).
