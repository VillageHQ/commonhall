---
id: notify-schedule
status: in-review
waits-on: []
size: half a day
touches: ["src/platform/notifications/", "src/components/alerts/", "src/app/(app)/me/alerts/", "src/app/(app)/rooms/page.tsx (the bell only)", "drizzle/"]
---
# Spec: when the portfolio doesn't alert you (quiet times and pause)

**Approved:** the owner asked for it on 20 Nov 2026 (round 6: "members can set when they do NOT receive portfolio
notifications, e.g. working hours"). The choices below come from the round-6 study
([STUDY.md](../simplify-round6/STUDY.md)). It is part 4 of [simplify-round6](../simplify-round6/SPEC.md).

## Problem
Quiet hours exist (`src/platform/notifications/contract.ts`, page `/me/alerts`), but only as **one** window, with its
times hidden until the switch is on. There is no pause, and they hold back everything, including the intro ask someone
is waiting on. The page sits under My profile, and the admin console has no link to it. In the study, people wanted no
alerts at weekends (10 of 12), in the evening (10), during working hours or focus blocks (8: "9 to 6", "9 to 12"), and
during meetings ("Pause 2h", 2). Six wanted things sent straight to them (intro asks, messages) to still get through.
They'd look under the avatar (9) or a bell on Rooms (3).

## Core user journey
1. Nadia taps her avatar → **Alerts** (or the bell on Rooms, which reads "Alerts on" or "Quiet until 18:00").
2. At the top: **Pause alerts**: 1 hour · Until tomorrow · Resume. She taps "1 hour" before an investor meeting.
3. Under **Quiet times** she taps the **Working hours** preset (Mon–Fri 9:00–18:00) and adds **Weekends**. Each quiet
   time shows its days and hours in one line, and she can edit or remove it. Her time zone shows, taken from her
   phone; she can change it.
4. **Still let through: intro asks and messages to me** is on (the default). Portfolio alerts wait until she's out of
   quiet time; things sent straight to her still arrive. **Goal: 3 taps, and the right alerts stop.**

## Scope
In:
- Up to **3 quiet times**. Each has a from and a to time, or **all day**, and its days (overnight works as today).
  One time zone for the member (the existing `time_zone` column).
- Presets: **Working hours** (Mon–Fri 9:00–18:00), **Evenings** (every day 19:00–08:00), **Weekends** (Sat and Sun,
  all day).
- **Pause**: 1 hour, or until 08:00 tomorrow in the member's time zone, and Resume. Pause holds back every alert.
- **Let through**: one switch, on by default. During quiet times it still delivers **direct** alerts: intro asks to
  you, messages to you, and answers to your asks. **Portfolio** alerts are held back: rooms starting, people starting
  or joining rooms, and new in the library.
- One obvious place: `/me/alerts`, reached from the avatar menu (members and admins), the bell on Rooms, and a row on
  My profile.
- The page itself, at 110 words or fewer:
  - This device.
  - Pause.
  - Quiet times.
  - Let through.
  - What alerts you: two groups, "Sent to me" (intro asks, messages, answers) and "From the portfolio" (rooms; people
    starting or joining rooms; the library).
  - Muted people (folded).
- Alert kinds' labels in plain words: `voice_broadcast` becomes "People starting or joining rooms", and `voice_room`
  becomes "Rooms you asked to be reminded of".

Out: an admin-set default for the community (a round-6 follow-up); a queue that delivers held-back alerts later. A
skipped alert stays skipped, as today: the member sees everything when they open the app. Email is out too: the weekly
email and email settings stay on Email.

## Rules
- notify()'s signature doesn't change. `readSkipReason` adds one reason, `paused`. The existing `quiet_hours` reason
  now covers any matching quiet time. A direct kind with Let through on is never skipped for quiet hours; a pause
  holds back every kind.
- Direct kinds are `intro`, `message` and `answer`. Every other kind is a portfolio kind. A new kind is a portfolio
  kind unless it's added to the direct list.
- All day: a quiet time with `allDay: true` covers its chosen days from 00:00 to 24:00. The rule that start and end
  must differ applies only to a quiet time that isn't all day.
- An alert inside quiet time or a pause is skipped and counted, as quiet hours are counted today.
- Time zone: the existing `time_zone`. The browser's zone fills it on first save while it is still the default
  "UTC". An unknown zone is refused, as today.
- Moving the data over: a new table `notification_quiet_time (id, user_id, from, to, all_day, days, created_at)` holds
  up to 3 rows per member. The preference row gains `paused_until` (a timestamp or null) and `let_direct_through`
  (true by default). The migration copies an existing quiet window whose switch is on into the new table. The
  old `quiet_*` columns stay in place (read by nothing new) and get dropped in a later release, so a revert loses
  nothing.

## Contract other parts use (keep these names)
- `/me/alerts` stays the address. `/me/alerts?from=rooms` returns to Rooms after Save.
- `PUT /api/notifications/preferences` body: `{ isOn, offKinds, quietTimes: [{ from, to, allDay, days }], timeZone,
  letDirectThrough }`.
- `POST /api/notifications/pause` with `{ until: "1h" | "tomorrow" | null }`.
- `readAlertState(database, userId, now)` returns `{ isOn, pausedUntil, quietUntil }`.
- The bell is this part's: `src/components/alerts/alerts-bell.tsx`. This part places it in the Rooms page header (one
  import and one element in `src/app/(app)/rooms/page.tsx`, the only line it touches there). Part 3 leaves that spot free.

## Acceptance criteria
1. A member taps "Working hours" and picks a time zone where it is now a weekday between 9:00 and 18:00. A room
   alert to them is skipped (quiet hours), and an intro ask to them is sent. `/me/alerts/log` shows both.
2. With Let through off, both are skipped in working hours.
3. Three quiet times can be saved; a fourth is refused with one line. "Weekends" (all day) saves and holds back
   alerts all Saturday and Sunday. Overnight times and days behave as today's tests say.
4. Pause 1 hour: every alert is skipped for the hour, and after it they arrive again. Resume ends the pause at once.
   "Until tomorrow" ends at 08:00 local.
5. A member whose single quiet window was on before the migration sees it as their first quiet time, unchanged.
6. The bell on Rooms opens `/me/alerts` and shows "Paused until 14:30", "Quiet until 18:00" or "Alerts on". Once
   part 1 has merged, the avatar menu (member and admin) opens it too.
7. At 390px the page fits: Pause and Quiet times show without scrolling, and the page has 110 words or fewer on the
   demo data.

## Verification contract
Unit tests extend `rules.test.ts`: several windows, all day, presets, pause, Let through, time zones. An integration
test for the migration's copy of one window. A separate agent on the demo build, in Chromium at 390px, sets a preset
and a pause. As a second member, it then sends the first an intro ask and starts a room that alerts. It checks
`/me/alerts/log` (round-6 part 0) for which alerts were sent and which were skipped, with the reasons.

## Depends on / check-ins
- notifications · owns `notify()` and its kinds; this spec changes only its rules and stored choices · owner: this part.
- room-join-notify (part 3) · needs: quiet times and pause enforced inside notify() · the bell on Rooms is placed by this part.
- simplify-round6 part 1 · needs: the avatar menu's "Alerts" linking to `/me/alerts`.
- simplify-round6 part 0 · the alert log (`/me/alerts/log`) used by the verifier.

## Open questions
None. Several windows, presets, pause and Let through (on by default) follow from the study.
