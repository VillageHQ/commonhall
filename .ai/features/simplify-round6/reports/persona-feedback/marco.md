# Marco Bellini: portfolio manager, part-time community ops (phone first)

I run the portfolio day job and do community ops in the gaps, on my phone. I looked at every -phone.png first and read
the text files. My test for each screen: can I do the thing in under a minute with my thumb?

## M4 Bring founders in

### admin_invites
- Confusing: There's no Invites tab on my phone. The tabs are Home, Intros, Asks, Members, Set up, Founder, so I got here through "Invite founders" on Home. Then "Profile fill-in: how did these members agree?" is "Required", with a date picker for "Members agreed in our membership terms on". I came to send 2 emails and now I'm answering a legal question.
- Complicated: Four decisions before "Send invites": the emails, the cohort, the consent radio and a date. The email preview ("Hi Ada, Maya Ortiz invited you…") takes up the bottom half of the page.
- Would skip: The consent help text, the whole email preview, and "The email that goes out. Plain text, from your community's name." I'd read about 40 of 272 words.
- Expected: Paste emails, then Send. Consent should default to "Ask each member at sign-in" (the page already calls it "Recommended") so I never have to see it. A "nudge all who haven't signed in" button next to "Waiting to sign in".
- Fastest path: Members > "+ Add members" opens a sheet with just an email box and Send. Everything else is optional and folded.

### admin_import
- Confusing: "Email each person their invite now" is off by default: "Off: they are added as invited, and their invite links wait on Sign-in links for you to send." Why would I import people and then not invite them? And where is "Sign-in links"? It's not a tab.
- Complicated: The consent question again, same radio and date, and this time "Saved for the whole community", while on Invites it was "for each member". Two pages ask the same thing two slightly different ways.
- Would skip: "The columns" table and the "community role" column note. I'd read about 30 of 219 words.
- Expected: One "Invite people" place with two ways in, paste or file. Not a separate page under Set up.
- Fastest path: Fold the import into the Add members sheet as an "or upload a CSV" link, with emailing switched on by default.

### admin_members
- Confusing: "Connected" vs "Joined": I need the footnote to learn that "Connected" means "connected their network through Village". "Free up a LinkedIn profile" at the bottom means nothing to me. On the phone, roles are cut off ("Fund …", "Entr…", "Ex…").
- Complicated: 22 rows with only status and join date. Filter chips run off the right edge ("All 22, Invited 2, Joined 7, Connected 13…").
- Would skip: The legend and the LinkedIn fold. I'd read about 60 of 253 words, mostly names.
- Expected: Who is active and who went quiet: last seen, asks posted, rooms joined. A "nudge" next to anyone quiet for 30 days. "Resend" only shows for invited people.
- Fastest path: Default filter "Needs a nudge", each row with one button.

### admin_members_[id]
- Confusing: "Village: Ready / They're in the group" and "Reset Village link" are plumbing words. There are two red buttons, "Remove member" and "Delete account and data", one after the other. I'd be scared to tap either on a bus.
- Complicated: Five cards for one person: Role, Community role, Village, LinkedIn, Remove/Delete.
- Would skip: Village, LinkedIn and Delete. I'd read about 30 of 113 words.
- Expected: What this founder has done here (asks, intros, rooms) and a "Message" or "Nudge" button. There's none.
- Fastest path: Open the person, see their activity, tap Message. Roles and removal go under "More".

### admin_setup
- Confusing: 11 rows of "plumbing" (its own word). "Settings", "Mail", "Village" and "Rooms" show a "Set up" pill, but Home says "Mail and the network… Done". So is the pill a to-do or just a button? "Sign-in links — not needed" sits next to Home telling me to "Send their links from Sign-in links".
- Complicated: The list mixes three different things: setup I do once (Mail, Village, Rooms server), switches (Features) and moderation (Reports, Audit log).
- Would skip: Almost all of it. I'd read about 30 of 208 words, scanning the pills.
- Expected: Only what's still unfinished, with everything else hidden.
- Fastest path: When everything's done, the Set up tab should go away. The "1" badge on it bugs me and I can't tell what it's for.

