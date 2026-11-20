# Study: how complex is Commonhall today, and for whom (round 6, part 1)

**Run:** 20 Nov 2026, on main at the round-5 merge (AI library, Rooms, alerts, store app). The plan built on it:
[SPEC.md](SPEC.md).

## The point first
- **Rooms, the thing the owner wants people to join, is the hardest thing to find.** On a phone it isn't one of the 7
  tabs: it shows only as a small link under "That's everything this week." at the end of each page. Today never
  mentions a live room. 11 of the 12 personas raised it unprompted. 9 of 12 put Rooms in their own tab set, 5 of them first.
- **Too many places do the same job.** There are 3 ways to find a person (Search, Directory, a profile's links), 4 places
  to talk (Asks, Updates, Feed, Inbox), intros split from messages, and on Today "Post an ask" opens an intro wizard
  while the real "What do you need?" box is on Asks. The admin has 3 setup screens that repeat each other.
- **Explanation text everywhere.** A member screen has 147 words in the median (main area only, navigation not counted).
  My profile has 529 words and 52 controls, and Your data has 526 words. The personas say they read 10–25% of most screens. The same rule
  ("Declined, expired and withdrawn intro asks come back.") repeats on 4 screens.
- **Screens open on setup and status, not on what's waiting.** Today opens on asks others posted ("You could help with
  these 2"), and your own ask is the 5th of 9 blocks. Admin Home is a finished setup checklist ("Four steps to your
  first partner report").
- **Broadcasts and alerts are scary or too coarse.** "I'm available to talk … alerts the community" sits on Rooms, at
  the top of the private Inbox and inside a conversation. Quiet hours is one window, hidden behind a switch, with no
  "pause". Alerts and Email are two separate pages.

## How it was run
1. **A throwaway copy:** the app built from main, in demo mode (made-up people at example.com, nothing leaves the
   server), on its own Postgres container and a local LiveKit dev server, never the live demo. Rooms was switched on
   (new communities have it off), with one live and one scheduled room. The capture script is committed:
   [study/capture.mjs](study/capture.mjs) and [study/table.mjs](study/table.mjs). Screenshots stay in the git-ignored
   `.ai/tmp/simplify-study/`.
2. **Counting:** for every screen, the words and the controls (links, buttons, fields, switches) inside the page's main
   area, at 390px (phone) and 1280px (desktop). Navigation is listed apart. Lists such as Directory and Asks count their
   demo content too, so compare them on the same demo data.
3. **Personas:** 12 made-up people ([study/personas.md](study/personas.md)): 8 founders from pre-seed to Series B, 2
   fund platform or portfolio managers, 1 partner and 1 mentor. Each role has 3–5 jobs, and each job maps to a journey
   through today's screens.
4. **Walkthroughs:** each persona ran as its own AI agent, with the same brief ([study/persona-brief.md](study/persona-brief.md)).
   It read every screenshot and screen text on its journeys, in character, and answered per screen: what is confusing,
   what is complicated, what it would skip, what it expected, and the fastest path. The full walkthroughs (30,000
   words): [reports/persona-feedback/](reports/persona-feedback/).

**Limits:** the personas are AI-played, so they predict friction; they don't measure real use. They saw still screens,
not motion. Two room findings come partly from the capture, not the app. "0 in the room" happened because the host's
room was created through the API and nobody connected. The empty stage and "0 LISTENING" after Join happened because
the local LiveKit had no media ports open. "Your browser paused the sound. Tap to hear the room" is real on phones
(browsers block sound that starts on its own), but the headless capture made it certain. The causes below still hold
without those findings; check the room screen on a real phone in the build.

## Navigation today
| Where | Items |
|---|---|
| Member phone tab bar (7) | Today, Asks, Feed, Search, Directory, Intros, Inbox |
| Member phone "More" (bottom of every page) | Rooms, Library |
| Member desktop sidebar (12) | Today, Asks & updates, Feed, Search, Directory, Jobs, Intros, Inbox, Rooms, Perks, Library, My profile |
| Reached only from pages | Jobs (from Directory/Today), Perks (Today card), Email, Alerts, Your data, My network (from My profile) |
| Avatar (top right) | My profile (the menu at the foot also holds Dark mode and Sign out) |
| Admin console sidebar (9) | Home, Partner report, Intro log, Members, Invites, Asks & digest, Announcements, Job board, Set up |
| Admin phone tabs (6) | Home, Intros, Asks, Members, Set up, Founder; "More": Announcements |
| Under Set up (admin) | Setup checklist, Guided start, Settings (branding + Advanced), Features, Rooms server, Perks, Calls, Mail log, Audit log, Import, Sign-in links, Reported asks, Village, Weekly email |

Totals: 27 member screens with 5,414 words and 359 controls; 23 admin screens with 4,450 words and 284 controls
(desktop, main area). The median member screen has 147 words; the median admin screen has 187.

## Screen inventory
Words and controls count the main area only. "–" marks a page that only redirects.

| Screen | Role | Words (phone / desktop) | Controls (phone / desktop) | Purpose |
|---|---|---|---|---|
| `/today` | member | 411 / 404 | 30 / 26 | Home: asks you could help with, intros waiting, profile check, your asks, perks, jobs, library, new members |
| `/asks` | member | 386 / 463 | 30 / 26 | Asks & updates board: post an ask, browse asks and updates |
| `/ask` | member | 92 / 150 | 10 / 6 | "Post an ask" from Today: in fact the intro wizard (A customer / A hire / An investor / An expert) |
| `/search` | member | 46 / 39 | 11 / 7 | Search the members' networks (needs your own Village connection) |
| `/directory` | member | 685 / 678 | 33 / 29 | Every member, with filters |
| `/jobs` | member | 157 / 150 | 18 / 14 | Open jobs at portfolio companies |
| `/jobs/yours` | member | – | – | Redirects to My profile |
| `/intros` | member | 80 / 73 | 6 / 2 | Intro asks waiting for you and the ones you sent |
| `/inbox` | member | 77 / 70 | 6 / 2 | Private messages (with "I'm available to talk" on top) |
| `/rooms` | member | 96 / 89 | 9 / 5 | Live voice rooms: live now, coming up, start one, "I'm available" |
| `/perks` | member | 130 / 123 | 4 / 0 | Perks marketplace |
| `/library` | member | 263 / 316 | 32 / 29 | AI library: skills, agents, prompts shared across the portfolio |
| `/library/leaderboard` | member | 135 / 128 | 15 / 11 | Library leaderboard |
| `/library/new` | member | 157 / 150 | 17 / 13 | Share a library item (form) |
| `/me` | member | 529 / 522 | 52 / 48 | My profile: card, privacy, booking link, my network, links to Email, Alerts, Your data |
| `/me/alerts` | member | 154 / 147 | 22 / 18 | Alerts: device, kinds, quiet hours, muted members |
| `/me/data` | member | 526 / 519 | 21 / 17 | Your data: what the app holds, export, delete |
| `/me/email` | member | 173 / 166 | 18 / 14 | Email settings |
| `/me/network` | member | 83 / 76 | 10 / 6 | Connect your own network (Village) |
| `/feed` | member | 138 / 141 | 29 / 29 | Community feed (posts, replies, reactions) |
| `/welcome`, `/start`, `/search/ask` | member | – | – | Redirect to Today or Search |
| `/asks/[id]` | member | 141 / 134 | 13 / 9 | One ask |
| `/intros/[id]` | member | 170 / 163 | 14 / 10 | One intro ask |
| `/inbox/[id]` | member | 105 / 98 | 11 / 7 | One conversation |
| `/people/[id]` | member | 165 / 158 | 10 / 6 | A member's profile |
| `/library/[id]` | member | 153 / 146 | 12 / 8 | One library item |
| `/rooms/[id]` | member | 48 / 41 | 10 / 6 | One room (joins on open) |
| `/intros/new` | member | 162 / 235 | 12 / 8 | Ask for an intro (form) |
| `/messages/new` | member | 42 / 35 | 7 / 3 | Write a message (form) |
| `/admin` | admin | 136 / 127 | 9 / 6 | Console home: the setup checklist |
| `/admin/report` | admin | 520 / 511 | 9 / 6 | Partner report |
| `/admin/intros` | admin | 378 / 353 | 17 / 14 | Intro log (+ two settings cards) |
| `/admin/members` | admin | 253 / 323 | 37 / 34 | Members list |
| `/admin/invites` | admin | 272 / 263 | 14 / 11 | Invites |
| `/admin/asks` | admin | 518 / 509 | 49 / 46 | Asks list, digest schedule and asks allowance |
| `/admin/digest` | admin | 200 / 191 | 6 / 3 | Weekly email preview |
| `/admin/announcements` | admin | 196 / 187 | 16 / 13 | Announcements |
| `/admin/jobs` | admin | 251 / 242 | 20 / 17 | Job board set up |
| `/admin/settings` | admin | 102 / 93 | 32 / 29 | Settings: branding (+ Advanced) |
| `/admin/setup` | admin | 208 / 199 | 14 / 11 | Setup checklist |
| `/admin/start` | admin | 101 / 92 | 17 / 14 | Guided first run (branding again) |
| `/admin/features` | admin | 198 / 189 | 13 / 10 | Switch features on and off |
| `/admin/rooms` | admin | 89 / 80 | 4 / 1 | Rooms server set up (LiveKit) |
| `/admin/perks` | admin | 134 / 125 | 8 / 5 | Perks set up |
| `/admin/calls` | admin | 157 / 148 | 8 / 5 | Calls booked with mentors |
| `/admin/mail` | admin | 94 / 85 | 11 / 8 | Mail sending log |
| `/admin/weekly-email`, `/admin/health` | admin | – | – | Redirect to the weekly email preview and the partner report |
| `/admin/audit` | admin | 28 / 19 | 3 / 0 | Audit log |
| `/admin/import` | admin | 219 / 210 | 10 / 7 | Import members |
| `/admin/links` | admin | 78 / 69 | 5 / 2 | Sign-in links |
| `/admin/reports` | admin | 79 / 70 | 5 / 2 | Reported asks |
| `/admin/village` | admin | 270 / 261 | 34 / 31 | Village connection |
| `/admin/members/[id]` | admin | 113 / 104 | 12 / 9 | One member (admin) |
| `/signin` | signed out | 71 / – | 6 / – | Sign in |
| `/public/board` | signed out | 126 / – | 9 / – | Public job board |

## What the personas said, in numbers
| Persona | Role | The tabs they want, in order | Join a room? | Notify others? | Don't alert me |
|---|---|---|---|---|---|
| Nadia | pre-seed, technical | Home, Rooms, Ask, People, Inbox (+intros) | weekly, listening | yes, to chosen people or followers, never everyone | 9–6 weekdays, weekends; "Pause 2h" |
| Daniel | seed, non-technical | Home, Ask, People, Inbox (+intros), Rooms (maybe) | maybe, in the car | no | 9–6 weekdays, evenings, weekends |
| Mei | Series A CTO | Rooms, Today, People, Messages (+intros), Jobs | yes, at night | only when starting, to chosen people or followers | 9–18, after 23:00, weekends |
| Tomas | Series B CEO | Today, Intros, People, Hiring & perks | almost never | no | push off always; weekly email |
| Aisha | seed, first-time | Today, Rooms, Asks (+intros), Inbox, People | yes | when starting, chosen people only | after 8pm, weekends; "pause 2h" |
| Rafael | pre-seed, skeptic | Rooms, Asks, People, Inbox (+intros), Me | yes, if live on his topic with faces | when starting, chosen people or topic followers | 9–6, after 9pm, weekends |
| Jordan | Series A COO | Today, Asks, People, Perks & jobs, Inbox (+intros) | rarely, scheduled | when scheduling, chosen people | 9–12 focus, after 7pm, weekends |
| Lina | seed, room host | Rooms, Today, Asks, Inbox (+intros), People | yes, hosts weekly | yes: followers or people picked | 9–12 focus, after 10pm |
| Hannah | platform lead | Today (live strip), Rooms, Asks (+feed), People (+intros), Inbox | hosts weekly | yes: host picks everyone, a cohort, or followers | 9–12, after 9pm, weekends |
| Marco | portfolio manager | Rooms, Today, Asks, Intros, Inbox | hosts monthly | when starting, to an audience he picks | after 19:00, weekends, Monday meeting |
| Helen | partner | Needs help, Report, Introduce, People | rarely | no | always, except intro asks to her |
| Omar | mentor | Rooms, Asks ("For you"), Inbox (+intros), People, Me | yes, his main reason | at his scheduled start, chosen people | 9–12, after 7pm, weekends |

- **Rooms** in their tab set: 9 of 12 (first for 5). Not wanted: Tomas, Jordan, Helen (all three would join a
  scheduled room on their topic).
- **Search and Directory merged into one "People":** 12 of 12.
- **Intros folded into Inbox:** 7; into Asks or People: 2; kept as a tab: 2 (Tomas, Marco).
- **A home screen kept** (Today or Home): 9 of 12, each asking for it to show only what's waiting plus a live room.
- **Never used:** Feed (12 of 12; two would fold its updates into Asks), the Library leaderboard (12 of 12), the "I'm
  available to talk" broadcast (7 never, 4 scared by it), Directory filters for cohort and "Updated" (5), the "Is this
  right?" profile check after week one (6).
- **Notify others:** nobody wants alerts sent to the whole community by default (12 of 12). 6 want it only when
  starting or scheduling a room, never for just joining. 3 want it whenever they host, and 3 never. The audience
  they named: people I pick (9), people who follow me (5), a cohort or topic (3).
- **When not to alert:** weekends (10), evenings (10), working hours or focus blocks (8), a quick pause (2). Six want
  direct things to still get through (intro asks and messages to them). They'd look under the avatar ("Settings",
  "Alerts") (9) or a bell on Rooms (3). Today it is under My profile.

