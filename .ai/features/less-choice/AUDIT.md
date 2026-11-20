# Audit: where Commonhall makes people choose before they get anything (round 7, 20 Nov 2026)

**Why:** the owner's top value is simplicity. After round 6 (5 tabs, Rooms first, half the words), he asked to find
the remaining places where a member or an admin faces too many choices, steps, settings or decisions before getting
value, and to fix the worst. The fixes: [SPEC.md](SPEC.md). Room starting has its own spec:
[room-start-instant](../room-start-instant/SPEC.md).

## The point first
- **Seven causes, one pattern.** The app keeps asking people to decide things it could decide for them, and some of
  those choices quietly change the outcome. The worst three: an "optional" field that decides whether an ask finds
  anyone; starting a room that tells nobody unless you find two more controls; and a first-run admin whose first
  screen needs an account at another company.
- **Harm 5 (the persona would give up) came up 4 times:** the ask's optional target (founder), Notify off by default
  (room starter), a hiring request silently spending a weekly ask (hiring founder), and the partner report unreachable
  on a phone (partner).
- **About 95 member settings controls on 9 pages,** reached from two menus that each miss some pages; about 130 admin
  Set up controls in 13 places. Intro asks are switched in 6 places, mail settings live in 6.
- **Several choices do nothing:** People's four "Who are you looking for?" chips, "In our network / Everywhere" on
  candidates, the "Your plan" select after launch, "Search their networks" with an empty box.

## How it was run
- The current main (after round 6 and the room hand-off), production build, on a throwaway copy: its own Postgres,
  a local LiveKit, demo mode with made-up people (`@example.com`), and a second empty copy for a first-time setup.
- 12 AI-played personas, each a separate agent with no memory of the others, walked their journeys with real clicks
  through a small driver (`study/walk.mjs`: go, click, type, and a "look" that lists every control on screen with
  counts). Phone (390 px) unless the persona works on a laptop. Each wrote a report with counted findings, harm 1–5
  and a simpler default: `study/p01…p12`.
- The personas shared the two demo accounts, so some counts moved under them (asks left, a setting another persona
  changed); those are marked in their reports and left out here. Claims central to the ranking were checked in the
  code (marked ✓).

| # | Persona | Journeys |
|---|---|---|
| p01 | New fund admin + the first invited founder | `/setup`, guided start, invite, accept, welcome |
| p02 | Busy seed founder, phone | Today, post an ask, answers, Inbox |
| p03 | Series A founder who needs an intro | People search, ask for an intro, status, message |
| p04 | Connector founder | answer intro asks, help on asks, skip asks, limits |
| p05 | Founder starting a room | start, room controls, schedule, receiving controls |
| p06 | Privacy-minded founder | every settings page; two settings tasks |
| p07 | Mentor offering office hours (and a founder booking) | booking link, Book a call, helping |
| p08 | Founder hiring | post a job, find candidates, perks, hiring ask |
| p09 | Portfolio manager, daily | console Home, Members, invites, moderation, Announce |
| p10 | Second admin tidying the setup | every Set up page; feature and email tasks |
| p11 | General partner | "is it worth it", send the report, help a founder |
| p12 | AI-curious founder from the weekly email | the email, Library, a win update, the avatar menu |

## The causes, worst first
Harm is the persona's 1–5 (5 = gives up); "seen by" counts personas who hit it.

### 1. Choices that quietly decide the outcome
The default or the "optional" path gives a worse result, and nothing says so.

| Where | What happens | Harm | Seen by |
|---|---|---|---|
| Asks composer, "Who are you trying to reach? (optional)" | ✓ Matching uses only the target when one is given, otherwise only the ask's words; without the target the same ask found nobody, with it "1 member can help" (`routeAskToHelpers`). | 5 | p02, p08 |
| Start a room, Notify others | ✓ Off the first time, then "My followers"; "Everyone" is 2 taps further. The founder's room told nobody. | 5 | p05 |
| A hiring request from a job | Spends one of the 5 weekly asks without saying so; the next real ask was blocked. | 5 | p08 |
| Ask for an intro (`/search/ask`, `/intros/new`) | The note is prefilled from an earlier, unrelated need ("procurement at a US hospital group… introduce me to Tom at Greenline Climate Fund") and was sent as written. | 4 | p03 |
| Privacy, "Who can see my profile: Nobody" | Hides the profile and drops the member from search, the two places to ask them for an intro, while "Let members ask me for intros" still reads on. | 4 | p06 |
| Alerts, "Let through" on by default | Quiet times aren't quiet for messages and intro asks unless a second switch is found. | 4 | p06 |
| Jobs, "Add another company or board" | A hiring tool (15 options, Greenhouse preselected) and a careers link come first; typing a job by hand means picking the 15th option and pressing "Pull our jobs" with nothing to pull; the apply link is required. | 4 | p08 |

### 2. Decide first, read later
The decision comes before the information that settles it, or as several near-identical options.

| Where | What happens | Harm | Seen by |
|---|---|---|---|
| An intro ask (`/intros/<id>`) | Three radios with none picked sit above the asker's note; Yes then reveals a required email field; two kinds of "no" look the same to the asker. | 4 | p02, p04, p12 |
| Invite (guided start and Members) | A required "how did these members agree to profile fill-in?" question (2 radios + a date) before any email, even with Village off; three send buttons. | 3 | p01, p09 |
| Asks, "Ask / Update" | A mode to pick before typing; hiring posts land in either. | 2–3 | p02, p07, p08, p11 |
| Library, share (`/library/new`) | 7 decisions: Kind (6), Role (9) both required and unmarked, visibility (3), one of four content boxes. | 4 | p07, p12 |
| Start a room | 5 decisions before Start (title, Now/Schedule, Everyone/Invite only, Notify, audience). | 4 | p05 |

