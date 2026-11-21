# Re-study: the 12 personas again, after round 7 (21 Nov 2026)

**Why:** [SPEC.md](SPEC.md) asked for the same 12 personas to walk the same journeys once round 7's parts were in, and
to compare. The first study: [AUDIT.md](AUDIT.md) and `study/p01…p12`. This one: `study/restudy/p01…p12`.

## The point first
- **Every journey still reaches its goal, and most decisions are gone where round 7 aimed.** The largest drops:
  starting a room (5 choices and 6 taps → 0 and 2), sharing in the library (7 decisions → 0), posting a job (4 → 0),
  People search (up to 13 → 1, no dead ends), answering an intro (4 + finding an email → 2, no lookup), editing a card
  (9 taps → 2), and the admin's first run (9 choices → 6, 8 screens to "nothing left" → 3).
- **What still makes people hesitate is mostly outside round 7's scope:** results that don't match (Find candidates,
  network search ranking, word matches on asks), Alerts and Email as two pages, a partner report with no verdict, and
  two things the owner keeps (the second confirm of an invited founder, Copy making a new invite link).
- **Two new hesitations come from round 7's own defaults:** a one-tap room alerts everyone as "Sam's room" before the
  host can rename it, and the avatar menu grew from 10 to 15 items (Sign out is now pinned in view; the lists scroll).
- **Fixed in this build from the re-study (the top 3, all small):** the admin Home's "intros waiting" item opens the
  intro log's Open intros, not all 19; For you drops an ask you already helped on; People's search finds members by
  their badge ("mentor" found nobody).

## How it was run
The same method as the first study: this branch's production build on a throwaway copy (its own Postgres, a local
LiveKit, demo mode with made-up people, and a second empty copy for the first-time setup). 12 AI-played personas, each
a separate agent with no memory of the others, re-read their first report and walked the same journeys with the same
driver (`study/walk.mjs`), at 390 px unless the persona works on a laptop. They shared the two demo accounts again, so
some counts moved under them (asks left, an intro another persona had answered); those are marked in their reports and
left out here. The empty copy's setup token failed the app's own strength check (it repeated a pattern), so p01 ran the
same build against the same empty database with a random token.

## Before → after, per journey
Choices are decisions a screen asks of the person; steps are screens; taps are clicks or Enter.

| Persona | Journey | Choices | Steps | Taps | Goal reached (before / after) |
|---|---|---|---|---|---|
| p01 new admin | `/setup` + guided start to the first invite link | 9 → 6 | 4 → 2 (8 → 3 to "nothing left") | 5 → 5 (renaming the community later: gone) | yes, name missing / yes |
| p01 | Invite a founder | 3 → 2 | 1 + detour → 1 | 2 → 2 | after a detour / yes |
| p01 | Founder accepts on a phone, welcome | 3 → 2 (both preset) | 3 → 3 | 3 → 3 | yes / yes |
| p02 busy founder | Today, act on each item | 4 + email lookup → 2 | 8 → 6 | 11 → 7 | yes / yes, no lookup |
| p02 | Post an ask | 2 → 2 | 3 → 3 | 2 → 2 | posted, nobody found / same |
| p02 | Read answers, close or renew | 1 → 1 | 3 → 3 | 4 → 3 | read yes; renew no / same |
| p03 intro asker | People search to a fintech investor | up to 13 → 1 | 1 → 1 | ~6 + 2 dead ends → 2 | after dead ends / first try |
| p03 | Ask for an intro (network result / profile) | 1 → 0 (the note is right) | 2 → 2 | 2 → 2, nothing typed | wrong note went out / right note |
| p04 connector | Say yes to an intro | 4 → 2 | 3 → 3 | 4 + failed Send → 3 | yes / yes |
| p04 | Say no to an intro | 2 → 1 | 2 → 2 | 3 → 2 | yes / yes |
| p04 | Help on an ask | 3 → 1 | 3 → 2 (1 from Today) | 4 → 3 (1 from Today) | yes / yes |
| p04 | Skip asks not for me | blocked → 1 | 3 → 1 | — → 1 | no / yes |
| p04 | See and limit intro asks a week | 0 useful → 0 useful | 3 → 3 | 3 → 3 | no / no |
| p05 room starter | Start a room, everyone told | 5 → 0 | 2 → 2 | 6 → 2 | after finding the switch / yes |
| p05 | Schedule for later | 6 → 2 | 1 → 1 | 7 → 4 | after a reload / yes |
| p05 | Turn off room alerts (receiver) | 1 of 7, other page → 1 on Rooms | 2 → 1 | 3 → 1 | yes / yes |
| p06 settings | Find every settings page | 1 → 0 | 2 → 1 | 2 → 1 | partly / yes |
| p06 | Push alerts only for DMs and intros, quiet evenings | ~7 → ~5 | 1 → 1 | 8 → 6 | quiet wasn't quiet / yes |
| p06 | Hide from People, still get intros | 1 → 1 | 3 → 2 | 5 → 4 | contradictory / saved, still unclear |
| p06 | Edit 3 card fields | 0 → 0 | 1 → 1 | 9 → 2 | yes / yes |
| p07 mentor | Set up office hours | 2 + 1 silent → 1 + 1 silent | 3 → 2 | 3 + retry → 3 + retry | partly / partly (not listed as mentor) |
| p07 | Founder finds a mentor, books | 1 → 1 | 2 → 2 | 3 → 3 | yes / yes |
| p07 | Share in the library | 7 → 0 | 3 → 3 | 1 → 1 | yes / yes |
| p08 hiring | Post a job | 4 → 0 | 2 → 2 | 5 + failed submit → 2 | after a detour / first try |
| p08 | Find candidates, hiring request | 3 → 2 | 3 → 3 | 4 → 4 | no real candidate / same, costs no ask now |
| p08 | Ask for a hire | 2 → 1 | 2 → 2 | 2 → 2 | blocked / first try |
| p09 portfolio manager | Act on each Home item | 4 → 2 | 6 → 6 | 11 → 9 | partly / partly |
| p09 | Invite, moderate, report, announce (6 journeys) | 10 → 9 | same | 24 → 23 | yes / yes |
| p09 | Phone: console ↔ founder view | 1 → 0 | 3 → 3 | 3 → 3 | yes / yes |
| p10 second admin | Features off + weekly email on Monday | 5 → 5 | ~6 → 4, dead ends 4 → 0 | ~18 → 14 | yes / yes |
| p10 | What's left to set up | 0 → 0 | 3 → 3 | ~4 → 3 | no / mostly |
| p11 partner | "Is it worth it?" (laptop / phone) | 0 → 0 | 2 → 2 | 1 + typed URL → 1 (phone) | phone blocked / yes; no verdict |
| p11 | Send the report | 0 → 0 | 2 → 2 | 2 → 2 | yes / yes |
| p11 | Help one founder | 1 → 1 | 4 + 3 dead ends → 3 | 3 → 3 | offer yes; intro no / same |
| p12 AI founder | Weekly email into the app | 3 answer sets + 3 radios → 1 + 2 | 3 → 3 | 2–3 → 2–3 | no library in the email / same |
| p12 | Share a prompt | Kind, Role, Who sees it required → 0 | 3–4 → 2 | 6 → 2 | after a blocked submit / first try |
| p12 | Post a win | Feed or Asks → still both | 2 → 2 | Asks 3 → 2 | yes / yes |
| p12 | Avatar menu | 10 items → 15 | 1 → 1 | 1 → 1 | yes / yes |