### admin_start
- Confusing: "Step 1 of 4: Your look" is the same branding form as Settings, word for word. "Passes 18.9 : 1 on white" and "the path line" mean nothing to me.
- Complicated: A second onboarding next to the Home checklist, which also has four steps ("Four steps to your first partner report"). Two four-step tracks.
- Would skip: All of it. Our look is done. I'd read about 15 of 101 words.
- Expected: Either the guided start or the checklist, not both.
- Fastest path: "Skip the guided start". I'd tap it right away.

### admin_settings
- Confusing: "A Logo URL under Advanced is used first." There are two logo inputs that compete.
- Complicated: Not bad: name, logo, colour, Save. "Advanced" hides "hosting and data, plan, the mail checklist and the version", which is fine.
- Would skip: The contrast ratio line and the Advanced blurb. I'd read about 40 of 102 words.
- Expected: Nothing more. This one is the right size.
- Fastest path: As it is, but it should be the only branding page.

## M1 Get founders to show up

### admin (console home)
- Confusing: It's a setup checklist ("Welcome, Maya. Four steps to your first partner report."), and three of the four steps say "Done". After week one this page tells me nothing. It also says "2 added, no email sent yet" while Invites lists "Sent 18 Nov" for both people. Which is it?
- Complicated: The links send me to Sign-in links, the partner report, Set up and the guided start: four places.
- Would skip: The intro line and the "Everything else… lives under Set up" note. I'd read about 40 of 136 words.
- Expected: "What needs you": stuck asks, intros with "no answer from connector", invites not accepted, a live room right now, and how many founders logged in this week. None of that is here.
- Fastest path: Home shows 3–5 action cards, each with one button (Nudge, Resend, Join).

### admin_rooms
- Confusing: "Address: ws://localhost:17880", "LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET", "TCP 7881 and UDP 50000–50100". This is for whoever runs our server, not for me.
- Complicated: There's nothing I can do here except "Open Rooms".
- Would skip: Everything except "Status… Set up". I'd read 10 of 89 words.
- Expected: Schedule a room, see who joined past rooms, turn Rooms on. Turning it on happens elsewhere, under Features.
- Fastest path: Hide this behind Set up > Advanced. In the console, "Rooms" should mean scheduling and attendance.

### member rooms
- Confusing: Two buttons, "I'm available to talk" and "Start a room", and one explainer under both: "Opens a room with you as host and alerts the community…". Which button does that? "3 of 3 left today" of what? The live room hosted by Maya shows "0 in the room". If the host isn't even in it, why would a founder join? "Start now" on Sam Lee's scheduled room: can I start his room?
- Complicated: Not many controls, but there's no button to schedule a room for later, even though "Coming up" exists.
- Would skip: The intro line. I'd read about 50 of 96 words.
- Expected: Rooms in the phone tab bar. Today the bar is Today, Asks, Feed, Search, Directory, Intros, Inbox, and Rooms is only a small link at the very bottom. Also a "Schedule" button with a time and an audience.
- Fastest path: Rooms is tab 1. A "Live now" card has a big Join. "Start" and "Schedule" are side by side, each with "who to tell".

### rooms_[id] / room-joined
- Confusing: "Your browser paused the sound. Tap to hear the room." I joined, so why is it silent? "ON STAGE" is empty and it says "0 LISTENING". It feels dead.
- Complicated: Fine: "Leave quietly", react, chat, raise hand.
- Would skip: Nothing much. It's 48 words and I'd read them all.
- Expected: Sound on the first tap, the host's face on stage, and an "Invite someone into this room" button.
- Fastest path: Joining starts the sound. Keep the raise-hand button and the leave button.

### admin_features
- Confusing: "Messages" here vs "Inbox" in the tab bar. "Network… Needs a Village account." "Rooms" is off by default for a new community (per the brief). It's the thing I want founders to join, and it's switch 10 of 10.
- Complicated: 10 switches, plus "Always on" cards I can't change.
- Would skip: The descriptions. I'd read about 30 of 198 words, just the names.
- Expected: Fewer switches, and Rooms on by default.
- Fastest path: Set it once at the start and never come back. Keep it under Settings.

