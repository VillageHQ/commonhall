# P09: portfolio manager (admin Maya), 15 min a day, laptop + phone

Demo at http://localhost:9563, session `p9-pm`, screenshots `measure/shots/p9-01..36.png`, 2026-11-20.
Other testers were changing the same demo while I ran this, so a few counts moved between loads (asks 3→4→5, intro log 15→17).
I checked every finding below against what I saw myself.

## Journey summary

| # | Journey | Screens | Clicks | Fields typed | Decisions before first value |
|---|---|---|---|---|---|
| 1 | Home → act on each "Needs you" item (laptop) | 6 (/admin, /admin/asks, /asks/:id, /admin/intros, /admin/invites, /admin/report + send) | 11 | 1 (partner email) | Per item, you land on a whole list with nothing marked: you have to pick out *which* ask, intro or invite the item means. **For asks with no help and the waiting intro, no action does what the item asks.** You can only Pin, Close or Remove an ask. The intro log has only a CSV button. |
| 2a | Invite one founder | 2 (Members → Invites tab) | 3 (Members, Invites, Send invites) | 1 | You have to answer the required "Profile fill-in: how did these members agree?" (2 radios + a date field) before Send. A cohort field is shown too. |
| 2b | Invite three by paste | 1 | 3 (radio, Send, plus nav) | 2 (emails, cohort) | Same consent question again. The mixed format (name, email / bare email) worked. |
| 2c | Make Noah a mentor | 2 (list → member page) | 3 (row, pick from the 6-option select, Save role) | 0 | On the page you meet 2 "role" ideas: Role (Make admin) and Community role (6 options). There are 6 buttons, including 2 orange destructive ones. |
| 2d | Find who has not joined | 1 | 1 (Invited chip) | 0 | 5 status chips (All, Invited, Joined, Connected, Admins). Joined and Connected are not explained. Then 6 separate Resend buttons. |
| 3 | Moderate asks + handle a flag | 3 (/admin/asks, /asks/:id, /admin/reports) | 6 (Pin; open ask; Report; Report it; Dismiss; Yes, dismiss it) | 0 | 3 buttons per ask (30 buttons at the start, 42 by the end). On the flagged page: 3 actions (Dismiss / Remove this ask / Remove Sam), and a confirm dialog even for Dismiss. |
| 3b | Partner report | 2 (/admin/report, /send) | 3 (Report, Send to partners, Send the report) | 1 | 3 periods (Q4 / Q3 / Since launch). Otherwise simple. |
| 4 | Announce to one cohort | 1 (/admin/announcements) | 6 (Announce, One cohort, select cohort, Send, Yes send) | 2 (subject, message) | 4 audiences, then 4 cohorts. There is no "Mentors only" audience. 4 merge-tag buttons, and a collapsed "Preview and test" with a 20-person "Preview as". |
| 5 | Phone: console ↔ founder view ↔ console | 3 | 3 (avatar, See it as a founder, Back to console) | 0 | Founder view is hidden in a 9-item avatar menu. Once there, Today stacks 3 prompts before any content (live room, Add to home screen, "Fill in your card from public profiles?" Yes/No). |
| 1-phone | Repeat Home items on phone | 3 | 3 | 0 | Same as on the laptop. The asks page is 5,408 px tall with 42 buttons. The partner report is not in the bottom bar; it is under avatar → More. |

## Findings

1. **where:** /admin "Needs you" → "N asks have no help yet" → /admin/asks.
   **faced:** a list of 13–16 asks with 3 buttons each (Pin / Close / Remove; 30 to 42 buttons in total). None of them gets the ask help. The ask page says "1 member can help", but it is plain text: you can't click it or see who it means.
   **why it stalls:** the item says "needs you", but the only things you can do are moderation. With 15 minutes, the PM can't match a helper to the ask, so the item never clears and comes back every day.
   **harm 4.**
   **simpler default:** next to each ask with no help, show the matched member and a one-click "Ask Grace to help" nudge.

