---
id: room-start-instant
status: planned
waits-on: []
size: half a day (3 parts side by side after a small first part)
touches: ["src/modules/voice/", "src/app/api/voice/", "src/platform/notifications/contract.ts", "src/components/alerts/alert-settings-form.tsx", "src/shell/voice-alerts.ts", "src/app/(app)/rooms/", "src/app/(app)/me/alerts/", "src/components/alerts/", "src/app/(app)/people/[memberId]/", "src/shell/demo-rooms.ts", "mobile/src/voice/", "drizzle/"]
---
# Spec: Start a room starts it now and tells everyone (round 7)

**Direction:** the owner, 20 Nov 2026: "Start a room" starts right away and notifies everyone by default, with no
options. People control what they receive ("don't notify me"). Picking specific people is for later. Today's design:
[room-join-notify NOTES](../room-join-notify/NOTES.md). What the room-starter persona met: [less-choice
study p05](../less-choice/study/p05-room-starter.md).

## Depends on / check-ins
- Runs beside [smooth-app](../smooth-app/SPEC.md) and [less-choice](../less-choice/SPEC.md); this spec owns the
  Rooms page, the room page, the Alerts page (`me/alerts/page.tsx`, `alert-settings-form.tsx`) and the profile's
  Follow spot. less-choice Part 3 (member settings) changes no file of the Alerts page.
- The store app's part ships in TestFlight build 4.

## The design in three lines
1. Rooms has one "Start a room" button with an optional "What's it about?" box beside it: one tap starts the room now
   (title "Sam's room" when the box is empty) and alerts everyone in the community.
2. No Notify switch, no audiences, no picking people, no "Tell people I'm here", no Invite only, no Follow.
3. Each member decides what reaches them: one "Room alerts" switch (also on Rooms itself), quiet times, pause, and
   "Don't notify me about Sam's rooms" on a profile.

## Today (before)
Start a room is a sheet with 5 decisions and up to 12 controls: a title (required), Now or Schedule, Everyone or Invite
only (with a people picker), and Notify others (off the first time, then the last choice) with My followers · People
I pick (up to 50) · Everyone. In a room, "Tell people I'm here" picks up to 10 more people (web and app). Follow on
profiles and room cards decides who gets "My followers" alerts. A sender may notify 3 times a day; a receiver gets one
alert per room and at most 5 a day. In the study the founder who wanted people to come started a room that told
nobody (Notify is off the first time).

## What it does (after)
### Starting
- **Rooms page:** at the top, a "What's it about? (optional)" box and a "Start a room" button (on a phone the box sits
  above a full-width button). One tap starts the room now and opens it (in the app, the native room screen). An empty
  box gives the title "<first name>'s room".
- Under the button, a small "Schedule for later" link opens the scheduling form: a title (required, as nobody is in a
  scheduled room yet) and a date and time. A scheduled room's "Start now" alerts everyone the same way. Remind me on
  scheduled rooms stays.
- Every new room is open to every member. Invite-only rooms are no longer made; one still live keeps its rule until
  it ends.