### admin_announcements (as part of M1)
- See M2. To get founders into a room, I'd want to send "Room at 5pm today" from the room itself, not write an email here.

## M2 Announce

### admin (console home)
- Confusing: There's no "Announce" button on Home. On the phone, Announcements is a small link at the bottom ("Announcements" above "Sign out").
- Complicated: To get to the main thing I do weekly, I have to scroll to the bottom of any page.
- Would skip: Same as above.
- Expected: A big "Announce" action on Home or in the tab bar.
- Fastest path: An "Announce" tab.

### admin_announcements
- Confusing: "Send to 20 members" when Members says "22 people". Who are the missing 2 (the invited ones?) and does that include me? "Preview as" is a dropdown of all 20 names. The "{first name} {full name} {company} {community}" chips are nice but nerdy.
- Complicated: Subject, message, merge chips, audience, a preview picker, "Send a test to me", then Send. That's OK for a desktop, but long on a phone.
- Would skip: The intro paragraph, the merge-field help, and the "Sent" empty-state text. I'd read about 60 of 196 words.
- Expected: Send it as a phone alert too, not only "One email each, and a pinned post in the feed". Schedule it for later. Audience "people who haven't logged in this month" or "people I choose". Only "Everyone / Founders / Mentors and experts / One cohort" exist.
- Fastest path: Subject, message, audience, Send, with the preview one tap away. It works today; it should just be easier to find.

### admin_digest
- Confusing: The schedule (Day, Hour, "Time zone: An IANA name, like Europe/London") isn't on this preview page. It's on Asks & digest. "Every item answers by link… set RESEND_REPLY_DOMAIN and point Resend's webhook at this app." That's developer text on my screen.
- Complicated: To check what founders get, I pick from a 21-name dropdown one at a time.
- Would skip: The intro paragraph and the RESEND line. I'd read about 40 of 200 words.
- Expected: A box to add my own line at the top of this week's digest ("Room on Thursday at 5"). There isn't one, so the digest and announcements are two separate emails to the same people.
- Fastest path: Weekly email page: preview, my note, the day and time, Send a test. All in one place.

## M3 Asks

### admin (console home)
- Confusing: Nothing about asks on Home at all.
- Expected: "2 asks with nobody helping, 2 intros stuck". That's the whole reason I'd open the app.
- Fastest path: Stuck items on Home, each with Nudge.

### admin_asks
- Confusing: The numbers are good ("6 open asks", "20 hours median time to first help"), but "8 asks posted, 5 with members who can help" and "1 can help" never say WHO can help. The digest settings ("Send the weekly digest", Day, a 24-option Hour list, Time zone, "Asks a member can make a week") sit in the middle of the asks page.
- Complicated: 10 asks, each with Pin / Close / Remove: 30 small buttons. 518 words, 49 controls on the phone. It's the heaviest page I use.
- Would skip: The digest block, the "Pin keeps an open ask…" footnote and the "Names and dates only…" line. I'd read about 150 of 518 words, mostly the ask titles.
- Expected: Sort by "nobody has helped yet", with a "Nudge [name who can help]" button on each ask. Amara's "plant manager… in France" ask says "0 can help · 0 answers" from 15 Nov. I want "Share with someone" for that one.
- Fastest path: An "Asks" tab sorted by most stuck, one Nudge per ask, and Pin/Close under a "…" menu. The digest settings move to the weekly email page.

### admin_reports
- Confusing: Nothing. It's clear and empty ("Nothing to review").
- Complicated: It lives under Set up, so I'd never find it.
- Would skip: The footnote about Dismiss/Delete. I'd read 20 of 79 words.
- Expected: A report should show up on Home when there is one. Otherwise I'd never come here.
- Fastest path: An open report becomes a card on Home. No separate page needed while there are none.