## What still makes people hesitate (worst first)
Harm is the persona's 1–5. Fixed here = in this branch after the re-study.

| Where | What happens | Harm | Who | Now |
|---|---|---|---|---|
| Asks composer, "Name who you're trying to reach" | Still folded; without it the same ask can find nobody, and it can't be added after posting | 5 | p02 | roadmap |
| Admin Home "intros waiting over 3 days" | Opened the whole intro log (19 rows), late ones not picked out | 4 | p09, p11 | **fixed here** (opens Open intros) |
| Find candidates | Suggests people in the wrong role or city | 4 | p08 | roadmap |
| Intro asks a week | No count and no limit a member sets | 4 | p04 | roadmap (already listed) |
| Connector's yes | The asker's note goes to the person word for word ("Hi Sam, between us…"), not editable, nothing says who reads it | 4 | p04 (NEW) | roadmap |
| Booking link | Saving one doesn't list you under Mentors and experts; only an admin sets the role | 4 | p07 | roadmap |
| Alerts and Email | Two pages, different event names, no quiet hours for email | 4 | p06 | roadmap (already listed) |
| Weekly email | Nothing from the library for the founder who comes in through it | 4 | p12 | roadmap |
| A partner can't make an intro | Only "I can help" with a promise in the note | 4 | p11 | roadmap |
| Duplicate ask | Nothing warns before posting an ask like an answered one | 4 | p02 | roadmap |
| Invited founder's second confirm; Copy makes a new invite link | Every accepted link waits for a yes; Copy kills the link sent | 3 | p01 | the owner's call (kept) |
| One-tap room | Alerts everyone as "Sam's room" before the host renames it | 3 | p05 (NEW) | roadmap |
| Room that won't connect | Jargon error, no End room, no Try again | 3 | p05 | roadmap |
| For you | Kept an ask the member had already answered | 3 | p04 | **fixed here** |
| People search "mentor" | Found nobody although 3 members carry the badge | 3 | p07 (NEW) | **fixed here** |
| Network results | "3 people in reach" are members already listed; offer under the fold on a phone | 3 | p03 | roadmap |
| Avatar menu | 15 items; Library 12th; Feed cut with no sign of more | 3 | p12, p06 | Sign out pinned here; the rest roadmap |
| Hiring request | Doesn't show the job it's for, stays after the job is removed | 3 | p08 (NEW) | roadmap |
| Partner report | No verdict, no change since last quarter, numbers that disagree | 3 | p09, p11 | roadmap (partly listed) |
| Perks | Two switches (Features and the Perks page) that disagree | 3 | p10 | roadmap |
| Weekly email time zone | Free text, UTC default, "pick from the list" with no list | 3 | p10 | roadmap |
| Guided start after launch | Still offers "Invite founders, step 1 of 2"; the consent default isn't the recommended one | 3 | p10, p09 | roadmap |

Smaller ones (harm 1–2, and visible faults such as cut placeholder text, mixed date formats and unnamed buttons) are in
each persona's report under "Broken".
