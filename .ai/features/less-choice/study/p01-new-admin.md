# P01: new admin (Jordan, platform lead, laptop) + invited founder (Alex, phone)

Copy: http://localhost:9565, fresh and empty. Screenshots are in `measure/shots/p1-*.png` (admin) and `p1-a*.png` (Alex).

## Journey summary

**1. Admin setup (/setup, then the guided start)**
- Screens up to the first invite link: 4 (`/setup`, `/admin/start` Village, `?step=card`, `?step=invite`).
- Clicks: 5 (Create admin, Skip for now, Next, Send invites, Finish).
- Fields typed: 7 (setup 4, card 2, invite 1).
- Decisions faced: 9. These were: where to find the setup token; connect Village or skip; add a photo or not; fill the 3 optional details or not; cohort or not; the required consent radio (2 options + a date); which of 3 send buttons; Finish or Skip for now.
- First value: "1 invited", with Alex's sign-in link on screen at guided step 3.
- After Finish there are 4 more screens: a second checklist on `/admin` ("Four steps to launch"), then Set up, Features and Mail. The community name was never asked. I had to find Set up → Branding to change "Your community" (+1 field, +1 click). Mail can't be finished from the UI at all.

**2. Invite Alex**
- 1 screen, 1 field, 1 click (Send invites). The link appears in a small monospace text box, together with "Open in your email" and 2 "Copy all links" buttons.
- Copying the link from Members → Sign-in links (1 more screen, 1 click) makes a new link and kills the old one.

**3. Alex, phone, new session**
- Screens: 3 (`/invite`, `/welcome`, `/welcome/privacy`), then `/people`.
- Taps: 3 (Accept and sign in, Next, Done).
- Fields: 6 shown, 2 typed (name was prefilled; 3 optional details).
- Decisions: 3 shown on privacy, all with defaults (visibility 2 options, intros switch, fill-in switch).
- First value: `/people` with "You're in. These are the people here." It lists 2 names only. Tapping Jordan shows what he works on and can help with.

## Findings

