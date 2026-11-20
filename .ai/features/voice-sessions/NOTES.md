# How voice rooms (Rooms) work today

Live audio rooms like Clubhouse and X Spaces, on LiveKit (Apache 2.0) on the fund's own server. Module `voice`
(`src/modules/voice/`, its `AGENTS.md` maps the files), toggleable, **off by default**: an admin turns on Rooms in
Set up › Features. Rooms are **never recorded**: there is no egress service, no recording control, and no token with
`roomRecord` or `roomAdmin`. Chat and reactions are LiveKit data messages, never stored.

## The pieces
- **Pages:** `/rooms` (Start a room, live now with faces and Join, coming up with Remind me), `/rooms/<id>` (the live room,
  a scheduled room's Remind me / Start now, or "ended"), `/admin/rooms` (Set up › Rooms: where LiveKit runs).
  An invite-only room is not found for anyone off its list.
- **"I'm available to talk" was retired on 20 Nov 2026** (round 6, part 3): its button on Rooms, in the Inbox and in
  conversations, `/api/voice/available` and `src/shell/chat-available.tsx` are gone. "Start a room" with **Notify
  others**, "Tell people I'm here" and Follow replace it: `.ai/features/room-join-notify/NOTES.md`.
- **Tables** (`schema.ts`, migration `0041_voice_rooms`): `voice_room` (host, access open/invite, status
  scheduled/live/ended, `empty_stage_since`), `voice_room_member` (role host/cohost/speaker/listener, raised hand,
  invite list), `voice_room_reminder`, `voice_broadcast` (one row per notify sent, for the limit of 3 a day), and
  since round 6 `voice_follow`, `voice_notify_receipt`, `voice_notify_choice` (room-join-notify's NOTES).
- **The server owns roles.** Every change (hand, invite up, move down, co-host, hand-over) is a route → `service.ts`
  transaction, then `client.ts` pushes it to LiveKit with `updateParticipant`: participant attributes `role`,
  `hand`, `face` (everyone's screen updates live) and the permission (`canPublish` only on stage, microphone only).
  Members can't change their own attributes (`canUpdateOwnMetadata: false`).
- **Rules:** only the host changes co-hosts; nobody changes the host; anyone on stage may step down; the host or an
  admin ends a room. A member sends at most 3 notifies in the last 24 hours (the 4th answers 429 with a plain message).
- **Upkeep** (module job `voice-rooms`, every minute; also run right after someone leaves): a host gone for 30 s
  hands the room to the first co-host still connected; a room with nobody connected on stage for 2 minutes ends
  (LiveKit `deleteRoom`, so every browser shows "This room has ended"). Skipped while LiveKit can't be reached,
  so an outage never ends a room. Scheduled rooms nobody started end a day after their time.
- **Alerts** (`src/shell/voice-alerts.ts`, through `notify()`; built 19 Nov 2026, part voice-broadcast):
  - A room notify ("Notify others", "Tell people I'm here") → kind `voice_broadcast`: see
    `.ai/features/room-join-notify/NOTES.md`.
  - "Remind me" → kind `voice_room`, "Starting now: <title>", to the members who tapped it (same account and block
    filters), **once**: when the host taps Start now (`startScheduledRoom` claims `reminders_sent_at`, early or on
    time), or else when the minute job `voice-reminders` finds the room's time has come (`claimDueReminders`). A room
    the host ended first sends none.
  - Both kinds appear in Settings › Alerts while Rooms is on (`KIND_FEATURES` in `src/app/(app)/me/alerts/page.tsx`).

## Where LiveKit runs
`service-settings.ts` picks, in order:
1. The server's env: `LIVEKIT_URL` (what browsers connect to, `wss://` in production), `LIVEKIT_API_KEY`,
   `LIVEKIT_API_SECRET`, and optional `LIVEKIT_API_URL` (how the app reaches LiveKit, e.g. `http://livekit:7880`).
2. Keys an admin saved in Set up › Rooms (LiveKit Cloud): settings `voice_livekit_url`, `voice_livekit_api_key`,
   `voice_livekit_api_secret` (sealed with `SETUP_TOKEN` like the Village secret; a preview refuses to save).
Without either, Rooms shows "not set up yet" and the buttons are off.

- **VPS (`install.sh`, `deploy/vps/`):** a `livekit` service (`livekit/livekit-server:v1.13`) with keys from `.env`
  (`LIVEKIT_KEYS`), made at install and added on upgrade (`add_missing_voice_keys`). Caddy routes `/rtc*` on the
  community's domain to LiveKit, so browsers use `wss://<domain>` with the same certificate; the admin API stays inside
  docker. Media: **TCP 7881 and UDP 50000–50100**, opened in `ufw` by the installer; the README says to open them in a
  host's own firewall too. `use_external_ip: true` finds the public address by STUN.
- **Local dev:** `docker compose up` starts LiveKit in dev mode (`devkey` / `secret`, ports 7880, 7881, 7882/udp);
  uncomment the `LIVEKIT_*` lines in `.env`.

## The token API (for the phone app)
All routes are `POST`, JSON, same-origin with the member's session cookie (the route kit checks origin and session;
the store app calls them from inside the portal page, with its cookie and origin, so they stay as they are; see
`.ai/features/mobile-app/NOTES.md`). In the app the room page hands the room to the app's native player. Errors answer `{ code, message }`.

| Route | Body | Answer |
|---|---|---|
| `/api/voice/rooms` | `{}` | `{ live: RoomCard[], scheduled: RoomCard[], isConfigured, notify: { left, resetsAt, choice } }` |
| `/api/voice/join` | `{ roomId }` | `{ serverUrl, token, roomName, role, identity }`: connect a LiveKit client to `serverUrl` with `token`. 403 `voice_not_invited`, 409 `voice_room_ended` / `voice_room_not_live`, 422 `voice_not_configured`, 401 signed out. |
| `/api/voice/create` | `{ title, access: "open"\|"invite", scheduledFor: ISO\|null, inviteeIds: [], notify: { audience, memberIds? }\|null }` | `{ roomId }`; 429 `voice_broadcast_limit` |
| `/api/voice/notify` | `{ roomId, memberIds }` (1–10) | `{ ok }`; 403 `voice_not_in_room`, 409 `voice_notified_already`, 429 `voice_broadcast_limit` |
| `/api/voice/follow` | `{ memberId, isFollowing }` | `{ ok }` |
| `/api/voice/hand` | `{ roomId, isRaised }` | `{ ok }` |
| `/api/voice/role` | `{ roomId, memberId, action: "invite_up"\|"move_down"\|"make_cohost"\|"remove_cohost" }` | `{ ok }`; 403 `voice_not_moderator` |
| `/api/voice/leave`, `/api/voice/end`, `/api/voice/start` | `{ roomId }` | `{ ok }` |
| `/api/voice/remind` | `{ roomId, isOn }` | `{ ok }` |
| `/api/voice/invite` | `{ roomId, memberIds }` | `{ ok }` |
| `/api/voice/people` | `{ search }` | `{ people: [{ id, name, faceUrl }] }` (names only, never emails) |

The token lives 10 minutes (`VOICE_LIMITS.tokenTtlSeconds`); LiveKit refreshes it for a connected member, so ask
`/join` again only to reconnect. In the room, read each participant's attributes `role` (host, cohost, speaker,
listener), `hand` ("1" when raised) and `face` (picture URL); publish data on topic `chat` (reliable, text up to 500
characters) or `reaction` (one of `VOICE_REACTIONS`). A role change arrives as an attributes change plus new
permissions; a moved-down member's microphone is unpublished by LiveKit.

## Tests
- `src/modules/voice/voice.test.ts` (real routes, real Postgres, fake LiveKit `src/test/fake-livekit-server.ts`):
  token grants by role, signed-out and invite-only refusals, the chat button only while Rooms is on with Rooms' count, the stage controls pushed to LiveKit, end, hand-over to
  a co-host, the 2-minute rule (and no end while LiveKit is down), the 4th broadcast, and the alerts (fake Expo
  push server `src/test/fake-push-server.ts`): who a broadcast reaches and who it skips, one alert per double tap,
  reminders on Start now and from the minute job, never twice.
- `deploy/vps/test-installer.sh`: keys at install and on upgrade, the firewall ports.
- Two-browser audio: run headless Chromium with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`
  (and `--use-file-for-fake-audio-capture=<steady tone wav>` for the talking ring; the default fake mic only beeps);
  read `inbound-rtp` audio stats from the page's RTCPeerConnections to prove sound arrives.

## Since round 7 (20 Nov 2026)
Starting a room alerts everyone, the host renames a one-tap "<first name>'s room" inside it, and Notify others, Tell
people and Follow are gone: [room-start-instant NOTES](../room-start-instant/NOTES.md).