### admin_intros
- Confusing: "with connector", "with target", "no answer from connector". Fine once I worked them out, but jargon. Ravi Menon → Alex Morgan "no answer from connector, answered 11 Nov": so it was answered, or not?
- Complicated: The settings at the bottom ("Asks a week", "The outcome question") repeat Asks & digest, and the page admits it: "The same setting is in Asks & digest."
- Would skip: Both settings cards and the intro line. I'd read about 120 of 378 words.
- Expected: A "Nudge connector" button on intros stuck "with connector" for more than 3 days (Marcus Webb → Rachel Kim via Sam Lee, 18 Nov). Without it I'd have to go text Sam on WhatsApp.
- Fastest path: Stuck intros on Home with Nudge, and the full log one tap away. Settings live in one place only.

## Closing answers

### Tabs I want
Member tabs (what founders see), in order:
1. **Rooms**: what's live and coming up, Start/Schedule.
2. **Today**: asks I could help with, intros waiting for my yes.
3. **Asks**: post and browse. Feed's updates fold in here.
4. **Intros**
5. **Inbox**

Everything else (Directory, Search, Jobs, Perks, Library, My profile, Alerts) goes behind the avatar or a "More" sheet. Directory and Search merge into one "People" search.

Admin console items I need (phone tabs):
1. **Home**: "what needs you": stuck asks, stuck intros, unaccepted invites, live room, a weekly logins number. Each has a Nudge, Resend or Join button.
2. **Members**: Add members (paste or CSV in one sheet), filter "needs a nudge", activity per person.
3. **Announce**: announcement plus the weekly email (preview, my note, schedule) on one page.
4. **Asks & intros**: one list of what's stuck, with Nudge.
5. **Settings**: branding, Features, Mail, Village, Rooms server, Reports, Audit log, all under it. The partner report goes in Settings or behind a Home card.
Keep "Founder" (see as a member) as the avatar menu, not a tab.

### What I would never use
- admin_rooms (LiveKit address, ports), admin_village, Audit log, Sign-in links.
- The guided start (admin_start), since it duplicates Settings.
- Library and the Library leaderboard. Perks set up, probably.
- The 24-hour digest picker and "Time zone (IANA)". I'd set it once, if ever.
- "Free up a LinkedIn profile", "Reset Village link".

### Rooms
- Join? Yes. I'd host a monthly "office hours" and drop into founder-hosted ones for 10 minutes.
- What would make me: a phone alert when a room I care about opens, one-tap Join with sound working (not "Your browser paused the sound"), and seeing who's in it (not "0 in the room").
- Notify others: yes, when I START or SCHEDULE a room, and I pick the audience: all founders, one cohort, or chosen people. Not when I just join someone else's room, which is noise. A founder starting one should notify people who follow them or people they choose, not "the community" by default.

### Alerts: when not to alert me
- Weekday evenings after 19:00, weekends, and my Monday partner meeting (09:00–11:00). Exceptions: a direct message or an intro waiting for my yes can come through until 21:00.
- Where I'd look: avatar > Alerts. It exists under My profile ("Quiet hours… Nothing alerts you in these hours"), but only on the member side. The admin console has no link to it. I'd also want weekends as a separate switch, not only one set of hours.

### Top 5 problems (worst first)
1. **admin_asks / admin_intros**: I can see what's stuck but can't act. "1 can help" and "no answer from connector" never come with a name to nudge or a Nudge button.
2. **admin (console home)**: it's a finished setup checklist, not "what needs you". "Welcome, Maya. Four steps to your first partner report." Three steps say "Done", and it contradicts Invites ("2 added, no email sent yet" vs "Sent 18 Nov").
3. **member rooms / tab bar**: Rooms isn't a tab (only a footer link). The live room shows "0 in the room", and when you join it says "Your browser paused the sound". Plus there's no Schedule button, and Rooms is off by default.
4. **admin_invites / admin_import**: a "Required" legal consent radio with a date picker blocks a 2-person invite, and import doesn't email by default ("Off: they are added as invited, and their invite links wait on Sign-in links").
5. **admin_setup / admin_start / admin_settings**: three overlapping setup places (11 "plumbing" rows, a second "Step 1 of 4", the same branding form twice), with "Set up" pills that disagree with Home's "Done".
