# p11: general partner (admin account), demo on port 9563

Session `p11-partner`, screenshots `measure/shots/p11-01` to `p11-18`. Other testers were changing the data at the same time, so the counts moved during the run (15 to 17 intros asked).

## Journey summary

| # | Journey | Screens | Taps | Fields typed | Decisions before first value |
|---|---|---|---|---|---|
| 1 | "Is it worth it?" on a laptop | 2 (`/admin`, `/admin/report`) | 1 (Report in the sidebar) | 0 | 0 forced, but no verdict. Home shows 8 things (4 stat tiles and 4 "Needs you" links), and none of them is the answer. The report shows about 101 numbers in 9 blocks plus 6 controls, and nothing compares to last quarter or says good or bad. The partner has to decide alone whether "4 introduced of 15" is good. |
| 2 | Send the report to 2 partners with a note, preview first | 2 (report, `/admin/report/send`) | 2 (Send to partners, Send the report) | 2 (emails, note) | 0. The preview is always shown next to the form and shows the note as you type. Done: "Sent to 2 partners." |
| 3 | Help one founder this week | 4 (`/admin`, `/admin/asks`, ask page, `/today`), plus 3 dead ends (`/admin/intros`, `/people`, a profile) | 3 to get to the offer | 1 (note) | 1: work out that the console asks list has no way to help, and that you must open the ask, which moves you into Founder view. **An offer worked** ("I can help" with a note on Amara's New York seed ask). **Making an intro was blocked**: a partner cannot introduce founder A to person B. The only intro control is "Ask for an intro via X", which is for the partner's own needs. |
| 4 | Journey 1 again on a phone | 2 | 1 (Home), then **the URL had to be typed** | 0 | Blocked by navigation. The phone has no Report tab, and the "Next setup step: send your first partner report" link disappears after the first send, so the report cannot be reached from the phone home. Once open, the headline sentence is on the first screen, and the page is 2965px long (3.3 screens). |

## Findings

1. **`/admin` (Home), whole page.** **Faced:** 4 stat tiles and 4 "Needs you" links, all about chores (asks with no help, invites, setup). None says whether the community is working. **Why it stalls this partner:** they open the app for one question, "is it worth it?", and Home answers "what's broken". They need a second tap and a long report. **Harm:** 3. **Simpler default:** put the report's headline sentence, with the change since last quarter, as the first line of Home.

2. **`/admin/report`, the report body.** **Faced:** about 101 numbers: a 6-number headline, 3 tiles, 3 outcomes, a 7-step funnel, a 6x3 connector table, an 8x5 sector table, a 4x5 cohort table and 4 asks tiles. There is no trend and no comparison. **Why it stalls this partner:** they can't tell in 2 minutes whether 4 out of 15 is good. The sector and cohort tables are analyst detail. **Harm:** 3. **Simpler default:** headline plus "vs last quarter" plus outcomes on top; fold the funnel, connectors, sector and cohort under "Details".

3. **`/admin/report`, the word "asks".** **Faced:** the headline says "15 asks and 4 intros", meaning intro requests, and the tile below says "15 intros asked for". At the bottom, "Asks & updates" says "10 asks posted". So "ask" means two different things with two different numbers. **Why it stalls this partner:** they have to stop and work out which count is real before they forward it. **Harm:** 2. **Simpler default:** say "intro requests" in the headline and keep "asks" for the board only.

4. **`/admin/report` vs the email preview at `/admin/report/send`.** **Faced:** different breakdowns of the same report.
   - The screen shows "By sector" with 8 rows. The email shows "By what the founder needed" with 5 rows, and 4 of them are all zeros (Customer, Hire, Investor, Expert are 0, Other is 15).
   - Top connectors differ: the screen shows Julia Weber and Amara Diallo, the email shows Sam Lee.
   - The email adds "An investor meeting: 0" and "Intros started from asks: 0 (0 made)".

   **Why it stalls this partner:** what they read is not what the other partners get, and the email is padded with zero rows. **Harm:** 2. **Simpler default:** one breakdown in both places, with zero rows left out.

5. **`/admin/report/send`, after "Send the report".** **Faced:** both fields stay filled and the Send button stays live next to "Sent to 2 partners." The message doesn't say who it went to. **Why it stalls this partner:** on a phone between meetings they can't tell whether a second tap sends it again, and can't check the addresses. **Harm:** 2. **Simpler default:** after sending, replace the form with "Sent to dana.partner@…, lee.partner@…", plus a "Back to report" link.

6. **Phone, the console tabs (Home, Asks, Members, Announce, Set up).** **Faced:** 5 tabs and no Report tab. Report was left out on purpose ("Report lights Home" in `src/shell/navigation.ts`), but Home has no report link once the first report has been sent. **Why it stalls this partner:** journey 4 (the main reason a partner opens the app) has no path at all on a phone. **Harm:** 5. **Simpler default:** a permanent "Partner report" line or tile on Home, or swap Announce for Report on the phone.

7. **`/admin/asks` (linked from "3 asks have no help yet").** **Faced:** 30 buttons (Pin, Close and Remove on every row) across 10 rows, and none of them is "Help" or "Suggest someone". **Why it stalls this partner:** they came to help and got a moderation screen. The help form is only on the ask's own page, one more tap away. **Harm:** 3. **Simpler default:** "No help yet" rows open the ask with the "I can help" box in focus, and moderation moves into a row menu.

8. **`/admin/asks`: clicking an ask moves into "Founder view".** **Faced:** the sidebar, the nav and a banner all change ("Founder view… You are Maya Ortiz, an admin" and "Back to console"). **Why it stalls this partner:** it is a context switch they didn't ask for, with two navigations to keep track of. **Harm:** 2. **Simpler default:** open the ask inside the console, or don't show the banner when the admin got there from a console link.

9. **Ask page `/asks/<id>`, the "1 member can help." line.** **Faced:** a count with no names and no link. It stayed "1 member can help." after 2 people had answered. **Why it stalls this partner:** they want to connect the founder with that member and can't see who it is. It reads like a stale reply count. **Harm:** 3. **Simpler default:** name the member and add "Introduce them".

10. **Ask page, the chip "🔍 a founder who raised a seed round in New York".** **Faced:** something that looks like a search button, with a magnifier icon, and does nothing when tapped. **Why it stalls this partner:** it is the one thing that looks like "find someone for this founder", and it is dead. **Harm:** 3. **Simpler default:** make it run that search in People, or remove the magnifier.

11. **Intro by a partner (connector-initiated), across the whole app.** **Faced:**
    - The profile has 0 "Introduce X to…" controls. It only offers Message, "Ask for an intro via Amara", Follow and Block.
    - People has 6 more buttons (4 kinds of person to look for, Filter, Search their networks), and none of them makes an intro.

    **Why it stalls this partner:** "make one intro this week" is the job, and the app only lets founders ask. A partner who knows the right person has no path except a message. **Harm:** 4. **Simpler default:** on an ask or a profile, "Introduce to…" with a member picker and a double opt-in on both sides.

12. **`/admin/intros` (linked from "1 intro waiting over 3 days").** **Faced:** the full log: 17 rows, 6 columns, 5 state tabs and 3 periods. The waiting intro isn't filtered or highlighted, and no row has an action (the only button is CSV). **Why it stalls this partner:** they have to find which row is "waiting over 3 days", and then can't nudge it. In the demo the stuck connector is Julia Weber, a fellow partner. **Harm:** 4. **Simpler default:** the link opens just that intro with a "Nudge [connector]" button.

13. **`/today` as the admin.** **Faced:** "Nothing needs you right now", while console Home at the same moment says 3 asks have no help and 1 intro is waiting. Today shows no founder asks at all. **Why it stalls this partner:** they check "what do founders need" on Today and are told nothing. **Harm:** 3. **Simpler default:** Today shows fund-team members the top "no help yet" asks.

14. **`/admin/intros` "Declined" tab vs the report.** **Faced:** the tab says "Declined 5", which counts declined and no-answer together, while the report says Declined 2 or 3 and No answer 2. **Why it stalls this partner:** they see a different number for the same word on two pages. **Harm:** 1. **Simpler default:** use the same split and the same words as the report.

15. **`/asks` (the board, admin as a member).** **Faced:** before the list, a composer with an Ask/Update choice, 2 fields (one of them unlabelled), Post, "3 of 5 asks left this week", then Open/For you/Yours tabs and a search box. That is 8 controls before the first ask. **Why it stalls this partner:** they came to read, not to post, and the quota line doesn't apply to them. **Harm:** 2. **Simpler default:** for fund-team members, collapse the composer to a single "Post an ask" button and open on "No help yet".

## Visibly broken

- **Phone:** the partner report can't be reached from console Home after the first report has been sent. There is no tab and no link, so you have to type `/admin/report`. (Finding 6.)
- **Ask page:** the magnifier search chip looks like a button and doesn't respond to a tap. (Finding 10.)
- **Ask page:** "1 member can help." is unchanged after 2 people answered.
- **Today vs console:** Today says "Nothing needs you right now" while console Home lists 3 things that need you.
- **Report vs email:** the email's "By what the founder needed" puts every intro in "Other" (all 15 or 16) and every other need shows 0, while the screen shows a real breakdown by sector. Top connectors also differ between the two.
- **`/admin/asks`:** the same title, "An intro to a VP Procurement at a hospital network" by Sam Lee on 20 Nov, appears twice: once Open (0 replies) and once Answered. It may be two posts made by other testers, but the two rows can't be told apart.
- **Phone `/admin/settings` (seen while looking for the report):** 11 links and 1 button have no name, and 3 selects and several fields have empty labels.
- **Text extraction only, the screen is fine:** the funnel's "10" and "67%" are separate elements with no space, so screen readers and copy-paste get "1067%".

Side effect of this run: the walker's click matched "Pin: Has anyone raised…" by mistake and pinned that ask. I unpinned it straight away, and the board now shows only the cement ask as Pinned.
