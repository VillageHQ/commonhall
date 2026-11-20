# P4: the connector (Sam Lee, member). Analysis-paralysis audit, round 7

Demo http://localhost:9563, phone 390px, session `p4-connector`. Screenshots are `measure/shots/p4-*.png`.
Setup: when the walk began, no intro ask was waiting on Sam (another tester had already answered Marcus to Rachel). As admin Maya, I sent Sam two named intro asks (Dana Ortiz at Mercy Ridge, Leo Brandt at Lakeshore) so the walk had something to answer.

## Journey summary

| # | Journey | Screens | Taps | Fields typed | Decisions before first value |
|---|---|---|---|---|---|
| 1a | Intro **yes** (Today > Answer > Yes > email > Send; Dana accepts) | 3 for Sam (Today, intro, result), +1 "Make a new link" panel; Dana 1 | Sam 4 (Answer, Yes, Send, plus 1 failed Send because the email is required but only shows after Yes); Dana 2 | 1 (Dana's email) | 4: (1) read Maya's note, which sits **below** Send; (2) pick 1 of 3 radios; (3) whether to open "Edit the note" (the note starts "Hi Sam" and goes to Dana as it is); (4) find Dana's email. Nothing to "mark introduced": the state moves to Introduced by itself after Dana says yes. |
| 1b | Intro **no** (Answer > Not this time > Send) | 2 | 3 | 0 | 2: "Not this time" or "I don't know them well" (both say "never told why"; the difference isn't explained), and "Edit the note" still shows, though a no sends nothing. |
| 2 | Asks: help on one | 3 (Asks, For you, ask) | 4 (For you, open ask, note, I can help) | 1 (optional note) | 3: get past a composer with 7 controls above the list; work out which asks are really "for you" (both For you asks already had Sam's answer from earlier testers, still listed); decide what to put in one box whose placeholder mixes two kinds ("How you know them, or what worked for you"). There is no separate "I know someone", no "What worked for you?" and no private note. It is one "I can help" button with an optional note. |
| 3 | Hide or skip asks not for me | 3 (Asks, For you, ask detail) | n/a | 0 | **Blocked.** No hide, skip or "not for me" on the Asks board cards or on the ask page (only "Report this ask"). Today has "Not this week" only for asks routed to you; there were none for Sam at test time. The "Not for me" card (`helpable-asks-card.tsx`) is not rendered anywhere. |
| 4 | How many asks I get per week, and a limit | 3 (/me, /me/privacy, /me/alerts) | 3 | 0 | **Not answerable.** No screen shows how many asks Sam received this week. The only number ("1 of 5 asks left this week") is about asks Sam *sends*. The only control is an on/off switch on Privacy (all or nothing). A fixed cap of 10 intro asks a week per connector exists (`connectorWeeklyCap: 10`) but is shown only to admins. |

## Findings

1. **where:** `/intros/<id>` (ask waiting on you), Maya's note card.
   **faced:** 3 radios + "Edit the note" + Send come first; the note that explains the ask comes after Send (below the fold on a 390px phone).
   **why it stalls:** a connector decides on the note. Here they decide first and read after, or scroll down and back up.
   **harm:** 3.
   **default:** put the note (and who is asking) above the choice.

2. **where:** same page, radios "Not this time" / "I don't know them well".
   **faced:** 3 choices with no default; the two no's have the same visible result ("never told why").
   **why it stalls:** "which no is the polite one" is exactly the goodwill worry this persona has.
   **harm:** 2.
   **default:** two buttons, "Introduce" and "No thanks" (one tap each, no Send).

3. **where:** same page, Yes then "Dana's email" (required) and "Edit the note".
   **faced:** the email field appears only after Yes, isn't marked required, and Send fails once ("Add Dana's email, so we can ask them"). The note to forward starts "Hi Sam," and is sent to Dana as is unless Sam opens "Edit the note".
   **why it stalls:** a yes "in seconds" turns into looking up an email and rewriting someone else's note. Sending it as is looks careless to Dana.
   **harm:** 4.
   **default:** after Yes, offer "Copy link" as the main action (no email needed), and have the app write the opening line to Dana.

4. **where:** `/intros/<id>` after Yes: "Now ask Dana" box and "Make a new link".
   **faced:** text says "We emailed Dana… Nothing more to send", then "Lost the link? Make a new one", though Sam never saw a link. Tapping it opens 4 more controls: Copy the note, Copy just the link, a Dana's email field, and Email Dana ("Or let us email Dana for you", already done).
   **why it stalls:** Sam can't tell whether he's done or still has to send something.
   **harm:** 3.
   **default:** one line, "Done. We emailed Dana," and a small "Copy her link" for texting.

5. **where:** `/asks/<id>`, "A note for Ada (optional)" + "I can help".
   **faced:** one box for two kinds of help. The app picks the label itself: Sam wrote "Our ex-CFO… happy to connect you" (a know-someone answer) and it posted as "**Has done this**".
   **why it stalls:** Sam's answer is labelled wrong in public under his name, and the box gives no hint which kind it will be.
   **harm:** 3.
   **default:** two one-tap buttons, "I know someone" and "I've done this", note optional.

6. **where:** `/asks/<id>`, the same note.
   **faced:** labelled "A note for Ada", it is in fact public. Checked as Maya: Sam's note shows under "2 answers" for every member.
   **why it stalls:** a connector who writes candidly to one founder finds it posted to the whole board. There is no private option at all.
   **harm:** 4.
   **default:** a note to the author is private (only Ada sees it), and a public answer is a separate action.

7. **where:** `/asks` top: Ask/Update toggle, "What do you need?" field, Post, "Who are you trying to reach? (optional)" (opens Person and Company), the allowance pips, and search.
   **faced:** 7 controls before the first ask.
   **why it stalls:** this persona opens Asks to give help, not to post. The posting form pushes "For you" below the first screen.
   **harm:** 2.
   **default:** "Post an ask" as one button. Open on "For you".

8. **where:** `/asks?tab=for-you` list.
   **faced:** the "For you 2" count and list include asks Sam has already helped on. No "why you" line on the card; "1 member can help" on the detail page doesn't say it's him.
   **why it stalls:** Sam re-opens asks to find out whether he already answered them.
   **harm:** 3.
   **default:** drop asks you've answered from For you, and show "You know Dana Morris" on the card.

9. **where:** Asks board and ask page (journey 3).
   **faced:** 0 ways to hide or skip. The only choices are to scroll past every time or tap "Report this ask".
   **why it stalls:** for someone asked a lot, a board you can't clear means the same asks keep coming back.
   **harm:** 4.
   **default:** a "Not for me" on every For you card. The code exists in `helpable-asks-card.tsx` but nothing renders it.

10. **where:** `/me/privacy` "Let members ask me for intros" switch; `/me/alerts` (journey 4).
    **faced:** Privacy has 1 on/off switch plus 5 radios. Alerts has 16 controls: Pause (2), quiet times (4 plus Change), "Let through" switch, 6 switches, a mute select with 20 options, and 1 unlabelled button. None of them limits or counts asks.
    **why it stalls:** the persona's real question is "how many will I get?" The app either says nothing or makes him turn intros off entirely. The fixed cap of 10 a week is never shown to him.
    **harm:** 4.
    **default:** on Privacy, "Up to 3 intro asks a week" (a 1–10 number) with "You got 2 this week" beside it.

11. **where:** `/me` and `/today`, "Fill in your card from public profiles?" (Yes / No).
    **faced:** a 2-way decision unrelated to the job (once on Today, once on /me), while /me also says "Filled in from public profiles · refreshed 31 Oct" and tags City "from public profiles".
    **why it stalls:** he has to decide something the app seems to have already done.
    **harm:** 1.
    **default:** don't ask once it's filled in.

## Visibly broken
- Intro page: the status pill shows twice in every state ("With Rachel" ×2, "Introduced" ×2, "Sam can't make this one" ×2). It is also written in the third person to Sam himself. See `p4-04.png` and `p4-13.png`.
- The asker's note goes to the person being introduced still saying "Hi Sam, …" (on Dana's consent page and in the copyable note).
- The help kind is labelled wrong: a know-someone note posts as "Has done this" (Ada's CFO ask).
- "A note for Ada" is public to all members.
- "Lost the link? Make a new one" appears when no link was ever shown. After the new link, "Or let us email Dana for you" appears again, though she was already emailed.
- "For you" count includes asks you already answered.
- Unlabelled controls: `/me` has 1 button and 1 link with no name; `/me/alerts` has 1 button with no name.
- `/me` asks "Fill in your card from public profiles?" while the same page says it was filled in on 31 Oct.
- On arrival from Today > Answer, the full-page screenshot (`p4-06.png`) shows a blank band above the header, with the "Intros" back link hidden. This may be a screenshot artefact of the sticky header after a scroll.
