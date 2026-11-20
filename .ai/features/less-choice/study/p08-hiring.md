# P08: a founder hiring two engineers and a head of sales, who also wants the fund's credits

Demo at http://localhost:9563, signed in as "member" (Sam Lee, Tallyhealth). Journeys 1 and 2 on a laptop, 3 and 4 on a phone. Screenshots are p8-01 to p8-20 in measure/shots/.
Things I left in the demo (it resets every night): a second "Tallyhealth" company added by hand, the job "Founding backend engineer", a hiring request, and the ask "Looking for a head of sales who has sold to hospitals".

## Journey summary

| # | Journey | Screens | Taps | Fields typed | Decisions before first value | First value |
|---|---|---|---|---|---|---|
| 1 | Post a job (laptop) | 2 (/jobs, then /me/jobs) | 5, plus 1 failed submit | 3 (Title, Location, Apply link). Company was filled in; Careers link left empty | 4: which hiring tool (15 options) · paste a link or not · press a button called "Pull our jobs" with nothing to pull · which of the 2 "Tallyhealth" cards to add to | The job is on /jobs, after 5 taps |
| 2 | Find candidates, then a hiring request (laptop) | 3 (/jobs, /search/candidates, /asks, then the posted ask page) | 4 | 0 (the request was written for me) | 3: "In our network" or "Everywhere" · post a hiring request, ask Marcus for an intro, or reach out to Alex myself · Ask or Update. After posting: 5 helpers × 2 buttons = 10 more options | No real candidate. 2 results, both off-target (a Head of Procurement and another company's CTO). The request posted, but it used up one of my 5 asks for the week |
| 3 | Claim cloud credits (phone) | 2 (Today, /perks), then an outside tab | 2, after scrolling to the bottom of Today | 0 | 1: which of 6 Claim buttons. No terms shown | Not reached in the app. Claim opens example.com in a new tab, with no code and no steps |
| 4 | Ask for a head of sales who sold to hospitals (phone) | 2 (Today, /asks), then the posted ask page | 2 | 1 | 2: Ask or Update · fill "Who are you trying to reach?" (2 more fields) or not | My first try was **blocked**: "You've used this week's 5 asks", because the hiring request from journey 2 took the last one. It posted later, after the shared account's count went back up to 1 (another tester's change). The 5 "can help" matches were for hotels, legal teams and CFOs, not hospitals |

## Findings

1. **Where:** /me/jobs › "Add another company or board" › Hiring tool (select) + Careers link + "Pull our jobs".
   **What they face:** 3 controls and a select of 15 options (12 ATS names, Workday, iCIMS, "Another tool, or none"). Greenhouse is chosen by default. The only way to type a job yourself is hidden: pick the 15th option, leave the link empty, and press "Pull our jobs". Only then does an "Add a job by hand" form appear.
   **Why it stalls this persona:** they are hiring their first engineers, so they have no ATS and no careers page. The form assumes both. A button called "Pull our jobs" reads like it will fail when there is nothing to pull.
   **Harm:** 4.
   **Simpler default:** show one "Add a job" form (title, link) first, with "Already on Greenhouse/Lever/…? Paste the link" as a secondary line.

2. **Where:** /me/jobs › "Add a job by hand" › Apply link (required).
   **What they face:** 3 fields, 2 of them required. Submitting without a link fails with the browser's "Please fill out this field". The field accepts only http(s) links, so an email address will not do.
   **Why it stalls this persona:** a pre-ATS founder has no job page to link to. Their apply link is their inbox.
   **Harm:** 4.
   **Simpler default:** make the link optional, and let "Apply" fall back to a message or intro to the founder inside the app (or accept an email address).

3. **Where:** /me/jobs after the by-hand start.
   **What they face:** two "Tallyhealth" cards, each with its own Hide and Remove (4 buttons), and the second card says "Added by hand has no public job feed here…".
   **Why it stalls this persona:** they now have to work out which Tallyhealth is "theirs" and whether to remove one. The sentence is broken copy (see Broken).
   **Harm:** 3.
   **Simpler default:** add jobs typed by hand to the company's existing card. Never create a second card with the same name.

4. **Where:** /jobs › "Hiring? Add yours". The sidebar (laptop) and bottom bar (phone) have no Jobs or Perks entry.
   **What they face:** 5 nav items (Rooms, Today, Asks, People, Inbox). Jobs and Perks show only as small links at the very bottom of Today under "More for you". Three paths exist (/jobs, /jobs/yours → /me/jobs, /me/jobs), and "Our jobs" has a back link to "My profile".
   **Why it stalls this persona:** the persona's two goals (hire, use perks) are both off the main nav. They have to scroll Today to the bottom, or know the URLs.
   **Harm:** 3.
   **Simpler default:** when the member's company has a job or the module is on, show Jobs in the nav, and put Perks in "More for you" near the top of Today.

5. **Where:** /search/candidates › "In our network" / "Everywhere" toggle.
   **What they face:** a choice between 2 scopes that gave the same 2 results ("2 people in reach" against "2 people everywhere").
   **Why it stalls this persona:** a decision that changes nothing teaches them the tool is not worth fiddling with.
   **Harm:** 2.
   **Simpler default:** one list that searches everywhere and ranks network paths first. Drop the toggle.

6. **Where:** /search/candidates results for "Founding backend engineer in Boston".
   **What they face:** 2 people: Alex Kim (Head of Procurement, "reach out yourself") and Rosa Lindqvist (CTO of Halcyon Health, via Marcus). Neither is a backend engineer candidate. Each has a "Close" chip that looks like a dismiss button but means a close tie.
   **Why it stalls this persona:** they wanted candidates. They get a buyer and someone else's CTO, then have to decide whether an intro to a CTO is worth an ask.
   **Harm:** 4.
   **Simpler default:** match on the role's title and skills. When nothing fits, say "No candidates in reach yet" and make "Post a hiring request" the single button.