- **Rooms made before the change keep what their host chose.** A scheduled room saved with an audience (followers,
  picked people, or nobody) alerts that audience on Start now, and an invite-only room alerts only its invited
  (`resolveAudience`'s invite narrowing stays for those rooms). Only rooms made after the change alert everyone.

### Who is alerted
- Starting a room (now, or a scheduled room's Start now) alerts **every active member** except the host and anyone
  already in the room, through `notify()` as today: a member with room alerts off, in a quiet time or a pause, who
  muted the host, who blocked or is blocked by the host, or with no device gets nothing.
- The alert: "<Name> started “<title>”", body "Tap to listen.", address `/rooms/<id>` (the current words).
- Joining a room never alerts anyone.

### Floods (the existing rules, without a choice)
- **Receivers:** one alert per room, and at most 5 room alerts a day from others (`voice_notify_receipt`). **Fix
  first:** today the receipts are claimed before `notify()` drops members who are in a quiet time, paused, muted the
  host or switched room alerts off (`sendRoomNotify` in `src/shell/voice-alerts.ts` → `claimNotifyReceipts`), so a
  member in a quiet evening burns their 5 on alerts they never get. With "everyone" this happens on every start: the
  receipts must be claimed only for members `notify()` would actually reach (read their alert state first).
- **A member who tapped Remind me** on a scheduled room gets only the "Starting now" reminder, not the start alert
  too (the reminder claims that room's receipt).
- **Senders:** a member's first 3 room starts in 24 hours alert people (`VOICE_LIMITS.broadcastsPerDay`, counted in
  `voice_broadcast` as today, now from starts only). A 4th start still starts the room, quietly, and the room page
  tells the host once: "People weren't alerted this time: 3 rooms a day alert everyone." No allowance line before
  that.

### Receiving: as few controls as possible
- **One "Room alerts" switch** replaces the Alerts page's two room rows ("Rooms you asked to be reminded of" and
  "People starting or joining rooms"); it turns both kinds on or off together. On by default. A member who had turned
  off only one of the two sees it on, and the first tap turns both off.
- The Alerts page also links its log ("What was sent and skipped"), which no page links today.
- **On Rooms,** the bell becomes that same switch: "Room alerts on" / "Room alerts off", one tap, no page change; a
  quiet link "Quiet times" goes to Alerts.
- **On a member's profile,** where Follow was: "Don't notify me about <first name>'s rooms" (the existing mute of
  `voice_broadcast`, `MUTABLE_KINDS`); the Alerts page's muted list still lists and undoes it.
- Quiet times and pause: unchanged.

### Removed
- Web: the composer's When/Who can come in/Notify controls and both people pickers (`room-composer.tsx`,
  `PeoplePicker`); the live room's Tell people button and panel (`live-room.tsx`); Follow (`follow-button.tsx`,
  `follow-toggle.tsx`) on profiles and room cards; the invite-list controls in a room.
