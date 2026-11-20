# P06: privacy-minded founder (CTO), settings audit, phone 390px

Demo http://localhost:9563, signed in as "member" (Sam Lee), 2026-11-20. Screenshots are in `measure/shots/p6-*.png`.
After the run, every setting I changed for tasks 3 and 4 was put back and checked: alerts all on, the Evenings quiet
time removed, the let-through switch on again, and Privacy set back to Everyone.

Counting note: the walker counts each Radix switch twice, because each one also has a hidden checkbox named "on". The
numbers below are real controls, read from the screenshots and the aria-checked state.

## Where settings live (entry points)

- Avatar menu (10 items): My profile, Alerts, Email, Your data | More: Jobs, Perks, Library, Feed | Dark mode (switch), Sign out.
- The rows at the bottom of My profile (/me) (6): Privacy, Booking link, Alerts, My network, Our jobs, How you sign in.
- Each list is missing pages the other has. **Email** and **Your data** are only in the avatar menu. **Privacy**,
  **Booking**, **Network** and **Password** are only on /me. The **alert log** (/me/alerts/log) has no link anywhere.
- In all, 9 settings pages plus the profile card, across 2 entry points.

## Controls per page

| Page | Switches | Choices (radio / preset buttons) | Fields | Selects | Save buttons | Other buttons / links | Total |
|---|---|---|---|---|---|---|---|
| /me (My profile card) | 0 | 0 | 13 editable fields (one opens at a time: field + Save + Cancel); only **Name** is required | 0 | 1 per open field (13 in all) | Hide the city, Hide my past roles, Correct, lookup prompt (Yes, fill it in / No, don't look me up), 6 settings rows | 13 Edit + 5 + 6 rows = **24** |
| /me/alerts | **8** (Let through intro asks and messages, All alerts, Intro asks, Messages, Answers, Rooms you asked to be reminded of, People starting or joining rooms, New in the library) | 6 (Pause: 1 hour, Until tomorrow; Quiet: Working hours, Evenings, Weekends, Custom) | 0 | 2 (Time zone, **419 options**, behind "Change"; Member to mute, 20 options, in the "Muted people" fold) | 0 (each change saves at once) | Change, Mute, plus Edit and Remove for each quiet time | **18** |
| /me/alerts/log | 0 | 0 | 0 | 0 | 0 | back link only (the page has no link to it) | 0 |
| /me/privacy | 1 (Let members ask me for intros) | 5 (Show me in People: Everyone / Nobody; Who can message me: Community default / Anyone / Only people I've been introduced to) | 0 | 0 | 1 (Save privacy) | none | **7** |
| /me/email | **6** (Weekly digest, Announcements, When an ask needs someone I know, When someone messages me, Intro asks and introductions, Intro reminders) | 0 | 0 | 0 | 1 | none | **7** |
| /me/data | 2 (Don't look me up on public profiles, Credit me in reports) | 0 | 0 | 0 | 1 | 2 folds (What the lookup service receives, Your consent record), Privacy link, Export my data, Delete my account | **8** |
| /me/booking | 0 | 2 (Show it to: Everyone / Only people whose intro I accepted) | 1 (Booking link) | 0 | 1 | Remove link | **5** |
| /me/network | 0 | 0 | 1 (LinkedIn profile URL, in a fold) | 0 | 1 (in the fold) | Search your network, Stop sharing, the "Change my LinkedIn profile" fold | **5** |
| /me/jobs | 0 | 0 | 2 (Company, Careers link, in a fold) | 1 (Hiring tool, 15 options) | 1 (Pull our jobs) | Pull now, Hide this company from the board, Remove, The job board, Open x2, the "Add another" fold | **11** |
| /me/password | 0 | 0 | 1 (New password) | 0 | 1 (Add a password) | none | **2** |
| **All pages** | **17** | **13** | **18** | **3** | **8 page Saves + 13 per-field** | | **~95** |

Saving works three ways: Alerts saves on each tap; Privacy, Email, Data, Booking and Network each need a Save button;
the profile card has one Save per field.

## Overlaps (the same idea controlled in more than one place)

| Idea | Places |
|---|---|
| Intro asks | Privacy: "Let members ask me for intros" · Network: "Share with Northwind Founders: Members can ask you for intros" + **Stop sharing** (same wording, separate control) · Alerts: "Intro asks" · Alerts: "Let through intro asks and messages" (in quiet times) · Email: "Intro asks and introductions" + "Intro reminders". That is **6 controls on 4 pages**. |
| Messages | Privacy: "Who can message me" (3 options) · Alerts: "Messages" · Alerts: let-through · Alerts: Muted people · Email: "When someone messages me". That is **5 controls on 3 pages**. |
| Being looked up / filled in from public profiles | /me lookup prompt (Yes / No) · /me "Hide the city" / "Hide my past roles" / "Correct" · Data: "Don't look me up on public profiles". That is **3 places**. |
| Who sees me | Privacy: Show me in People · Booking: Show it to · /me: Hide the city · Jobs: Hide this company from the board · Data: Credit me in reports. That is **5 visibility controls on 5 pages**. |
| LinkedIn URL | /me "Edit linkedin" · Network: "Change my LinkedIn profile". That is **2 places**. |
| Answers / asks | Alerts: "Answers" · Email: "When an ask needs someone I know" |

## Task 3: "Only alerts for direct messages and intro asks, nothing in the evening"

Path: avatar → Alerts → switch off Answers, Rooms you asked to be reminded of, People starting or joining rooms, New in
the library (4) → "+ Evenings" → switch off "Let through intro asks and messages to me".

- **Push alerts: 8 taps, 1 page, about 7 decisions.** The decisions: which 4 of 6 kinds to turn off; whether "All
  alerts" should change; which of 4 quiet presets fits "evening" (19:00–08:00 also covers the night and morning);
  whether the time zone shown, the test machine's zone (taken from the browser), is right for a New York founder (Change opens a
  list of 419 zones); and the let-through switch. **The let-through switch is on by default, so after 7 taps DMs and
  intro asks still arrive in the evening.** The persona only finds this by reading a switch that sits in the
  quiet-times box. Done and kept after a reload (checked by aria-checked).
- **Email (the same intent): +7 taps.** Avatar → Email → switch off Weekly digest, Announcements, When an ask needs
  someone I know, Intro reminders → Save. **"Nothing in the evening" cannot be done for email**: it has no quiet hours,
  and the digest time is given in UTC ("Thursdays at 09:00 UTC").
- **Total: about 15 taps on 2 pages that are not linked to each other.** The task can only be done in part: email has
  no quiet hours. Announcements have no switch under Alerts, so the persona can't tell whether they come as alerts.
- Whether the device can get alerts at all: the box at the top says "Blocked by this browser…", while /me says
  "Alerts **On**".

## Task 4: "Hide me from the directory but still get intros"

Path: avatar → My profile → Privacy → "Nobody" → Save privacy. **5 taps, 1 decision.** It saved ("Privacy settings
saved."), and "Let members ask me for intros" stayed on and could still be changed.

**The outcome contradicts itself, and the page doesn't say so.** In the code, "Nobody" makes the member's profile page
return 404 to other members (`src/app/(app)/people/[memberId]/page.tsx:79`) and drops the member from member search
(`src/modules/network/reads-member-matches.ts:69`, `isListedInDirectory`). Those are the 2 ways a member asks for an
intro to Sam, so nobody can find him to ask. The switch still says he can be asked, and the page gives no hint which
kind of intro still works: being asked to introduce someone through his shared network, or being introduced to someone
himself. **Result: done in 5 taps, but the persona cannot tell whether intros still reach them. In practice they
mostly won't.**

## Findings

| # | Where (path + control) | What they faced (count) | Why it stalls THIS persona | Harm 1-5 | Simpler default (one line) |
|---|---|---|---|---|---|
| 1 | Settings spread over avatar menu + /me rows | 9 pages, 2 entry points, each missing pages the other has (Email and Your data only in the menu; Privacy, Booking, Network and Password only on /me; alert log nowhere) | Someone checking "what can others see / what will ping me" can't find all the controls, so can't be sure they've seen everything | 4 | One "Settings" list with every page, the same in the menu and on /me |
| 2 | Intro asks: /me/privacy switch, /me/network "Stop sharing", /me/alerts "Intro asks" + let-through, /me/email 2 switches | 6 controls on 4 pages; Privacy and Network use the same sentence "Members can ask you for intros" | Can't tell which one actually stops or allows asks, so has to experiment, or worry | 4 | One "Intro asks: on/off" on Privacy; Network and the alert/email pages only point to it |
| 3 | /me/alerts "Let through intro asks and messages to me" | Defaults to on, inside the Quiet times box | After setting Evenings quiet, DMs and intro asks still come in the evening, the opposite of what was asked for; it took 1 extra decision to find | 4 | Quiet means quiet; offer "let through" only as a line after you add a quiet time |
| 4 | Alerts vs Email (/me/alerts, /me/email) | 8 + 6 switches with different names for the same events ("Messages" / "When someone messages me"); quiet hours only for alerts; 2 save models (instant vs Save) | "Don't spam me" means configuring 2 pages that aren't linked, and email can't be kept quiet in the evening | 4 | One "Notify me about" list (DMs, intro asks on; everything else off), with Push and Email as columns |
| 5 | /me/privacy + network sharing + search | "Nobody" plus the intro switch left on | Hiding silently cuts the paths to intro asks, and the switch suggests otherwise | 4 | When Nobody is picked, say in one line what still works ("Members can still ask you for intros through your network") or turn the switch off |
| 6 | /me/privacy "Who can message me" | 3 radios, 2 of which mean the same today ("The community's default, Now: anyone" and "Anyone") | A redundant choice makes them stop and work out the difference | 3 | 2 options: Anyone / Only people I've been introduced to (the default pre-selected) |
| 7 | /me/alerts "What alerts you" | 7 switches plus a master "All alerts" | 7 "on" defaults to undo when they want 2; "All alerts" vs the sub-switches is unclear (does the master win?) | 3 | Default on only for what's sent to me (Intro asks, Messages, Answers); portfolio kinds off |
| 8 | /me/alerts Quiet times | 4 presets + Custom + Change time zone (419-option select) | "Evenings" = 19:00–08:00 every day isn't obvious until picked; a time zone list of 419 options on a phone | 3 | Default quiet 21:00–08:00 in the browser's time zone, already on; one Edit |
| 9 | Public-profile lookup: /me prompt, /me Hide city / past roles / Correct, /me/data "Don't look me up" | 3 places | A privacy-minded user sees the card already filled from public profiles **and** a prompt asking permission to do it | 4 | One choice, shown once before any lookup; afterwards one "Stop looking me up" on Your data |
| 10 | /me/email "The weekly digest Thursdays at 09:00 UTC" | Time in UTC | A New York founder has to convert, while Alerts uses a local time zone | 2 | Show local time |
| 11 | /me/data "Credit me in reports" | On (in this account) | Opt-in credit to the partner report sits under "Your data", not Privacy; another visibility switch on a 5th page | 2 | Move it to Privacy, off by default |
| 12 | LinkedIn URL: /me "Edit linkedin" and /me/network "Change my LinkedIn profile" | 2 editors for one value | Unclear which one is the source of truth for the network | 2 | Edit on /me only; Network shows it read-only |
| 13 | /me card | 13 fields, only Name required, every field behind its own Edit + Save | Editing 3 fields = 9 taps; fine for spot fixes, slow for a first review | 2 | One "Edit card" that opens every field, with one Save |

## Visibly broken things

1. **The alert log (/me/alerts/log) has no link anywhere.** It is reachable only by typing the URL. It also shows
   developer text: the raw kind ("answer ·", "intro ·"), raw paths ("/intros/8fe4996f-…" as plain text), and the line
   "Skipped: this kind off".
2. **/me says "Alerts On" while /me/alerts says "This device: Blocked by this browser."** The summary row hides that no
   push reaches this device.
3. **/me shows the prompt "Fill in your card from public profiles? Yes, fill it in / No, don't look me up"** while the
   same card already shows "Filled in from public profiles · refreshed 31 Oct" and a "from public profiles" chip on
   City. It wasn't there on the first load and appeared on a later one. Other testers share this account, so someone
   may have changed the lookup switch, but the page shows both states at once either way.
4. **/me/jobs and /me/password have no h1.** The walker reads an empty heading; the visible titles "Our jobs" and "How
   you sign in" are not the page heading.
5. /me has one button with no accessible name (the walker reads it as an empty string).
