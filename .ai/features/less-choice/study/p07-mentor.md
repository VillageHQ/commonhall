# P07 — Mentor/operator (office hours, 10 min/week) + founder booking a mentor — phone 390px

Demo: http://localhost:9563, signed in as the one member (Sam Lee), session `p7-mentor`. Shots: `measure/shots/p7-*.png`.

## Journey summary

| # | Journey | Screens | Taps | Fields typed | Decisions before first value |
|---|---|---|---|---|---|
| 1 | Set up office hours (booking link) | 3 (Today → /me → /me/booking) | 3 (avatar, "Booking link" row, Save) plus one retry | 1 (URL), typed twice | 2: find where it lives (no entry point except row 2 of 6 settings rows under 13 profile fields, ~1,700px down /me); "Show it to" (2 options, default Everyone, fine). Then a silent third: there is no way to say "I am a mentor", so the link does not put you in the "An expert" list |
| 2 | Founder finds a mentor, books | 2 (/people → /people?view=experts), or 3 via the profile | 3 (People, "An expert", "Book a call" opens the booking site in a new tab) | 0 | 1 if they use the chip. The Filter route adds a choice of 2 tabs and 5 dropdowns (44 options) |
| 3 | See who needs help, help one | 3 (Today → /asks → /asks?tab=for-you → ask) | 4 (Asks, "For you 2", "You could help", "I can help") | 1 optional note | 1: Today shows no asks you could help with, so you have to know that Asks › For you exists. Asks opens on a composer (Ask/Update toggle, text, Post, optional "Who are you trying to reach?", quota) and not on the list |
| 4 | Library / Jobs / Perks | 3 | 1 each to view | 0 | Browsing: none. Library "Share something": 7 decisions (Title, Pitch, Kind 6 options, Role 9 options, Description, Files, "Who can see it" 3 options) plus "More details". Jobs: 1 company dropdown (4 options), harmless. Perks: one Claim per card, none |

First value reached: J1 the link saved, but the mentor is still not findable as a mentor. J2 the booking page opened after 3 taps. J3 the help was sent after 4 taps ("Thank you. They hear from you by email.").

## Findings

1. **where:** `/me/booking` + `/people?view=experts` (community role). **what they faced:** saving a booking link gives you "Book a call" on your profile, but the "An expert" / "Experts and mentors" list (5 people) is driven only by an admin-set community role. Sam saved a link and does not appear in it. There is no control (0 options) to say "I mentor". **why it stalls:** the operator's whole goal is founders finding their office hours. They do the setup and get nothing back: no bookings and no sign that they are listed. **harm:** 4. **simpler default:** anyone with a booking link appears under "An expert" (or saving the link offers "List me as a mentor", ticked by default).

2. **where:** `/me` › settings row "Booking link · Not added". **what they faced:** the only entry point sits below 13 editable profile fields (13 "Edit" links). It is the 2nd of 6 settings rows, ~1,700px down a 2,226px page. Nothing on Today, People or the own profile view (`/people/<me>`) says "Offer office hours". **why it stalls:** a 10-minute-a-week mentor will not scroll a founder-style profile form to find it. **harm:** 3. **simpler default:** a one-line "Offer office hours: paste your booking link" card on Today (or on the own profile view) for members with "Can help with" filled in or a mentor role.

3. **where:** `/me/booking` › Booking link field. **what they faced:** `cal.com/demo-mentor` was rejected with "Use a full https:// address…". The field had to be typed twice. **why it stalls:** on a phone people paste or type the short form. A second round on a one-field form feels like failure. **harm:** 2. **simpler default:** add `https://` yourself when it is missing.

4. **where:** `/people/<mentor>` (Grace Kim) action row. **what they faced:** 4 actions (Message, **Ask for an intro**, Book a call, Follow). The black primary button is "Ask for an intro" (its accessible name is "Ask for an intro via Grace"), and "Book a call" is secondary. **why it stalls:** the founder came to book this mentor. The primary button suggests a different, slower path (an intro *through* her) and makes them stop to compare. **harm:** 2. **simpler default:** when a member has a booking link, make "Book a call" the primary button and put Follow/Message after it.