1. **Where:** `/admin/start` step 1 of 3, "Connect Village".
   - **Faced:** 3 outside links that each open a new tab (create a developer account, finish Village's checklist, open the keys page), 2 key fields, Next (greyed out until keys are pasted), Skip for now, Skip the guided start. That is 7 controls, and the first screen after creating the admin needs an account at another company.
   - **Why it hurts Jordan:** Jordan has 20 minutes, has never heard of Village, and can't tell whether the app works without it (it does). Some will leave to sign up for Village and lose the thread.
   - **Harm:** 4
   - **Simpler default:** Leave Village out of the guided start. Offer it later as an optional item ("Add warm-path search").

2. **Where:** `/setup` and the whole guided start: the community name.
   - **Faced:** 0 places to name the community. Alex's first screens say "Join Your community" and "Welcome to Your community".
   - **Why it hurts:** A founder gets an unbranded link titled "Your community" from an unknown domain, and it looks like phishing. Jordan only finds the name in Set up → Branding after the guided start ends.
   - **Harm:** 3
   - **Simpler default:** Add one "Community name" field to `/setup`.

3. **Where:** `/setup`, the "Setup token" field.
   - **Faced:** A secret that "whoever installed this app chose", stored in the server's settings.
   - **Why it hurts:** A platform lead who didn't install the app is blocked until they reach the engineer.
   - **Harm:** 3
   - **Simpler default:** The installer prints a one-time `/setup?token=…` link, and the field fills itself.

4. **Where:** `/admin/start?step=invite`.
   - **Faced:** 1 email box, 1 cohort field, and a **required** consent question ("Profile fill-in: how did these members agree?": 2 radios + a date field). Then 3 send controls before a single email is typed: "Send from your email…", "Copy all links", "Send invites". After sending, 2 more appear: "Open in your email" and a second "Copy all links". That is 5 ways to send, plus Finish / Skip for now / Or upload a CSV.
   - **Why it hurts:** Jordan has to read a legal-sounding consent question for a feature (Village profile fill-in) they just skipped. They also have to work out which of 3 buttons actually invites.
   - **Harm:** 3
   - **Simpler default:** Show one email box and one "Create invite links" button, then a "Copy" per founder. Hide cohort and consent when Village is off, using "ask at sign-in" by default.

5. **Where:** `/admin/start?step=invite`, the "Send invites" button.
   - **Faced:** The button says Send, but mail is off and nothing is sent.
   - **Why it hurts:** Jordan believes Alex got an email and moves on. Only the result line says the links "wait" for Jordan to send them.
   - **Harm:** 2
   - **Simpler default:** When mail is off, label the button "Create links".

6. **Where:** `/admin` right after "Finish" on step 3 of 3.
   - **Faced:** A second checklist, "Four steps to launch" (look, invite, mail and the network, partner report). There is also a Set up badge with a number (5, 4, 5, 4 as I worked) and no list of what that number counts.
   - **Why it hurts:** "Step 3 of 3 → Finish" leads straight to 3 more items marked "Not done yet", so Jordan can't tell when the setup is finished. The badge count changes and can't be traced to anything.
   - **Harm:** 3
   - **Simpler default:** Use one checklist. Drop the badge, or make it link to the exact items it counts.

7. **Where:** `/admin` checklist, "Your fund's look".
   - **Faced:** It stays "Not done yet" after the name is saved, and now says "Members still see your initials. Add your logo →".
   - **Why it hurts:** It turns an optional logo upload into a launch blocker, which needs a file hunt between meetings.
   - **Harm:** 2
   - **Simpler default:** Mark it done once the name is set. The logo is optional.

8. **Where:** `/admin` checklist, "Mail and the network", and `/admin/mail`.
   - **Faced:** "Set up mail" leads to "Mail service: not set … nothing is emailed until the mail service is set **on the server**". It also shows "2 mail checks need you", "Check DNS now" (SPF, DKIM, DMARC, MX), a webhook URL and an Advanced fold. 0 fields there would let Jordan finish it.
   - **Why it hurts:** Jordan can't ever complete this item. The checklist stays red, and the jargon (DNS, webhook) suggests the setup is broken.
   - **Harm:** 4
   - **Simpler default:** Treat copy-the-link as a complete, normal mode. Present mail as "Optional: ask your engineer to add Resend", and keep it off the launch checklist.

9. **Where:** `/admin/members`, "Waiting for your OK (1)", with "Yes, this is them" / "Wrong person?".
   - **Faced:** Every founder who accepts the link Jordan sent needs a second confirmation from Jordan. Until then they show as "Needs a look".
   - **Why it hurts:** That is 1 extra click per founder (40 founders = 40 clicks), it repeats a trust choice already made when sending the link, and the text about "anyone holding the link" is alarming.
   - **Harm:** 3
   - **Simpler default:** Trust a person who accepts a link the admin created. If confirmation must stay, offer "Confirm all".

10. **Where:** `/admin/links` (Sign-in links), the "Copy" button.
    - **Faced:** "Copy makes a new one; the old one stops working."
    - **Why it hurts:** If Jordan has already sent the link from the guided start, then later clicks Copy here to send it again, Alex's link dies. Alex then sees "That link doesn't work any more".
    - **Harm:** 3
    - **Simpler default:** Copy returns the same live link. Make "New link" a separate, explicit action.

11. **Where:** `/admin/start?step=invite`, the "All links, one line per founder" box.
    - **Faced:** The link is shown in small monospace text with lookalike characters (l/I, O/0). I read it off the screen and typed it in; all 18 spellings of the uncertain letters returned "That link doesn't work any more". I could only continue by using Copy on Sign-in links.
    - **Why it hurts:** Anyone who reads the link off the screen (or a screenshot) and types it fails, with no hint why.
    - **Harm:** 2
    - **Simpler default:** One "Copy link" button per founder. Also make the dead-link page say whether the link was mistyped or replaced.

12. **Where:** `/admin/settings` (Set up).
    - **Faced:** 3 separate Save buttons (Save settings, Save, Save), plus asks-per-week (5) and outcome-question days (14) on the main page. Advanced adds 9 more fields and 3 selects, including "Hosted by", Region, data-protection contact, who-can-message, and "Your plan", a select that only "sets the words on the launch checklist". It also adds 11 sub-area links.
    - **Why it hurts:** Jordan can't tell which Save covers what. The numeric settings and the plan select read as decisions Jordan has to make before launch.
    - **Harm:** 2
    - **Simpler default:** Keep only Branding (name + colour) on the page with one Save. Move the numbers to Advanced. Infer the plan instead of asking.

13. **Where:** `/admin/features`.
    - **Faced:** 10 switches (6 on, 4 off). The descriptions are hidden behind 10 "About …" info buttons. Network is on although Village isn't connected.
    - **Why it hurts:** It invites 10 decisions, each needing a click just to understand it. A switch that is on but does nothing makes Jordan doubt the others.
    - **Harm:** 2
    - **Simpler default:** Show a one-line description under each switch. Tie Network to Village being connected. Keep this page off the first-run path.

14. **Where:** `/welcome` (Alex, step 1 of 2).
    - **Faced:** The page says "Two questions", but there are 6 fields: name (prefilled), 2 required questions, and 3 optional details. Both questions are required, with no skip ("Answer both questions; a line each is enough.").
    - **Why it hurts:** On a phone, 6 boxes after a promise of 2 feels like a form. A founder who opened the link between meetings has to write 2 lines before seeing anything.
    - **Harm:** 2
    - **Simpler default:** Show only the 2 questions and keep the 3 details behind "Add more" (or Profile later). Allow skipping.

15. **Where:** `/admin/start?step=card` (Jordan).
    - **Faced:** The same 7-field card as founders get (photo, name, 2 questions, role, company, city), with founder examples ("a claims tool for mid-size insurers; hiring our first sales lead").
    - **Why it hurts:** A platform lead doesn't fit the founder examples and stops to think what to write.
    - **Harm:** 1
    - **Simpler default:** Use examples written for admins, or prefill a default like "Platform team at {fund}".

16. **Where:** `/welcome/privacy` (Alex, step 2 of 2).
    - **Faced:** 3 decisions: visibility (2 radios), "Let members ask me for intros", and "Fill in my profile from public profiles". The fill-in switch appears although the admin never connected Village, so it can't do anything.
    - **Why it hurts:** It is a privacy-sounding choice about a feature that is off. Every default here is already the sensible one.
    - **Harm:** 2
    - **Simpler default:** Hide fill-in when Village is off. Show the defaults in one line ("You're visible to members; intros need your yes. Change in Your data") with one Done.

17. **Where:** `/welcome` and `/welcome/privacy` on a phone.
    - **Faced:** The bottom tab bar (Today, Asks, People, Inbox) is shown during onboarding. That is 4 visible exits (I didn't test whether they work mid-welcome).
    - **Why it hurts:** It invites leaving halfway through, and it takes space next to the Done button.
    - **Harm:** 1
    - **Simpler default:** Hide the tab bar during the welcome steps.

18. **Where:** `/today` (Alex).
    - **Faced:** "Nothing needs you right now" together with "Almost there: Your admin is still setting things up. Network search starts once an admin connects it." There is also a 3-step "Add to home screen" Safari guide.
    - **Why it hurts:** It tells founders the product is unfinished on day one and hands them a 3-step chore.
    - **Harm:** 2
    - **Simpler default:** Don't show admin setup state to members. Show one "Post your first ask" action.

19. **Where:** `/people` (Alex), the chips "A customer", "A hire", "An investor", "An expert", plus Filter.
    - **Faced:** 5 controls above a list of 2 people. A chip only changes the search box's placeholder.
    - **Why it hurts:** The taps look like they do nothing.
    - **Harm:** 1
    - **Simpler default:** Hide the chips and Filter below about 10 members.

20. **Where:** `/people/<jordan>`, "Ask for an intro" (via Jordan).
    - **Faced:** It is offered while the same page says "Jordan hasn't shared a network yet".
    - **Why it hurts:** It is a dead-end choice on the first profile Alex opens.
    - **Harm:** 2
    - **Simpler default:** Hide "Ask for an intro" until the person has a network.

## Visibly broken
- **"Connect Village (done)":** The guided-start step list shows Village as done after I pressed "Skip for now" (Village isn't connected).
- **Stale invite status:** The `/admin` checklist says "1 added, no email sent yet. Send their link →" after Alex had already accepted and joined.
- **Set up badge jumps:** It went 5 → 4 → 5 → 4 during setup with no explanation. It seems to mix setup items with "Needs a look" members.
- **"No profile yet" is wrong:** `/admin/members` shows it in "Role and company" for both Jordan and Alex, though both filled "working on" and "can help with". The profile exists; only role and company are empty.
- **Unexplained fold:** `/admin/members` has a "Free up a LinkedIn profile" fold at the bottom with no context on a fresh copy.
- **Possible dead guided-start link:** The link I read from the guided-start screen gave "That link doesn't work any more". It is unclear whether I misread it or it had been replaced. A fresh link copied from Sign-in links worked.
