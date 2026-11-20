# How "Start a room" works now (round 7)

Built 20 Nov 2026 from [SPEC](SPEC.md) and its council decisions ([CHARTER](CHARTER.md)). It replaces "Notify
others", "Tell people I'm here" and Follow ([room-join-notify NOTES](../room-join-notify/NOTES.md), superseded).
Module `voice`; the map is `src/modules/voice/AGENTS.md`.

## Starting a room
- **Rooms** (`room-start.tsx`): one "Start a room" button (full width on a phone), "Starts now and alerts everyone."
  and a quiet "Schedule for later" link under it. One tap posts `POST /api/voice/create` with `{}`: the room is live,
  open to every member, and titled "<first name>'s room" (`toAutoRoomTitle`). The page opens the room (the store
  app's native room screen in the app). A second tap within 10 seconds finds the same room (same title, not ended).
- **Rename** (`rename-room.tsx`, `POST /api/voice/rename`): the host only, live or coming up, under the room's title.
  Others see the new title on their next refresh; the store app's room screen keeps the title it opened with.
- **Schedule for later**: a title (required: 422 `voice_needs_title` without one) and a time. The card shows under
  Coming up at once (the list's query is refreshed). Remind me stays; "Start now" alerts everyone.
- The create body is `{ title?, scheduledFor? }`, strict: the old `access`, `inviteeIds` and `notify` are refused.

## Who is alerted
- A start (now, or a scheduled room's Start now) alerts **every active member** except the host, anyone in the room
  (LiveKit's list, or who joined) and anyone who tapped Remind me (they get "Starting now" only): `resolveAudience`
  in `service-notify.ts`, sent by `sendRoomNotify` in `src/shell/voice-alerts.ts` through notify(). Blocks either
  way, banned and deleted accounts, and members with no device get nothing.
- The alert: "<Name> started “<title>”", "Tap to listen.", kind `voice_broadcast`, address `/rooms/<id>`. Joining
  never alerts anyone.
- **Receipts** (`voice_notify_receipt`: one per room, 5 a day received) are claimed only for members notify() will
  really reach. `readHeldBack` reads each member's alert state first (alerts or room alerts off, quiet time, pause,
  a mute of the host, via `readSkipReason`); those members claim nothing but still go to notify(), so the alert log
  records why they were skipped.
- **The host's 3 a day** (`VOICE_LIMITS.broadcastsPerDay`, counted in `voice_broadcast`, audience "everyone"): a 4th
  start in 24 hours opens the room quietly. The create and start routes answer `{ roomId, isQuiet }`, and the page
  opens `/rooms/<id>?quiet=1`; the host sees "People weren't alerted this time: 3 rooms a day alert everyone."
  once (`quiet-start-note.tsx` drops the mark from the address as it shows).

## Rooms made before round 7
- A scheduled room saved with an audience keeps it: followers (read from `voice_follow`), people picked, or nobody
  (null). New scheduled rooms save "everyone" in `voice_room.notify_audience`, which is how Start now tells them
  apart from an older room saved with nobody.
- An invite-only room still live keeps its list: only the invited may join, and its alerts reach only them.
- Kept, unused by new rooms, until the owner decides (it deletes data): `voice_notify_choice`,
  `voice_room.notify_audience`/`notify_member_ids` (needed until every older scheduled room has passed, 60 days at
  most), `voice_follow` (still in Your data's export). No migration in this round.

## Receiving
- **Alerts** (`alert-settings-form.tsx`): one "Room alerts" row for the two room kinds (`ROOM_ALERT_KINDS` in
  `src/platform/notifications/contract.ts`). It reads on while either kind is on; a tap turns both on or off
  (`withRoomAlerts`). Where the alert log exists (demo mode and development), the page links "What was sent and
  skipped".
- **Rooms** (`room-alerts-switch.tsx`, `POST /api/voice/alerts`): the same switch, one tap, no page change, and a
  quiet link to Alerts reading "Quiet times", or "Quiet until 18:00" / "Paused until 14:30" while one holds alerts.
  With every alert off it says so and links Alerts instead. A member who never saved alerts keeps the browser's time
  zone, as a first save on Alerts does (`service-alerts.ts`).
- **A profile** (`src/components/alerts/room-mute-button.tsx`), while Rooms is on: "Don't notify me about Maya's
  rooms" (the existing mute, `MUTABLE_KINDS`); tapped again, "Notify me about Maya's rooms". Alerts › Muted people
  lists and undoes it too.

## Removed
Web: the composer's When / Who can come in / Notify controls and both people pickers, Tell people, Follow (profile
and room cards), Invite more people, the Rooms bell (`alerts-bell.tsx`). Routes: `/api/voice/notify`, `follow`,
`following`, `invite`, `people`. The store app's Tell people tool and panel. The demo seed's follows.

## The store app
The room page always hands the room over with `hasNotified: true`: app builds from before (TestFlight 3, the Android
test APK) hide their Tell people button on that flag, since its routes are gone. This build reads the flag from
`voice.open` and ignores it.

## Tests
`src/modules/voice/voice.test.ts`: one tap and the automatic title, the old body refused, a title needed to schedule,
rename by the host only, 3 alerting starts then a quiet one, the Rooms switch, the export of older follows, the start
alert end to end with the fake push server (muted, quiet, paused, blocked, room alerts off, in the room and no device
skipped; only the reached member holds a receipt), a quiet member keeping their 5 and reached once the quiet time
ends, Start now with Remind me (one alert each), older rooms' saved audiences and invite lists, one per room and the
5-a-day cap. `reads-live.test.ts` makes its invite-only room as an older room.
