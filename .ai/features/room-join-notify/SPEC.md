---
id: room-join-notify
status: planned
waits-on: []
size: half a day
touches: ["src/modules/voice/", "src/shell/voice-alerts.ts", "src/shell/chat-available.tsx", "src/app/(app)/rooms/", "src/app/(app)/inbox/", "drizzle/"]
---
# Spec: "Notify others" when you start or join a room

**Approved:** the owner asked for it on 20 Nov 2026 (round 6: "when someone joins a room, they can choose to notify
others"). The choices below come from the round-6 study ([STUDY.md](../simplify-round6/STUDY.md)). It is part 3 of
[simplify-round6](../simplify-round6/SPEC.md).

## Problem
A room only fills if people hear about it. Today the only way to tell anyone is "I'm available to talk". That button
opens a room titled after you and alerts the whole community. Its caption reads "alerts the community", and it sits
on Rooms, at the top of the private Inbox and inside conversations. In the study 7 of 12 personas would never use it,
and 4 found it scary ("one mis-tap from a broadcast"). Starting or joining a real room tells nobody. All 12 personas
said the same: never alert the whole community by default. Those who want to notify (9) want to choose who gets it:
"people I pick" (9), "people who follow me" (5).

## Core user journey
1. Lina taps **Start a room** on Rooms. One sheet: the title, **Now** or **Schedule**, and **Notify others** (off the
   first time, then her last choice) with who: **My followers** · **People I pick** · **Everyone**.
2. She picks "My followers" and starts. Her followers get an alert: "Lina started “Agents in production”. Tap to listen."
3. Omar, who follows Lina, taps the alert. The room opens and joins him as a listener (in the store app, the native
   room screen). A browser that blocks sound shows one "Tap for sound" button. **Goal: from alert to in the room in
   one tap.**
4. Aisha joins a room as a listener. In the room's menu she can tap **Tell people I'm here** and pick up to 10 people.
   Each gets: "Aisha is in “Agents in production”. Tap to listen."
5. Anyone can tap **Follow** on a profile or a room card ("Tell me when Lina starts a room"), and unfollow the same way.

## Scope
In:
- The Notify choice when starting a room now, when scheduling one (it's sent when the room starts), and once per room
  after joining ("Tell people I'm here").
- The audiences:
  - **My followers.** New: a one-way follow, chosen by the person who'll get the alerts.
  - **People I pick**, with the existing people picker, up to 10 when joining and up to 50 when starting.
  - **Everyone**, only when starting a room, and only for the room's host.
- Following and unfollowing, on a profile and a room card.
- "I'm available to talk" retired as a button. "Start a room" with Notify does the same: a broadcast becomes "start
  now, notify Everyone".
- The Inbox and conversation buttons go (`src/shell/chat-available.tsx`).

Out: recurring rooms, share links, attendance counts (round-6 follow-ups); topic follows; email or SMS for room alerts.

## Rules
- **Default off.** Notify is off the first time. After that, the sheet remembers the member's last choice (stored per
  member, see the contract). Joining never notifies on its own.
- **One daily limit, shared with today's.** A member sends at most **3 notifies a day** (`VOICE_LIMITS.broadcastsPerDay`),
  starting or joining, counted in `voice_broadcast`. Each row gains its audience and the number reached. At the
  limit, the switch is disabled and one line says when it resets.
- **Receivers are protected.** A member gets at most one alert per room. From other people's notifies they get at most
  5 a day; past that, the alert is skipped and counted. Nobody already in the room gets one. Both limits read
  `voice_notify_receipt`.
- **notify() decides the rest.** Kind `voice_broadcast`, so mutes apply (`fromUserId` = the sender). Alerts off, the
  kind switched off, quiet times and pause ([notify-schedule](../notify-schedule/SPEC.md)), blocks either way, and
  banned or deleted accounts all skip, as in `src/shell/voice-alerts.ts` today.
- **Invite-only rooms** notify only people on the room's invite list. "Everyone" and "My followers" mean those
  people, among the invited.
- **One tap opens the room.** The alert's address is the room (`/rooms/<id>`). The room page joins on open, and the
  store app hands it to the native room screen. When a browser blocks sound, the page shows one "Tap for sound" button.
- **Words.** Alert title: "<Name> started “<title>”" or "<Name> is in “<title>”". Alert body: "Tap to listen." The
  kind's label in Alerts becomes "People starting or joining rooms" (part 4 owns the label). The mute list reads
  "Muted: their rooms won't alert you".

## Contract other parts use (keep these names)
- `POST /api/voice/create` gains `notify: { audience: "followers" | "picked" | "everyone", memberIds?: string[] } | null`.
- `POST /api/voice/notify` with `{ roomId, memberIds }` is "Tell people I'm here".
- `POST /api/voice/follow` with `{ memberId, isFollowing }`.
- The table `voice_follow (follower_id, followed_id, created_at)`, unique on the pair, cascading on account deletion.
  Your data's export lists who you follow (`src/shell/member-export.ts`).
- The table `voice_notify_receipt (room_id, member_id, sender_id, created_at)`, unique on room and member: one row per
  member a notify reached. It enforces one alert per room and the 5-a-day cap, and rows go after 7 days.
- `voice_broadcast` gains `audience` and `reached`. The member's last choice is `voice_notify_choice (member_id
  primary key, audience)`.
- The Follow button: `FollowButton` in `src/modules/voice/components/`. This part places it on a member's profile (one
  import and one element in `src/app/(app)/people/[memberId]/page.tsx`) and on room cards.
- `src/shell/voice-alerts.ts`: `sendRoomNotify(database, environment, { roomId, senderId, audience, memberIds })` returns
  notify()'s counts plus `capped`.

## Acceptance criteria
1. Start a room with Notify → My followers. A follower with a device gets the alert, and a member who doesn't follow
   gets nothing.
2. Opening the alert's address (from `/me/alerts/log`) opens the room, and the member is in it as a listener, at 390px
   in Chromium and in the store app's web preview. When Chromium blocks sound, one "Tap for sound" tap plays it.
3. Notify off (the default the first time): nobody gets an alert.
4. The 4th notify in a day is refused, with the line saying when it resets. The 6th room alert a member would receive
   in a day is skipped and counted.
5. A member who muted the sender, is in quiet hours or paused, or blocked the sender (either way) gets nothing.
6. "Tell people I'm here" from a joined room alerts only the people picked, and only once per room.
7. In an invite-only room, "Everyone" alerts only the invited.
8. No screen shows "I'm available to talk". Inbox and conversations have no broadcast button.
9. Follow and Unfollow on a profile and a room card work, and following shows in Your data's export.

## Verification contract
Unit tests for the audience resolution (followers, picked, everyone, invite-only, already in the room) and the two
limits; an integration test for `sendRoomNotify` with notify()'s fake push endpoint. A separate agent drives two
signed-in members on the demo build in Chromium. The second follows the first; the first starts a room with Notify.
The second sees the alert in `/me/alerts/log` (round-6 part 0), opens its address and lands in the room. The agent
checks the log of a member who doesn't follow, and of one who muted the sender, for nothing sent or a skip.

## Depends on / check-ins
- notifications · needs: `notify()` and the kind `voice_broadcast` unchanged · owner: notifications (part 4 of round 6).
- notify-schedule · needs: quiet times and pause enforced inside notify(), nothing to call from here · owner: part 4.
- simplify-round6 part 1 · leaves the Inbox page's chat-available import lines to this part.
- notify-schedule (part 4) · places the Alerts bell in the Rooms page header; this part leaves that spot free.
- simplify-round6 part 0 · the alert log (`/me/alerts/log`) used by the verifier.
- simplify-round6 part 2 · leaves a spot on a member's profile for the Follow button.

## Open questions
None. Default off, the 3-a-day limit, and Everyone only for hosts follow from the study.