- Server: `notify`, `access` and `inviteeIds` leave the create body (`createRoomBodySchema`); `POST /api/voice/notify`,
  `/api/voice/follow`, `/api/voice/following`, `/api/voice/invite` and `/api/voice/people` (the pickers' search) go; `resolveAudience` shrinks to "everyone minus
  the room" for new rooms (keeping the saved audience and invite narrowing for rooms made before);
  `readNotifyChoice`/`saveNotifyChoice` go; `NOTIFY_AUDIENCES`, `pickedOnJoin`, `pickedOnStart`,
  `inviteesPerRoom` and their words go from `contract.ts`.
- Store app: `RoomScreen`'s Tell people tool and `TellPanel`; `hasNotified` is still read from `voice.open` and
  ignored.
- **Installed app builds (TestFlight 3, the Android test APK) keep working:** they still show Tell people unless the
  page says the member already told people, and their Tell people calls `/api/voice/notify` and `/api/voice/people`,
  which go. So the room page always hands the room over with `hasNotified: true`, which hides Tell people in those
  builds (`RoomScreen.tsx` hides it on that flag).
- Demo: no seeded follows; the seeded rooms stay.

### Data (ask the owner before the migration: it deletes data)
- **Kept:** `voice_broadcast` (the sender count), `voice_notify_receipt` (the receiver caps), `voice_room.access` and
  the invite rows (for invite-only rooms still live), `voice_follow` rows (still in Your data's export until dropped).
- **To drop, with the owner's yes:** `voice_notify_choice` (each member's last sheet choice), `voice_room.notify_audience`
  and `notify_member_ids` (a scheduled room's saved audience) once every room scheduled before the change has started
  or passed (60 days at most), and, later, `voice_follow`. Until the yes, the code
  stops reading and writing them and they stay.

## Parts
- **Part 0, the contract (small, first):** `contract.ts` (bodies, limits, words), the create service signature
  (`createRoom(context, { title?, scheduledFor? })`), the alert rule (everyone minus the room), the one
  `ROOM_ALERT_KINDS` pair for the single switch. Unit tests for the new audience rule.
- **Part 1, server and web screens:** the Rooms page (box, button, Schedule link, the bell switch), the room page
  (Tell people and invites gone, the quiet-start line), profiles (mute instead of Follow), the Alerts page (one Room
  alerts row and the log link), the routes removed, the receipts claimed only for members who will get the alert,
  the demo seed. `voice.test.ts` updated: start alerts everyone (with the fake push server: muted, quiet, paused,
  blocked, off, and in-room members skipped; a member in a quiet time keeps their 5 for later; the 5-a-day receiver
  cap; the 4th start quiet; a room scheduled before the change alerts its saved audience; Remind me gets one alert).
  This part owns `src/components/alerts/alert-settings-form.tsx` and `src/app/(app)/me/alerts/page.tsx`; less-choice
  Part 3 doesn't edit them.
- **Part 2, store app:** Tell people out of `RoomScreen`; `npm test`, `npm run typecheck`, `npx expo-doctor`.
- **Part 3, words and memory:** `room-join-notify/NOTES.md` superseded by this feature's NOTES, the voice AGENTS.md rule
  "Nobody is alerted unless the sender chose to" replaced by "Starting a room alerts everyone; members choose what
  reaches them", the landing page tour step for Start a room (`pnpm tour:build`, commit `site/`).

## Acceptance checks (a separate verifier drives them)
1. Rooms as Sam on a 390 px phone: one tap on "Start a room" with the box empty → the room page, live, titled "Sam's
   room". The sheet, Notify, audience and picker controls exist nowhere (counted from the page's controls).
2. The fake push server (web preview's `/__preview/pushes`) shows one alert per member with a device, none to Sam,
   none to a member with Room alerts off, in quiet times, paused, or who muted Sam.
3. Three more starts by Sam within the day: the 4th room starts, sends nothing, and its page shows the one line.
4. Room alerts on Rooms: one tap turns it off; the Alerts page shows one Room alerts row, off; a new start by Maya
   reaches Sam no more.
5. A profile shows "Don't notify me about Maya's rooms"; tapping it puts Maya in Alerts' muted list.
6. Schedule for later → a title and a time → the card under Coming up; Start now alerts everyone.
7. In the store app's web preview, the native room screen has no Tell people (and the hand-off message carries
   `hasNotified: true`, which is what hides it in installed builds).
8. Sam sets a quiet time covering now; Maya starts a room: Sam gets nothing and holds no receipt for it (read from
   `voice_notify_receipt`). Sam removes the quiet time; Maya's next start reaches him. The 5-a-day cap with quiet
   times is covered by `voice.test.ts` (one browser can't sign in as 6 senders).
   Devices: the verifier registers a made-up Expo token for Sam and Maya through `POST /api/notifications/devices`
   while signed in as each (the web preview's push stand-in receives them); the test covers the other members.
9. `pnpm lint && pnpm typecheck && pnpm test && pnpm build` green; `src/test/architecture` green.

## Forks for the council
1. **The title box.** My pick: an optional box beside the button (one tap when empty, a topic when wanted). The
   stricter option is no box at all and "Sam's room" always, with "Add a topic" inside the room.
2. **Who "everyone" is.** My pick: every active member. A fund may want admins or a cohort only; that is the "pick
   people later" idea and stays out.
3. **The sender limit.** My pick: keep 3 alerting starts a day, quiet after. Simpler still: no sender limit, relying
   on the receivers' 5-a-day cap; that lets one member use up everyone's 5.
4. **Dropping the unused tables and columns** (above): ask the owner; until then they stay.
5. **A member hidden from the directory ("Nobody") who starts a room** alerts everyone with their name. My pick:
   allowed, as starting a room is a public act (the Rooms card shows the host today); the owner confirms, as it is a
   privacy rule.

## Situations the plan was tested on
- **400 members, 10 hosts starting rooms in one evening:** each member gets the first 5 rooms that reach them, then
  nothing more that day (the receiver cap). Hosts are not told how many were reached; that stays as today.
- **A member in a quiet time who follows nobody:** gets nothing during the quiet time and keeps their 5 for later
  (the receipts fix above). Following no longer matters.
- **An invite-only room still live, or scheduled, when the change ships:** it keeps alerting only its invited, and
  a scheduled room its saved audience.