2. **where:** /admin "1 intro waiting over 3 days" → /admin/intros.
   **faced:** the whole intro log (15–17 rows, 6 columns, 3 period tabs, 5 state chips). It is not filtered, the waiting intro is not highlighted, the rows can't be clicked, and the only button is CSV. At the time, 3 open rows were already older than 3 days (15, 16 and 17 Nov), but the tile said 1.
   **why it stalls:** they have to work out which row the item means, and then there is nothing to press.
   **harm 4.**
   **simpler default:** the link opens only the waiting intro(s), each with a "Nudge Julia" button.

3. **where:** /admin/invites and /admin/import, "Profile fill-in: how did these members agree?" (marked Required).
   **faced:** 2 radios plus a date field (05/04/2026, US format, so the month is ambiguous). This is a legal/consent decision placed above the Send button on every invite. The pre-selected option is "Members agreed in our membership terms on…", while the option tagged **Recommended** is the other one, "Ask each member at sign-in".
   **why it stalls:** someone who just wants to add one founder hits a compliance question, and the default contradicts the recommendation.
   **harm 3.**
   **simpler default:** pre-select "Ask each member at sign-in" and fold the terms option under "Change".

4. **where:** /admin/members sub-tabs.
   **faced:** 5 tabs (Members, Invites, Import, Sign-in links, Calls), plus 5 filter chips on the list. The Members list has no Invite button. There are 2 separate places to add people (paste in Invites, CSV in Import), and each repeats the consent question. Import's "Email each person their invite now" defaults to Off.
   **why it stalls:** "Invite a founder" means first picking the right tab. And with Import, the PM could unknowingly invite nobody.
   **harm 3.**
   **simpler default:** one "Invite" button on the Members list that takes a paste or a file, and emails people by default.

5. **where:** /admin/members status chips "Joined 7" and "Connected 13".
   **faced:** two words with no explanation. "Connected" seems to mean the member shares their Village network.
   **why it stalls:** a PM looking for "who hasn't really joined" can't tell which group to chase.
   **harm 2.**
   **simpler default:** a single "Joined" status, with Village sharing shown as a small icon.

6. **where:** /admin/members/:id.
   **faced:** "Role" (member / Make admin) and "Community role" (a 6-option select plus a separate Save role button) as two separate cards. Below them: Village link, LinkedIn, Remove member, and Delete account and data. That is 6 buttons, 2 of them orange destructive buttons stacked together.
   **why it stalls:** "make her a mentor" means telling apart 2 kinds of role and remembering to press Save. Remove and Delete look alike.
   **harm 2.**
   **simpler default:** save the community role as soon as it is picked, and put the destructive actions behind one "More" menu.

7. **where:** /admin/members?f=invited and the "6 invites not accepted yet" item on Home.
   **faced:** 6 separate Resend buttons and no "Resend all". The Home count included 4 invites I had sent 2 minutes earlier.
   **why it stalls:** the nag is noise right after inviting, and clearing it takes 6 clicks.
   **harm 2.**
   **simpler default:** count only invites older than 3 days, and offer one "Resend all".

8. **where:** /admin/announcements, "Who gets it".
   **faced:** 4 segments (Everyone / Founders / Mentors and experts / One cohort). "Mentors and experts" lumps 4 community roles together (Mentor, Expert, Advisor, Entrepreneur in residence, 6 people). There is no way to email only the mentors (2 people). The cohort select lists 4 cohorts, but members who are invited and haven't joined are left out, so the "Fund IV" cohort I had just used did not appear.
   **why it stalls:** the persona's real case ("mentors only") can't be done. They either email advisors too, or give up.
   **harm 3.**
   **simpler default:** one audience picker listing every community role and cohort, with the count next to each.