### 3. One job, several places
The same setting or action lives in two to six places, so people loop or can't tell which one counts.

| Where | Count | Harm | Seen by |
|---|---|---|---|
| Member settings | 9 pages, two entry points (avatar menu, My profile), each missing some; three ways of saving | 4 | p06, p12 |
| "Members can ask me for intros" | 6 controls on 4 pages (roadmap already has "one switch") | 4 | p06 |
| Alerts vs Email | 8 + 6 switches, different names for the same events, quiet hours only on Alerts | 4 | p06, p12 |
| Admin mail settings | 6 places on 3 pages | 3 | p10 |
| Posting a win | Feed (Ask/Win/Offer) and Asks › Update | 3 | p12 |
| Hiring | 3 routes (job → candidates → request; an ask; an update) with no guidance | 3 | p08 |
| People search | Members search on Enter; networks only by a second button | 4 | p03 |
| Room alerts | Follow, Remind me, two alert kinds, mute | 3 | p05 |
| Perks | Two switches (Features, and the Perks page) | 3 | p10 |

### 4. Setup and chores before value
| Where | What happens | Harm | Seen by |
|---|---|---|---|
| Guided start, step 1 | "Connect Village": an account at another company, 2 keys, 3 outside links, before anything else | 4 | p01 |
| After the guided start | A second checklist with 3 items "Not done yet"; Mail can never be completed from the app | 3–4 | p01, p10 |
| `/setup` | No community name (invitees see "Join Your community"); the setup token blocks a lead who didn't install | 3 | p01 |
| Today (member) | The install card and "Fill in your card from public profiles?" sit above what waits; the heading says "one thing waits" over 5 blocks | 3 | p02, p08, p12 |
| Set up badge | Counts flags and waiting members, not setup steps; the weekly email's schedule isn't on Set up at all | 4 | p10 |
| Each joined founder | A second "Yes, this is them" per founder | 3 | p01 |

### 5. Choices and buttons that do nothing
| Where | What happens | Harm | Seen by |
|---|---|---|---|
| People, "Who are you looking for?" chips | ✓ Change only the box's placeholder (`people-screen.tsx`) | 3 | p03 |
| "Search their networks" with an empty box | Focuses the box, says nothing | 3 | p03 |
| Find candidates, "In our network / Everywhere" | Same results | 2 | p08 |
| Set up, "Your plan" | Only changes the pre-launch checklist's words | 2 | p10 |
| Admin Home's "Needs you" items | Open whole lists with no action for the item (no Nudge, no Help) | 4 | p09, p11 |
| Asks, "Not this week" | Says it won't show again; it stays under For you | 2 | p02 |
| Partner report on a phone | No tab and no Home link after the first send | 5 | p11 |

### 6. Limits that surprise
| Where | What happens | Harm | Seen by |
|---|---|---|---|
| Weekly asks | Hiring requests count (above); closing an unanswered ask doesn't give it back | 5 | p02, p08 |
| Room notifies | "3 notifies a day. Back at 7:05 PM" read at 7:08 PM; a notify that reaches nobody still counts | 4 | p05 |
| Intro asks received | No count and no limit a member can see or set (the 10-a-week cap is admin-only) | 4 | p04 |

### 7. Words that mislead about who sees what
| Where | What happens | Harm | Seen by |
|---|---|---|---|
| "A note for Ada (optional)" under I can help | ✓ Posted as a public line every member sees (`asks/AGENTS.md`: "I can help also leaves a public line") | 4 | p04 |
| Two kinds of "no" on an intro | Both reach the asker as the same kind decline | 2 | p04, p12 |

## Broken things the walk found (not choices, listed for the fix pass)
- The intro note prefilled from an unrelated need (above) was sent that way (p03).
- Sign-in links: Copy makes a new link and kills the one already sent (p01, reported).
- "Connect Village (done)" after Skip; "No profile yet" for members who answered; the admin checklist says "no email sent
  yet" after the founder joined (p01).
- "Pick an answer." stays after an answer is picked (p02); the For you count includes asks already answered (p04).
- `/me` asks to fill in the card from public profiles while saying it was (p04, p06, p12).
- Alerts summary "On" while this device is blocked; the alert log isn't linked and shows raw paths (p06).
- `/me/jobs`: a broken sentence ("Added by hand has no public job feed here…"), a duplicate company card (p08).
- The partner email's breakdown differs from the screen; "1067%" read by screen readers (p09, p11).
- Unlabelled controls: People's filter selects, two Asks composer fields, Library filters, a button on `/me` (p07).
- A live room never connected in the headless browser and showed no failure after 12 s (p02, p05): needs a device.

## What went into the spec, and what didn't
The spec takes the causes with harm 4–5 that a default or a removed step fixes ([SPEC.md](SPEC.md), five parts).
Left out, as roadmap lines: admin nudges and the partner introducing two people (already on the roadmap from round 6),
merging Alerts and Email into one page (large; a council fork), the asks-received limit (a new feature), and the
report's breakdown mismatch (a bug for the fix pass).
