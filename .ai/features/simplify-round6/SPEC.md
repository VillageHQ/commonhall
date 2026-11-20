---
id: simplify-round6
status: planned
waits-on: []
size: one day (a small first part, then 5 parts side by side)
touches: ["src/shell/", "src/app/(app)/", "src/modules/", "src/platform/notifications/", "src/components/", "tour/", "site/", "drizzle/"]
---
# Spec: a much simpler Commonhall, Rooms first (round 6)

**Approved:** the direction is the owner's (20 Nov 2026, the round-6 goal): only the most important tabs, Rooms as the
primary thing people join, and a drastic cut in text everywhere, on the web portal and the phone app. The choices below
come from the study ([STUDY.md](STUDY.md)) and go to a council pass before the build (round-6 plan, step 2).

## Problem
Commonhall has 12 member menu items (7 phone tabs) and 9 admin ones. The median member screen has 147 words (My profile
529, Your data 526), and the admin console repeats its setup on three screens. Rooms, the thing the owner wants people
to join, isn't a phone tab: it shows as a footer link under "That's everything this week." In the study, 12 AI-played
founders, fund managers, a partner and a mentor walked their journeys. Six causes came out, worst first:
1. Rooms is hidden and doesn't look live.
2. Several places do one job, so people loop (Search and Directory, Asks/Updates/Feed/Inbox, Intros apart from Inbox,
   three admin setup screens).
3. Paragraphs explain what the screen could just do.
4. Screens lead with setup and status, not with what's waiting.
5. Broadcasts and alert settings are scary or too coarse.
6. Admins see problems but can't act. This one is a missing capability, so it becomes follow-ups below.

## Core user journeys (after)
1. **Founder, phone:** the alert or the app opens. A "Live now" strip at the top of Today shows the room with faces
   ("Maya + 3"), and one tap joins (a browser that blocks sound asks for one more tap). Or the Rooms tab, first in the
   bar. **Goal: in a room in 2 taps.**
2. **Founder needs help:** Asks tab → one box "What do you need?" → post. Answers arrive in Inbox. **Goal: an ask in
   under 30 seconds.**
3. **Founder wants an intro:** People tab → one search box → a profile → "Ask for an intro" (one short form). The
   yes/no and the thread live in Inbox. **Goal.**
4. **Founder protects their time:** avatar → Alerts → "Working hours" preset or "Pause 1 hour". **Goal: 3 taps.**
5. **Manager:** console Home shows this week (active founders, asks with no help, intros waiting, room joins) and what
   needs them → Announce (one page: announcements and the weekly email). **Goal.**

## The member tab set (web and phone)
**Rooms · Today · Asks · People · Inbox**: five tabs, the same on the phone tab bar, the desktop sidebar and the
store app (which shows the portal, so its tab bar is this one).
- **Rooms** is first, with a live dot when something is live. **Today** stays the page you land on (9 of 12 personas
  want a home), and its first block is the live strip from Rooms.