7. **Where:** "Post a hiring request" → /asks composer, then the 5-per-week ask counter.
   **What they face:** the request is an ordinary ask. It counts against "N of 5 asks left this week" (it went from 1 left to 0). The next ask, for the head of sales, was then blocked: "You've used this week's 5 asks. The next one comes back 24 Nov."
   **Why it stalls this persona:** hiring for 3 roles is 3 requests, plus any other asks. The cap punishes the founder who uses the hiring feature as intended, and the button never warned that it costs an ask.
   **Harm:** 5. I was stopped mid-journey and could post only because a shared-account change restored 1 ask.
   **Simpler default:** don't count hiring requests made from a job against the weekly ask limit, or show "uses 1 of your N asks" on the button.

8. **Where:** /asks composer: the Ask/Update switch, "Who are you trying to reach? (optional)" (opens "A person or a role" and "Company"), and the Post button.
   **What they face:** 1 required field, a 2-way choice and 2 optional fields. Another founder's hiring post (Priya, "Ledgerline is hiring a VP Sales") is an Update, while mine is an Ask. Nothing says which one hiring belongs in.
   **Why it stalls this persona:** "Am I asking or announcing a job?" is a real fork for a founder who is hiring, and the two give different reach and cost.
   **Harm:** 2.
   **Simpler default:** treat any post that mentions hiring as a hiring request automatically, and keep the Ask/Update switch only for admins or behind "More".

9. **Where:** Jobs against Asks for "a head of sales who has sold to hospitals".
   **What they face:** 3 routes: (a) add a Head of Sales job (finding 1's form, 3 fields and a 15-option tool select), then Find candidates, then a hiring request; (b) post an ask directly (1 field); (c) post an Update like Priya. Nothing on /jobs, /asks or Today says which to use. Find candidates exists only on a job, so the ask route never offers it.
   **Why it stalls this persona:** for the sales hire the ask is 2 taps against about 9 for the job route. But only the job route lists the role on the board and searches the network. The founder has to guess.
   **Harm:** 3.
   **Simpler default:** one "Hiring?" entry that takes a title: it posts the job, runs Find candidates and drafts the request in one go. Asks stay for everything that isn't a role.

10. **Where:** the posted ask page ("5 members can help").
    **What they face:** 5 people × 2 buttons ("Ask X for an intro", "Message") = 10 options, plus "Your answer", Send and "Mark answered". The matches were weak: for hospital sales they were hotels, legal teams, CFOs, field sales and referral programmes. For the engineer request they were London, Netherlands and Berlin hiring, for a Boston job.
    **Why it stalls this persona:** 10 equal-weight options and no clear best one. The founder has to read 5 profiles to find that none fits.
    **Harm:** 3.
    **Simpler default:** show only the 1 to 2 best matches, each with a single "Ask for an intro" button. Hide the rest behind "More people".

11. **Where:** /perks (phone).
    **What they face:** 6 perks, each with one Claim button. The perk's terms ("For your first year, on any plan.") are not shown. On the phone, 2 titles are cut off ("50% off bookkeeping for 6 m…", "20% off a year of support sof…"). Claim opens example.com in a new tab, and the app shows no code, steps or confirmation.
    **Why it stalls this persona:** they cannot tell what they are getting or whether they are eligible before leaving the app, and nothing records that they claimed. Offline, the outside site does not load, so this is where the journey ended.
    **Harm:** 3.
    **Simpler default:** show the one-line terms under each title, and have Claim open an in-app sheet with the code or steps before linking out.

12. **Where:** /today (phone), titled "Sam, one thing waits for you".
    **What they face:** 5 blocks above "More for you": the Post an ask button, a LIVE NOW room (Join), "Add to your home screen" (3 steps), "Fill in your card from public profiles?" (2 buttons) and "Waiting on you" (Read). That is 1 "thing" in the title against 6 buttons.
    **Why it stalls this persona:** the title promises one thing. The page then asks for 5 decisions before Jobs and Perks at the bottom.
    **Harm:** 2.
    **Simpler default:** show the one waiting item first, and fold the home-screen and Village prompts into a single dismissible "Set up" line.

## Visibly broken

- /me/jobs, the card added by hand: "Added by hand has no public job feed here, so jobs here are the ones you add by hand." The label "Added by hand" is dropped into the slot meant for a tool name (our-jobs-section.tsx:22 uses `source.toolLabel`).
- /me/jobs: choosing "Another tool, or none" changes nothing on screen. The Careers link field and the "Pull our jobs" button stay, and the hint still says "add jobs by hand" with no way to do it until you submit an empty link.
- /me/jobs: a by-hand start for the founder's own company creates a second card with the same name ("Tallyhealth" twice).
- /jobs: the job added by hand has no department ("Tallyhealth · Boston · posted 20 Nov"), while pulled jobs show Engineering or Sales. The form has no field for it.
- /jobs: the founder's own jobs show both "Find candidates" and "Apply". Apply on your own job is pointless.
- /search/candidates: the sidebar highlights "People", not Jobs.
- /search/candidates: the "Close" chip next to each path reads as a dismiss button.
- /perks: Claim goes to example.com in a new tab, which does not load offline. Demo perk details are not shown, and titles are cut off on the phone.
- /asks composer (phone): the walker could not click the "Update" switch (timed out twice with both click and check). It may be covered or not an ordinary control. Not confirmed by hand.
- The ask counter on the shared "member" account jumped from 0 to 1 left between visits (concurrent testers). Expected in a shared demo, but it hides the real cost of a hiring request.
