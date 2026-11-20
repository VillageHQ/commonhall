# P03: intro asker (a Series A founder on the demo member account, Sam Lee, on a phone at 390px)

Goal: find someone in the portfolio who can get me to a fintech investor, ask for the intro, follow it, and message someone.
Demo: http://localhost:9563. Screenshots: `measure/shots/p3-01.png` to `p3-23.png`.

## Journey summary

| # | Journey | Screens | Taps | Fields typed | Decisions before first value | First value |
|---|---|---|---|---|---|---|
| 1 | People search for an intro path to a fintech investor | 1 (/people, plus the Filter panel) | 3 on the path that worked (chip, Search their networks, card); 2 dead ends first | 1 (search box) | 4 chips + choosing Enter (members) or "Search their networks" (network) + 7 filter controls if Filter is opened = up to 13 | "Ask Ada for an intro" card: Tom Becker via Ada Okafor, with the path drawn |
| 2a | Ask for an intro from a network result | 2 (card, then /search/ask, then intro status) | 2 | 1 (I had to rewrite the note) | 1 (keep or rewrite the prefilled note) | "Asked. We emailed your note" |
| 2b | Ask for an intro from a profile (Noah Berg) | 2 (profile, then /intros/new) | 2 | 1 to 4 (Name, Role, Company, note; only Name is required) | 4 fields, none marked optional | "Asked" status page |
| 3 | Follow the status and withdraw | 3 (Inbox All, Intros tab, intro page) | 3 (Inbox, Intros tab, Withdraw) | 0 | 1 (which Inbox tab; "All" hides my own asks) | Status "With Ada" / "Withdrawn. Your ask is back." |
| 4 | Message a member from their profile | 2 (profile, then /messages/new) | 2 (Message, Send) | 1 | 0 | Message shown in the thread |
| + | Follow, Book a call | profile | 1 | 0 | Profile action row: Message, Ask for an intro, Book a call (mentors only), Follow; also LinkedIn, Apply x2, Block | "Following" |

Journey 1 in detail (what an impatient founder actually hits):
1. Tapped "An investor": the placeholder changed to "e.g. seed investors in clim…", and the list stayed at 20 members.
2. Typed "fintech investor" and pressed Enter: "No member matches. Try other words, or clear the filters." (dead end 1)
3. Tapped "Search their networks" with an empty box: nothing happened (dead end 2).
4. Typed "seed investors in fintech", then tapped "Search their networks": 2 people in reach (Tom Becker, a partner at a *climate* fund, and Jonas Lind, an angel), each with "Ask Ada for an intro". First value came after about 6 actions.

## Findings

1. **Where:** /people, the "Who are you looking for?" chips (A customer / A hire / An investor / An expert).
   **What they faced:** 4 choices placed first on the page. Picking one changes only the placeholder. The member list stays at 20, and network results are identical with or without the chip (the address is `?q=fintech&scope=network&net=1` either way).
   **Why it stalls this persona:** the founder spends the first tap on a decision that does nothing, then assumes search is broken.
   **Harm:** 3.
   **Simpler default:** remove the chips, or make one tap run the network search for that kind of person.

2. **Where:** /people, the search box (Enter) versus the "Search their networks" button.
   **What they faced:** 2 search modes. Enter searches members by keyword only. Network reach sits behind a separate button. The empty state for "fintech investor" says "Try other words, or clear the filters" and never mentions networks.
   **Why it stalls this persona:** an intro path to an outside investor is the whole job, and the default path (Enter) can never find one.
   **Harm:** 4.
   **Simpler default:** a single search that returns members and people in reach together. When no member matches, show the network results.

3. **Where:** /people, the member keyword search.
   **What they faced:** words are ANDed: "fintech" gives 4, "investor" gives 3, "fintech investor" gives 0.
   **Why it stalls this persona:** they type a natural phrase (which the placeholder itself suggests: "e.g. seed investors in …") and get nothing.
   **Harm:** 3.
   **Simpler default:** match any word and rank by how many words match.

4. **Where:** /people, the Filter panel.
   **What they faced:** a 2-way segment (Everyone / Experts and mentors) plus 5 selects with 44 options in all: Stage 6, Sector 10, City 19, Cohort 5, "Updated" 4. Stage lists "Fund" as a stage. None of them answers "who can intro me to an investor".
   **Why it stalls this persona:** 7 controls to scan, and none of them helps with the task.
   **Harm:** 2.
   **Simpler default:** keep Sector only, and drop City, Cohort and "Updated: any time" from the phone view.

5. **Where:** /people, "Search their networks" with an empty search box.
   **What they faced:** a silent no-op, with no message and no results.
   **Why it stalls this persona:** it is the obvious button for this goal, and it looks broken.
   **Harm:** 3.
   **Simpler default:** with an empty box, run the search for the chosen kind of person, or focus the box and say "Type who you need".

6. **Where:** network results (`?scope=network`).
   **What they faced:** members already in the community appear as "in reach" ("Already in Northwind Founders. See Elena's profile"), and the same people appear again in "4 matches" below. On the investor search, "No member matches." sits under 2 good results.
   **Why it stalls this persona:** the same names twice, plus a "no matches" line, make them doubt the results.
   **Harm:** 2.
   **Simpler default:** leave members out of the "in reach" list, and hide the empty member section when network results exist.