- Avatar (top right on the phone, bottom left on desktop) opens one menu: My profile, Alerts, Email, Your data, then
  "More": Jobs, Perks, Library, Feed (each only while it's on), then Dark mode and Sign out. The footer "More" links go.
- Badges stay: Inbox counts unread messages plus intro asks waiting for your yes; Asks counts new offers.

### What each removed tab becomes (everything stays reachable)
| Today | Becomes | Why (study) |
|---|---|---|
| Search + Directory | **People** (`/people`): one search box over members, filters folded behind "Filter". With your own Village connected, a "Search their networks" step searches the people members know (asked for each time, so a name lookup never spends Village searches). `/directory` and `/search` redirect. | 12 of 12 merged them; "three ways to find a person, and they loop" |
| Intros | Inside **Inbox**: "Waiting for your yes" on top, and an "Intros" filter for the ones you asked. Intro pages (`/intros/[id]`, `/intros/new`) stay. `/intros` redirects to the filter. | 7 of 12 folded intros into Inbox |
| Feed | Avatar → More, while an admin keeps it on. Not a tab. | 12 of 12 would never use it |
| Jobs, Perks, Library | Avatar → More, plus one "More for you" row on Today | used rarely, by some (Jordan, Mei) |
| Library leaderboard | A "Top" sort on Library; `/library/leaderboard` redirects | 12 of 12 never |
| My profile | Avatar | |
| "I'm available to talk" (its own button, on Rooms, Inbox and inside a conversation) | Retired as a button. "Start a room" with **Notify others** does the same thing, with a chosen audience ([room-join-notify](../room-join-notify/SPEC.md)). | 7 never, 4 scared by "alerts the community" |
| `/ask` (the intro wizard behind Today's "Post an ask") | "Post an ask" opens the Asks box. The wizard's four choices (A customer, A hire, An investor, An expert) become chips on People ("Who are you looking for?"). | 5 personas hit "Post an ask" and got an intro wizard |

Nothing is removed outright. The only capability with no user in the study is the leaderboard as its own page: it
becomes a sort, not a page.

### Admin console
**Home · Members · Asks & intros · Announce · Report · Set up** (6, from 9). Admin phone tabs: Home, Asks, Members,
Announce, Set up. "See it as a founder" moves to the avatar menu, replacing the "Founder" tab.
| Today | Becomes |
|---|---|
| Home (a setup checklist) | The checklist only until setup is done. After that, **This week**: 4 numbers (active founders, open asks with no help, intros waiting over 3 days, room joins), and up to 5 items that need you, each linking to its page. |
| Intro log | A tab on **Asks & intros**, keeping its address (`/admin/intros`). Its settings cards move to Set up. |
| Invites, Import, Sign-in links, Calls | Tabs of **Members**, each keeping its address |
| Announcements, the weekly email preview, the digest schedule | **Announce** (`/admin/announcements`): one page with the announcements, the weekly email's schedule and its preview |
| Partner report | **Report**, with the one-line verdict first |
| Set up, Guided start, Settings | One **Set up** page (`/admin/settings`): the essentials in view (branding, mail, features), and everything for an engineer under Advanced (Rooms server, Village, Mail log, Audit log, Flagged asks, Perks, Job board, the guided start) |

## The text rule (every screen, member and admin)
1. **A headline, and at most one line under it** (20 words at most). No intro paragraph.
2. **A rule or promise appears once, where it applies,** in 12 words or fewer, or behind a "How this works" link. A
   sentence never repeats on two screens. Shared words come from one constant. Examples: the asks allowance shows once,
   on the form that spends it; "never recorded" shows once, on the room.
3. **Field hints only when the label isn't enough**, 10 words at most.
4. **Every icon-only button has a visible label**, or at least an accessible name and a tooltip (the room's emoji,
   chat and hand buttons have neither today).
5. **No engineer words outside Set up › Advanced**: no setting names, ports, "IANA", or provider names the admin
   didn't pick.
6. **An empty state is one line and one button.**
7. **Budgets:** a member screen has at most 80 words of its own (lists add their items), and an admin screen at most
   120. Measure with [study/capture.mjs](study/capture.mjs) on the demo data. The member median goes from 147 to 80 or fewer.

## Screen-by-screen targets (words in the main area on the demo data, phone width)
| Screen | Before | Target | The cut |
|---|---|---|---|
| Today | 411 | ≤ 150 | Live strip first; then "Waiting on you" (intro yes/no, answers to your asks; 3 at most); then "You could help" (2 at most); one "More for you" row. "Is this right?" only in a member's first two weeks. The email-reply line stays only where reply-by-email is set up, in 10 words or fewer. |
| Rooms | 96 | ≤ 50 | One "Start a room" button (the sheet has Now / Schedule and Notify others). Live cards show faces and "Join". Scheduled cards show "Remind me". "Never recorded" shows once. |
| Room (live) | 48 | ≤ 40 | "You're in · listening", the people on stage with faces, labelled Leave / React / Chat / Raise hand, and one clear "Tap for sound" when the browser blocks it. |
| Asks | 386 | ≤ 250 | One "What do you need?" box at the top. Filters: Open, For you, Yours. Updates fold into Open. |
| One ask | 141 | ≤ 90 | One way to respond ("I can help", with an optional note), not two. |
| People (Directory 685 + Search 46) | 731 | ≤ 400 | One search box, paged at 30; a card has at most 15 words; filters behind "Filter"; no "fresh as of" on each card; "Search their networks" as a separate step. |
| A member's profile | 165 | ≤ 110 | Buttons first (Message, Ask for an intro, Book a call); the rest below. |
| Ask for an intro | 162 | ≤ 70 | Who and a short note. The 5-step timeline sits behind "How intros work". The allowance shows once. |
| Inbox | 77 | ≤ 40 | No broadcast button, no promise paragraph. "Waiting for your yes" sits on top. |
| One intro ask | 170 | ≤ 90 | Yes / No first. Saying yes needs no email typed when the app knows it. |
| My profile | 529 | ≤ 150 | The card and Edit. Privacy, Booking link and My network become rows that open their own short pages. "Filled in from public profiles" lines show only where they apply. |
| Email | 173 | ≤ 80 | |
| Your data | 526 | ≤ 220 | What we hold as a short list; Export; Delete. Dark mode moves to the avatar menu. |
| My network | 83 | ≤ 50 | |
| Jobs / Perks / Library | 157 / 130 / 263 | ≤ 110 / 80 / 200 | Perks gets a claim button per perk. Library's "Job" filter becomes "Role"; the leaderboard becomes the "Top" sort. |
| Share a library item | 157 | ≤ 80 | |
| Admin Home | 136 | ≤ 90 | This week (see above) |
| Partner report | 520 | ≤ 280 | The verdict line and 3 numbers first; all-zero rows hidden |
| Asks & intros | 518 + 378 | ≤ 350 / ≤ 220 | Digest and allowance settings move out; asks with no help first |
| Members (with Invites, Import) | 253 + 272 + 219 | ≤ 220 / 120 / 100 | |
| Announce (with the weekly email) | 196 + 200 | ≤ 140 / ≤ 110 | |
| Set up (Set up + Guided start + Settings) | 208 + 101 + 102 | ≤ 160 | One page, Advanced folded |
| Features | 198 | ≤ 100 | Names only, with a one-line hint on hover or tap; Rooms listed first |
| Rooms server, Village, Job board, Calls, Perks set up | 89 / 270 / 251 / 157 / 134 | ≤ 40 / 130 / 140 / 100 / 80 | Engineer details under Advanced |

Totals: member words 5,414 → ≤ 2,900; admin words 4,450 → ≤ 2,600 (the same screens, merged pages counted once).

## The phone app
The store app shows the portal under a thin native bar, so its tab bar becomes **Rooms · Today · Asks · People ·
Inbox** with no native change. A tapped alert already opens its page in the portal, and a room's page hands the
room to the native room screen (the bridge's `voice.open`), so an alert opens its room in one tap.
A new TestFlight build and Android APK ship with the round's release, not with these parts.

## Build parts
A small **part 0** goes first and merges on its own (about an hour). Then **parts 1–5** run side by side, each in its
own worktree. Each part owns its files. It touches a file another part owns only where its contract line says so.

### Part 0: shared contracts (first, alone)
- **Live-room reads** in `src/modules/voice/reads-live.ts`, exported for `src/shell/`. Parts 1, 2 and 5 read rooms
  only through these:
  - `readLiveRooms(database, viewerId, limit)` returns `[{ id, title, hostName, faces: [{ name, image }], count }]`
    for the rooms the viewer can see.
  - `countLiveRooms(database, viewerId)`.
  - `countRoomJoins(database, since)`.
  Each returns empty or 0 when Rooms is off.
- **Alert log for checking**: `notify()` writes one `notification_log` row per member and alert: kind, title, address,
  sent or skipped, the reason, and the time. It writes only in demo mode and in development, and keeps 7 days. A page
  `/me/alerts/log`, in demo mode and development only, lists your last 20. Verifiers of parts 3 and 4 use it to see
  who got which alert.
- **The redirect pattern:**
  - An unconditional redirect goes in `next.config.mjs` (it runs before `src/proxy.ts`, which answers a switched-off
    module's pages with a 404). Each part adds its own block there, under a comment naming the part.
  - A redirect whose target depends on which modules are on is a tiny page in `src/shell/`, and its path comes out of
    its module's `paths` (for example `/ask`, which today belongs to the intros manifest).

### Parts 1–5
| Part | What | Owns |
|---|---|---|
| **1. Shell and tabs** | The 5 member tabs and 6 admin items (web, phone bar, sidebar), the avatar menu with More, no footer links. **People** (`/people`) is a shell page: the member search, paged at 30, filters behind "Filter", and the four "Who are you looking for?" chips while Intros is on. A **"Search their networks"** step spends Village searches only when the member asks for it, so a name lookup never does. **Inbox** becomes a shell page with messages while Messages is on, intros while Intros is on, and its tab shows while either is. Its badge is unread messages plus intro asks waiting for your yes. Member redirects: `/directory` and `/search` → `/people`, `/search/ask` → `/people`, `/intros` → `/inbox?show=intros`, `/ask` (a shell page) → `/asks?compose=1`, or `/people` when Asks is off. `/search/candidates` (Find candidates, linked from Jobs) keeps its address. Onboarding lands on `/people`, not `/directory`. | `src/shell/navigation*.ts(x)`, `shell-chrome.tsx`, `user-menu.tsx` (keeps exporting `DarkModeRow`), `app-shell.tsx`, `guided-ask.tsx`, `onboarding.ts`, `my-network-sheet.tsx`; `src/app/(app)/people/page.tsx` (new), `directory/`, `search/` (all of it), `inbox/page.tsx`, `intros/page.tsx`, `ask/`; the `navigation` field of every module manifest; the components only those pages render (intros list, members directory); `src/platform/http/routes.ts`; `src/app/parts/`; `src/test/architecture/`; `tour/src/screens.tsx` |
| **2. Member screens** | Text and layout cuts on these screens: Today (with the live strip from `readLiveRooms`), Asks with its box (`?compose=1` focuses it), one ask, the intro form and intro page, a member's profile, My profile and its pages (Privacy, Booking link, My network, Email, Your data, which no longer shows Dark mode), Jobs, Perks, Library. The Library leaderboard becomes the "Top" sort, with a `next.config.mjs` redirect for its old address. | `src/shell/today*.ts(x)`, `next-step*`, `welcome-steps.ts`, `email-preferences-card.tsx`, `your-data*`; `src/app/(app)/today`, `asks/`, `intros/[introId]/**`, `intros/new`, `people/[memberId]`, `me/` (except `me/alerts`), `jobs/`, `perks/`, `library/`; the components only those pages render |
| **3. Rooms** | [room-join-notify](../room-join-notify/SPEC.md), plus these Rooms changes: the Rooms page and room screen cuts (faces, Join, Remind me, labels, "You're in"); "I'm available" retired everywhere, including the Inbox and conversation slots; the demo's Rooms on, with seeded live and scheduled rooms. The installer and `setup:instance` save Rooms as on when they make voice-server keys. Existing installs don't change. | `src/modules/voice/**` (except its manifest's `navigation` and `adminTabs`), `src/app/(app)/rooms/**` (except the bell's line), `src/shell/voice-alerts.ts`, `chat-available.tsx` and its import lines, the conversation slot in `src/modules/messages/components/thread.tsx`, `src/shell/member-export.ts` (follows), the demo seed (every part-3 line; no other part changes it), `install.sh` and `scripts/setup-instance.ts` (the Rooms-on line); the Follow button's one line in `people/[memberId]` |
| **4. Alerts schedule** | [notify-schedule](../notify-schedule/SPEC.md), with the "Muted people" words. | `src/platform/notifications/**` (part 0's log lines excepted), `src/components/alerts/**`, `src/app/(app)/me/alerts/**`, the bell's one line in `src/app/(app)/rooms/page.tsx`, the alert lines of `tour/src/data.ts` |
| **5. Admin console** | Admin Home's "This week": the room-joins number from `countRoomJoins`, hidden while Rooms is off. Asks & intros, Members (with Invites, Import, Sign-in links, Calls), Announce (with the weekly email), one Set up page, the Report cut, and engineer words under Advanced. Features lists Rooms first ("needs a voice server" while none is set up) and says Feed lives under More. **Admin pages keep their addresses:** a merged page is tabs across the existing addresses, so no admin bookmark breaks. | `src/app/(app)/admin/**`, `src/shell/admin-*`, `console-*`, `weekly-email-*`, `setup-checklist.tsx`, `module-settings.ts`, `src/modules/admin/**`, the `adminTabs` field of every module manifest |

**Contracts between them:**
- Part 1's admin menu points at `/admin`, `/admin/members`, `/admin/asks`, `/admin/announcements`, `/admin/report` and
  `/admin/settings`. With every module on, that's 6 items; an item whose module is off is hidden.
- The avatar's Alerts links to `/me/alerts`.
- Part 2 leaves a spot on a member's profile for part 3's Follow button, and part 3 leaves the Rooms header's bell
  spot for part 4.
- Part 2 removes `DarkModeRow`'s use from Your data, and part 1 shows it in the avatar menu.
- Nobody else changes part 0's reads.

**Shared rules for every part:**
- Rebase on main before the pull request.
- Generated files go last: `pnpm db:generate` (parts 3 and 4 both add a migration; the second to merge regenerates
  its own), then `pnpm tour:build` and commit `site/`. The tour's other files belong to whichever part changed the
  screen they show; after a rebase, re-run the build rather than merging generated files by hand.
- Text follows the text rule.
- Word counts come from `study/capture.mjs`, which creates its own two rooms. A part that changes the demo seed
  (part 3) re-measures the baseline of the screens it affects, in its pull request.
- Any file this list doesn't name goes to the lead before anyone changes it.

## Acceptance criteria (each checked in a real browser by a separate verifier)
**Part 0**
1. `readLiveRooms` returns the faces of the people in a live room. Each of the three reads returns empty or 0 with
   Rooms off.
2. In demo mode, after a test alert, `/me/alerts/log` lists it as sent. With demo mode off in production, the page
   is a 404 and nothing is written.

**Part 1**
1. At 390px, a member sees exactly 5 tabs in this order: Rooms, Today, Asks, People, Inbox. A desktop member sees the
   same 5 in the sidebar. With Rooms off, 4 tabs show. With Messages and Intros both off, Inbox goes.
2. The avatar menu holds My profile, Alerts, Email, Your data, More (Jobs, Perks, Library, and Feed while it's on),
   Dark mode and Sign out. No "More" links show at the foot of pages.
3. `/directory`, `/search`, `/search/ask`, `/intros` and `/ask` land on their new homes, with every module on, with
   Intros off, and with Asks off. None is a 404. Every old menu destination is reachable in 3 taps or fewer from Today.
4. People: typing a member's name finds them without spending a Village search. With Village connected, "Search
   their networks" shows the people they know.
5. Inbox shows an intro ask waiting for your yes at the top, and the Intros filter lists the ones you asked.
6. With every module on, an admin sees 6 console items (5 phone tabs). "See it as a founder" sits in the avatar menu.
7. Word targets: People ≤ 400, Inbox ≤ 40 (the table below).

**Part 2**
1. The word counts meet the table for every part-2 screen.
2. Today shows a live room first when one is live, then what's waiting for you. Today has no "Is this right?" card
   for a member who joined over 2 weeks ago.
3. Today's "Post an ask" opens the Asks box, and posting from there works.
4. An ask offers one way to respond. The intro form shows who and a note, and nothing else in view.
5. My profile's Privacy, Booking link and My network each open and save on their own page.

**Part 3**: room-join-notify's acceptance criteria, and:
1. Rooms has one "Start a room" button. A live card shows the faces of the people in the room and "Join"; a scheduled
   card shows "Remind me".
2. In a room, every control has a visible label, and the page says "You're in" once connected.
3. No screen shows "I'm available to talk". Inbox and conversations have no broadcast button.
4. A fresh install made by the installer with a voice server has Rooms on. An existing install keeps its setting.
5. Word targets: Rooms ≤ 50, the live room ≤ 40.

**Part 4**: notify-schedule's acceptance criteria, including the Alerts page at 110 words or fewer.

**Part 5**
1. With setup done, admin Home shows the 4 numbers (3 while Rooms is off) and the items that need the admin. Each
   item opens its page.
2. Asks & intros has both lists, with asks with no help first. The digest and allowance settings aren't on it.
3. Announce sends an announcement and shows the weekly email's schedule and preview on the same page.
4. Set up is one page, with the engineer details folded under Advanced. No branding form repeats anywhere.
5. Every old admin address still opens its page.
6. The admin word counts meet the table.

## Verification contract
Each part: the fastest unit or integration test for new behaviour only (redirects, the nav lists, the quiet-time
rules, the notify audience), and the existing architecture tests. Then a separate agent drives the real app in a
browser at 390px and 1280px on the demo data, reads every screenshot, runs `study/capture.mjs` for the word counts,
and tries to break it. After the round: re-run the persona study (round-6 plan, step 5) and compare with STUDY.md:
fewer confusion points and fewer words per screen.

## Follow-ups (not in round 6; roadmap lines)
- Nudge buttons for admins: "who could help" names on an ask, and a nudge for a stuck connector (Hannah, Marco).
- A partner introduces two people directly, without spending their own asks (Helen).
- Room attendance for admins and hosts; recurring rooms ("every Thursday"); a share link for a room (Lina, Omar, Hannah).
- Usage next to each feature switch ("used by 12 founders this month").
- To check: Asks says "20 hours median time to first help" while the Partner report says "24 hours"; admin Home says
  "2 added, no email sent yet" while Invites shows "Sent 18 Nov". Either a bug or two different windows; a label at the least.
- An admin-set default for quiet times for the whole community.

## Open questions (for the council pass)
1. Land on Rooms instead of Today when a room is live? My pick: no. The live strip on Today covers it, and the landing
   page stays predictable.
2. Feed off by default for new communities? Today it's on wherever no admin chose. My pick: no change in round 6 (it
   leaves the tabs either way). Switching it off by default is the owner's call.
3. Rooms on by default: fresh installs whose installer made a voice server get Rooms on; existing installs keep
   their setting, so nothing switches on silently. My pick: yes.