## The causes (grouped, worst first)
Each cause lists the evidence, with quotes from the screens.

### 1. Rooms is hidden, and it isn't shown as live (11 of 12)
- The phone tab bar has "Today, Asks, Feed, Search, Directory, Intros, Inbox". Rooms is a footer link after
  "That's everything this week." (Today, every page).
- Today never mentions a live room, and a live room card shows "0 in the room" without the people in it (Rooms).
- The two host buttons share one caption ("I'm available to talk" / "Start a room": "Opens a room with you as host and
  alerts the community… 3 of 3 left today."). A scheduled room has no "Remind me" for others, and you can't schedule
  or repeat from the page you land on (Rooms; Lina, Omar, Marco).
- New communities start with Rooms off, and the admin's only Rooms page is a server form ("TCP 7881 and UDP
  50000–50100") with no list of rooms or attendance (Hannah, Marco).
- Inside a room: "Joining…", "Your browser paused the sound. Tap to hear the room", and three icon buttons with no
  labels (7 of 12; partly the capture, see Limits).

### 2. Several places do one job, so people loop (12 of 12)
- Finding a person: Search ("needs your own Village"), Directory, and a profile that links back to Search (Tomas: "three
  ways to find a person, and they loop").
- Getting help: Today's "Post an ask" opens `/ask`, an intro wizard ("What do you need? A customer / A hire / An
  investor / An expert"). The free-text ask lives on Asks (Nadia, Daniel, Aisha, Rafael, Jordan).
- Answering an ask offers two paths on one screen: "Your answer" and "I can help → Offer help" (Tomas, Daniel).
- Talking: Asks, "Updates", Feed and Inbox, with intros apart from Inbox.
- Admin: Set up, Guided start and Settings show the same branding form ("the same branding form twice", Marco). The
  asks allowance is set on two pages ("The same setting is in Asks & digest"). The weekly email lives under "Asks & digest".
- Alerts and Email are separate pages: "Off means no alerts on any device. Email is set apart, under Email."

### 3. Paragraphs explain what the screen could just do (12 of 12)
- Rules repeated: "Asks you post and intro asks share it. Declined, expired and withdrawn intro asks come back." (4
  screens, 9 personas); "never recorded" on Rooms and again inside the room; "Nobody is introduced without saying yes"
  on 8 member screens and 3 admin screens.
- Long settings pages: My profile is 529 words with 52 controls and separate Save buttons per card; Your data is 526 words; the
  Partner report is 520 words with its verdict halfway down.
- Engineer words on manager and member screens: "LIVEKIT_URL, LIVEKIT_API_KEY…", "An IANA name, like Europe/London",
  "set RESEND_REPLY_DOMAIN", "Last pulled 20 Nov 01:01 UTC · from Ashby".
- What they read: about 15 of 127 words on admin Home, 25 of 189 on Features, 60 of 187 on Announcements, and
  50 of 191 on the weekly email preview (Hannah). Founders read 10–20% of Today.

### 4. Screens lead with setup and status, not with what's waiting (10 of 12)
- Today has 411 words around 3 decisions. It opens on others' asks ("You could help with these 2"), and the intro
  someone is waiting on comes after them. Below sit "Is this right?" (a profile check), perks, jobs, library and new
  members.
- Admin Home is a finished checklist: "Welcome, Maya. Four steps to your first partner report." It also contradicts
  Invites: "2 added, no email sent yet" next to "Sent 18 Nov".
- The partner's view is behind an admin phone tab called "Founder" (Helen).

### 5. Broadcasts and alert settings are scary or too coarse (11 of 12)
- "I'm available to talk … alerts the community" is the first button in the private Inbox and inside a conversation
  ("one mis-tap from a broadcast", Daniel).
- Alerts: quiet hours is one window, its times hidden until the switch is on. Room alerts are all or nothing ("Voice
  rooms opening"). There's no pause. Muting covers only "I'm available" broadcasts. Alerts sit under My profile, and
  the admin console has no link to them.

### 6. Admins and partners see problems but can't act (3 of 4 fund-side)
- "1 can help · 0 answers" and "with connector" never name anyone, and there's no Nudge button (Hannah, Marco).
- Two numbers disagree: "20 hours median time to first help" (Asks) against "24 hours" (Partner report).
- The partner can't introduce two people directly. The only flow uses her own quota ("4 of 5 asks left this week").
This is a missing capability rather than complexity: it's listed in the SPEC as follow-ups, not in round 6's build.
