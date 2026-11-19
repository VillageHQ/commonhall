# Voice (Rooms)

Live voice rooms like Clubhouse, on LiveKit (Apache 2.0), same host. Toggleable, off by default.
How it works, the token API, the ports: `.ai/features/voice-sessions/NOTES.md`.

- `contract.ts`: paths, roles, limits, words, Zod bodies, data-message topics. Client-safe.
- `schema.ts`: `voice_room`, `voice_room_member` (role, hand, invite list), `voice_room_reminder`, `voice_broadcast`.
- `client.ts`: the only code that calls LiveKit: tokens, participant roles and permissions, room counts, closing a room.
- `service-settings.ts`: which LiveKit: the server's env (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`,
  `LIVEKIT_API_URL`) or keys an admin saved (sealed secret).
- `service.ts`: create, join (the token), hands, roles, leave, end, reminders, invites, the minute upkeep.
- `reads.ts`: the Rooms list, one room, people to invite. `components/`: the UI; the phone app plays rooms natively
  (`readNativeApp()`).
- Alerts ("I'm available", reminders) are sent from `src/shell/voice-alerts.ts` through notify().

Rules:

- Never record: no egress client, no recording control, no token with `roomRecord` or `roomAdmin`. Chat and
  reactions are LiveKit data messages and are never stored.
- The server owns roles. A member can't change their own LiveKit attributes (`canUpdateOwnMetadata: false`); every
  role or hand change goes through `service.ts`, which pushes it to LiveKit after the transaction commits.
- Listeners never get `canPublish`; stage roles may publish the microphone only.
- An outage of LiveKit never ends a room: upkeep is skipped while LiveKit can't be reached.