5. **where:** `/people` header. **what they faced:** 7 controls before the list (search, Filter, 4 intent chips, "Search their networks"). Inside Filter: 2 tabs ("Everyone" / "Experts and mentors") plus 5 dropdowns (Role 5, Stage 5, Sector 10, City 19, Cohort 5 = 44 options). "An expert" chip and "Experts and mentors" tab do the same thing (both → `?view=experts`). **why it stalls:** a founder looking for a mentor sees two names for the same thing and a 44-option panel. **harm:** 2. **simpler default:** drop the "Experts and mentors" tab, since the "An expert" chip already does it. Within experts, show only Role.

6. **where:** `/today` for a member whose profile matches asks. **what they faced:** "3 things wait for you" = 2 intro answers plus their own ask. The 2 "For you" asks (one tagged "You could help") are not on Today. **why it stalls:** the persona's 10 minutes a week start on Today. "Who needs my help" is 2 taps and a tab away, and only someone who knows the tab will find it. **harm:** 3. **simpler default:** put the top "You could help" ask on Today under "Waiting on you", with "I can help" inline.

7. **where:** `/asks` top. **what they faced:** the page opens on the composer: Ask/Update toggle (2), "What do you need?", Post, optional "Who are you trying to reach?", and "0 of 5 asks left this week" with 5 empty circles. The composer is still active at 0 left. Then search, then 3 tabs (Open / For you 2 / Yours). **why it stalls:** a helper scrolls past a posting form to reach asks. Empty circles next to "0 left" read as "5 available", which contradicts the text. **harm:** 2. **simpler default:** open on "For you" when it has items. Fold the composer into the "Post an ask" button (Today already has one). Hide or disable Post at 0 left.

8. **where:** `/asks/<id>` › "I can help". **what they faced:** an optional note plus "I can help". The mentor's saved booking link is not attached. In the walk the note had to say "book any slot on my link", and the link is not in it. **why it stalls:** the natural follow-up for a mentor is "book me". The founder gets an email without the link and must go find the profile. **harm:** 2. **simpler default:** when the helper has a booking link, add "Book a call with Sam" to the answer and the email automatically.

9. **where:** `/library/new` ("Share something"). **what they faced:** 7 decisions: Title, One-line pitch, Kind (6), Role (9), Description, Files, Who can see it (3), plus "More details". Kind and Role both start on "Pick one". **why it stalls:** a mentor sharing one prompt must classify it twice before posting. **harm:** 2. **simpler default:** Title plus a paste or a file. Guess Kind from the content, make Role optional, and default visibility to the whole portfolio, already the default.

10. **where:** `/library` list, upvote buttons. **what they faced:** 4 of 8 upvote buttons are solid black (already upvoted) and 4 are outlined. Black is also the app's primary-action colour. **why it stalls:** the black buttons look like "Upvote" calls to action. Tapping one takes the vote back. **harm:** 1. **simpler default:** show upvoted as a quiet filled icon plus count, not a primary-styled button.

## Visibly broken things

- `/me/booking`: a link without a scheme was rejected instead of fixed (see 3). The same form clears the field after the failed Save, so the person retypes.
- `/people` Filter: all 5 dropdowns have no accessible label (read as " [6 options]", " [10 options]"…). Same for 2 of the 4 composer fields on `/asks` (named "") and the 2 Library filter dropdowns.
- `/me`: an unlabeled button and an unlabeled link (accessible name ""). The "City" row's chip shows the text "from public profiles", but its accessible name is "Hide the city from public profiles". A label that looks like it names a data source is actually a hide action.
- `/library` header: a button with no accessible name (""). The Library filter's dropdowns are counted as visible while the "Filter" disclosure looks closed.
- `/asks`: the composer still accepts typing and shows Post at "0 of 5 asks left this week". The 5 empty circles contradict "0 left".
- `/today`: "Maya Ortiz asks you to introduce them to Dana Ortiz". "them" for a single named person reads as an error.
- Radio styling is inconsistent: `/me/booking` uses large card radios, while `/library/new` "Who can see it" uses small native blue radios.
- The own profile view (`/people/<me>`) never shows your own "Book a call", so a mentor cannot check that the link is live after saving.