7. **Where:** network results, the result order.
   **What they faced:** for "seed investors in fintech" (with the investor chip), the first result was "Partner, Greenline Climate Fund", which is not fintech.
   **Why it stalls this persona:** they need a fintech investor, and the top hit is the wrong sector.
   **Harm:** 3 (this may be the fake Village data).
   **Simpler default:** rank sector matches first and show why each person matched.

8. **Where:** /search/ask (from a network card), the note field prefilled for Ada.
   **What they faced:** 1 field, prefilled with: "An intro to procurement at a US hospital group. Could you introduce me to Tom at Greenline Climate Fund?" That is the member's standing "Looking for" text glued onto a different target.
   **Why it stalls this persona:** they must read it, notice it contradicts itself, and rewrite it on a phone keyboard.
   **Harm:** 4.
   **Simpler default:** prefill only "Hi Ada, I'm Sam (Tallyhealth). Could you introduce me to Tom Becker at Greenline?"

9. **Where:** /intros/new (profile, "Ask for an intro"), the note field.
   **What they faced:** the same stale prefill (hospital procurement, two pilots), whatever target is typed. I sent it with only Name = "Lars Holm" filled, and the hospital-procurement note went out as written.
   **Why it stalls this persona:** an impatient founder taps Send and an off-topic ask goes to a peer. It is embarrassing and costs one of 5 weekly asks.
   **Harm:** 4.
   **Simpler default:** build the note from the target fields ("…introduce me to {Name}, {Role} at {Company}"), or leave it blank and require it.

10. **Where:** /intros/new, the Name, Role and Company fields.
    **What they faced:** 4 fields in all. Only Name is required, yet none is marked optional.
    **Why it stalls this persona:** they type 3 fields and assume all are required.
    **Harm:** 3.
    **Simpler default:** one "Who? (name, role, company)" field plus the note.

11. **Where:** a profile with no network shared (Noah Berg), "Ask for an intro" as the primary button.
    **What they faced:** the profile says "Noah hasn't shared a network yet", but the black primary button still asks Noah to intro you to someone you must name yourself.
    **Why it stalls this persona:** they don't know whom Noah knows, so they must guess a name.
    **Harm:** 3.
    **Simpler default:** when no network is shared, make Message the primary action ("Ask Noah who they know").

12. **Where:** Ada's profile, "Who Ada can introduce you to", the "Search" button.
    **What they faced:** it links to plain `/people` (`href="/people"`), so Ada's context is lost and the page lists all members.
    **Why it stalls this persona:** they expected to search Ada's contacts and land back at the start.
    **Harm:** 3.
    **Simpler default:** link to the network search limited to Ada, with the search box focused.

13. **Where:** /inbox, the "All" tab.
    **What they faced:** "All" shows "Waiting on you" and "Messages" but not "You asked". My 2 open asks appear only under the Intros tab (/intros redirects to `/inbox?show=intros`).
    **Why it stalls this persona:** "All" doesn't show everything, which costs an extra tap and makes them doubt the ask went out.
    **Harm:** 2.
    **Simpler default:** show "You asked" in "All", or drop the tabs.

14. **Where:** the intros list and the intro page, the status words.
    **What they faced:** "with target", "introduced" next to "Introduced", and "You withdrew the ask (did not happen)".
    **Why it stalls this persona:** they have to decode jargon, and "(did not happen)" reads as if the withdraw failed.
    **Harm:** 2.
    **Simpler default:** use plain states: "Waiting for Ada", "Waiting for Tom", "Introduced", "Withdrawn".

15. **Where:** the intro page, "Withdraw my ask".
    **What they faced:** a single tap, no undo, and it is permanent ("Ada won't be asked again").
    **Why it stalls this persona:** a stray thumb tap on a phone permanently closes an intro path.
    **Harm:** 2.
    **Simpler default:** keep it one tap, and show an "Undo" toast for 10 seconds.

16. **Where:** profile, "Follow".
    **What they faced:** it toggles to "Following" with no word on what that gives you (alerts? feed?).
    **Why it stalls this persona:** it is a decision with an unknown effect.
    **Harm:** 1.
    **Simpler default:** after the tap, show one line: "You'll see Noah's updates on Today."

17. **Where:** /messages/new, the composer hint.
    **What they faced:** "Enter sends. Shift and Enter adds a line."
    **Why it stalls this persona:** a phone keyboard has no Shift+Enter.
    **Harm:** 1.
    **Simpler default:** hide the hint on touch devices.

## Visibly broken things

- The "Who are you looking for?" chips do nothing to the results: members stay at 20, and network results and the address are identical with or without a chip (p3-02, p3-21, p3-22).
- "Search their networks" with an empty box is a silent no-op (p3-06).
- Ada's profile, "Who Ada can introduce you to", the "Search" button: `href="/people"`, a generic list with Ada's context lost.
- The prefilled intro note ignores the target. It is the member's standing "hospital procurement" text, and it was sent as is to Noah for "Lars Holm" (p3-11, p3-12). On /search/ask it reads "An intro to procurement at a US hospital group. Could you introduce me to Tom at Greenline Climate Fund?" (p3-08).
- On network results, "No member matches." sits under 2 results (p3-07), and members are listed twice when the query matches them (p3-21).
- The asks counter showed "1 of 5 asks left this week" both before my 2 asks and after I withdrew both ("Your ask is back"). I expected it to rise to 2. Not verified: other testers share this demo account and may have used asks.
- The People list showed "20 members" including Sam Lee himself on the first load, and "19 members" without him later (p3-01 vs the later walks). This may be a concurrent edit by another tester.