9. **where:** /admin/announcements page layout.
   **faced:** under the composer, the full weekly-email card (schedule, "Change the schedule", and Maya's whole digest preview) repeats what the "Weekly email" tab already shows. The page is 1,639–1,799 px tall. The composer also has a collapsed "Preview and test" with a 20-option "Preview as" select. Sending takes Send plus a confirm dialog.
   **why it stalls:** it is more to scan, and two things that both send email sit on one screen.
   **harm 2.**
   **simpler default:** keep Announce to the composer and the Sent list, and leave the weekly email on its own tab.

10. **where:** /admin/asks, clicking an ask title.
    **faced:** the console silently becomes "Founder view". The shell, nav and title change, and the admin sees member buttons ("I can help", "Report this ask") next to Pin / Close / Remove.
    **why it stalls:** it is unclear where they are and which buttons are admin actions. They need "Back to console" to return.
    **harm 2.**
    **simpler default:** open the ask inside the console with admin actions only.

11. **where:** /admin/reports (Flagged).
    **faced:** the page is not in the console nav. It is reached from the Home item or from Set up (its breadcrumb reads "Set up", and the Set up nav badge turns to 1). There are 3 actions (Dismiss / Remove this ask / Remove Sam). Even Dismiss opens a confirm dialog that says "Nothing else changes".
    **why it stalls:** moderation is filed under setup, and a harmless action costs an extra step.
    **harm 2.**
    **simpler default:** list flags under Asks & intros, make Dismiss one click with an Undo, and confirm only Remove.

12. **where:** phone console bottom bar.
    **faced:** 5 tabs (Home, Asks, Members, Announce, Set up). Report (the partner report) and the founder-view switch are both in the 9-item avatar menu ("More → Report", "See it as a founder").
    **why it stalls:** the monthly partner report is the PM's main output, and on the phone it can't be found without opening the avatar.
    **harm 2.**
    **simpler default:** swap Set up for Report in the phone bar, since Set up is rarely needed day to day.

13. **where:** phone founder view, /today as admin.
    **faced:** 3 stacked prompts before any content: a live room card, "Add Northwind Founders to your home screen" (3 steps), and "Fill in your card from public profiles?" (Yes / No).
    **why it stalls:** the admin only came to check what founders see, and is asked to make their own Village consent decision first.
    **harm 2.**
    **simpler default:** in founder view, hide the admin's own setup prompts.

14. **where:** /admin/report.
    **faced:** the headline "16 asks and 4 intros made" uses "asks" to mean intro requests, while the same page's "Asks & updates" counts "10 asks posted". The intro log and the report also disagree with each other at the same moment: log Declined 4 / Open 6 versus report Declined 2 + No answer 2 / Still open 7. The log seems to count "no answer" as declined.
    **why it stalls:** before forwarding numbers to partners, the PM has to work out which figure is right.
    **harm 3.**
    **simpler default:** the same words and the same buckets in the log and the report, with "intro requests" spelled out.

## Visibly broken

- **Sign-in links page contradicts the invite page.** /admin/links says "Links whose email failed. Copy one and send it yourself." and lists all 6 invites, including the 4 I had just sent with a "1 invited." / "3 invited." success message. Either every email failed silently, or the page heading is wrong. (Demo mode doesn't send email, but the page still says they failed.)
- **Resend date is stale.** After Resend on 20 Nov, Ruby Haas shows "Sent 18 Nov, ends 4 Dec": the expiry was pushed out but the sent date was not updated.
- **Invite without a name shows the email twice.** "quinn.elev@example.com / quinn.elev@example.com" on Invites and Members.
- **Flagged page wording doesn't match its buttons or content.** The help text says "Delete removes it for everyone" but the button reads "Remove this ask". The header says "Nobody is told who reported" right above "Reported by Maya Ortiz".
- **Date formats are mixed.** The Flagged page uses "Nov 20, 2026"; everywhere else uses "20 Nov". The consent date field shows "05/04/2026" (US format).
- **"Connector said yes 10 63%".** The count and percentage run together in the page text. On screen they render as "10" plus a small "63%", which is fine visually but reads as "1063%" to a screen reader or in copied text.
- **Phone intro log chips run off-screen.** The state chips (All / Open / Introduced / Declined / Withdrawn) overflow to the right; "Withdrawn" is cut off with no visible way to scroll.
- **Unconfirmed: a Home item vanished.** Clicking "Next setup step: send your first partner report" left me on /admin and the item disappeared. Another tester may have completed that step at the same moment, so I can't say for sure it is a bug.
