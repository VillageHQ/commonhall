# How "Notify others" and Follow work today

Built 20 Nov 2026 as part 3 of round 6 ([SPEC](SPEC.md), [simplify-round6](../simplify-round6/SPEC.md)). It replaced
"I'm available to talk" (its button on Rooms, in the Inbox and in conversations, the `/api/voice/available` route and
`src/shell/chat-available.tsx` are gone). Module `voice`; the map is `src/modules/voice/AGENTS.md`.

## The member's side
- **Start a room** (Rooms, `room-composer.tsx`): a title, Now or Schedule, Everyone or Invite only, and **Notify
  others** with My followers · People I pick (up to 50) · Everyone. Off the first time; after that the sheet opens on
  the member's last choice, off included (`voice_notify_choice`). At the day's limit the switch is off and disabled,
  with one line: "3 notifies a day. Back at <time>."
- **Tell people I'm here** (the live room's bar, web and store app): once per room, after joining, to up to 10 people
  picked by name. A second try answers 409 "You've told people about this room already."
- **Follow** ("Tell me when Lina starts a room"): on a member's profile (`FollowButton`: it reads
  `POST /api/voice/following` and hides until it knows, on your own profile, and while Rooms is off) and on room cards
  for the host (`FollowToggle`, a bell with a tooltip there; every card for the same host follows the change).
  One-way, chosen by the follower. Your data's export lists it (`roomsYouFollow`).
- The alert: "<Name> started “<title>”" or "<Name> is in “<title>”", body "Tap to listen.", kind `voice_broadcast`,
  address `/rooms/<id>`. The room page joins on open (a browser that blocks sound shows one "Tap for sound" button);
  the store app hands it to the native room screen.

## The rules, and where they live
- **3 notifies a day per sender** (`VOICE_LIMITS.broadcastsPerDay`, the last 24 hours), starting and joining together,
  counted in `voice_broadcast` (one row per notify, with `audience` and `reached`). The sender's user row is locked
  while counting, so two at once take turns. Rows with a null audience are old "I'm available" ones and still count.
- **A scheduled room's Notify** is kept on the room (`voice_room.notify_audience`, `notify_member_ids`) and sent when
  the host taps Start now. Past the limit by then, it is dropped and the room starts anyway.
- **Who it reaches** (`service-notify.ts`, `resolveAudience`): followers, the people picked, or everyone; in an
  invite-only room only the invited (Everyone means them); never the sender or anyone in the room now (LiveKit's
  list, or who has joined when LiveKit can't say). `src/shell/voice-alerts.ts` (`sendRoomNotify`) then keeps active,
  undeleted members with a device and no block either way.
- **Receivers are protected** (`voice_notify_receipt`, one row per room and member): one alert per room, and at most
  5 a day from others' notifies; past that the member is skipped and counted (`capped`, in the server log). Rows go
  after 7 days (the minute job).
- **notify() decides the rest**: alerts off, the kind off, quiet times and pause, a mute of the sender.
- Routes: `POST /api/voice/create` (`notify: { audience, memberIds? } | null`), `POST /api/voice/notify`
  (`{ roomId, memberIds }`), `POST /api/voice/follow` (`{ memberId, isFollowing }`), `POST /api/voice/following` (`{ memberId }` →
  `{ isFollowing, isSelf }`), `POST /api/voice/start`. The
  alerts go after the response (`sendRoomNotifySoon`), which then writes `reached`.

## Rooms on by default for new installs
`install.sh` writes `ROOMS_ON_BY_DEFAULT=true` into a **new** `.env` only (it makes the voice server's keys in the
same step); upgrades never add it. `voiceManifest.isOnByDefault` reads it, so a fresh install has Rooms on until an
admin turns it off, and an existing install keeps its setting. `setup:instance` makes no voice keys, so it changes
nothing here.

## The demo
The seed turns Rooms on with one live room ("Pricing your first enterprise deal", Priya hosting) and one coming up,
and Sam follows two hosts (`src/shell/demo-rooms.ts`). In demo mode the upkeep never ends a room the seed made
(`createdAt` up to the demo's `demo_seeded_at`), so the live one stays live until the nightly reset. Nobody real is in
it: with a voice server set up its card shows the host and speakers instead of people connected.

## Tests
`src/modules/voice/voice.test.ts`: the audience rules (pure), the 3-a-day limit and its reset time, the last choice,
"Tell people I'm here" once per room, Follow and the export, the install default, and the alerts end to end with the
fake push server (followers only; muted, quiet, blocked and off skipped; a scheduled room's Notify at start;
invite-only Everyone; one per room and the 5-a-day cap).
