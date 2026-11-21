# Voice (Rooms)

Live voice rooms like Clubhouse, on LiveKit (Apache 2.0), same host. Toggleable: off by default, on for a fresh install
whose `.env` has `ROOMS_ON_BY_DEFAULT=true` (install.sh writes it; an admin's stored choice always wins).
How it works, the token API, the ports: `.ai/features/voice-sessions/NOTES.md`; Start a room and its alerts:
`.ai/features/room-start-instant/NOTES.md`.

- `contract.ts`: paths, roles, limits, words, Zod bodies, data-message topics. Client-safe.
- `schema.ts`: `voice_room` (a scheduled room's audience), `voice_room_member` (role, hand, an older room's invite
  list), `voice_room_reminder`, `voice_broadcast` (each alerting start, for 3 a day), `voice_notify_receipt` (one
  alert per room, 5 a day received); `voice_follow` and `voice_notify_choice` are unused, kept for now.
- `client.ts`: the only code that calls LiveKit: tokens, participant roles and permissions, room counts, closing a room.
- `service-settings.ts`: which LiveKit: the server's env (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`,
  `LIVEKIT_API_URL`) or keys an admin saved (sealed secret).
- `service.ts`: create (one tap, or scheduled), rename, join (the token), hands, roles, leave, end, reminders, the
  minute upkeep (demo mode leaves the seeded rooms alone). `service-alerts.ts`: the Rooms page's Room alerts switch.
- `service-notify.ts`: who a start reaches (`resolveAudience`, pure), the room's invite list, who is in it and who
  tapped Remind me, the receipts. The alert itself goes from `src/shell/voice-alerts.ts` (`sendRoomNotify`) through
  notify().
- `reads.ts`: one room. `reads-rooms-page.ts`: the Rooms page (cards with faces).
  `reads-live.ts`: the live-room reads other screens use (`readLiveRooms`, `countLiveRooms`, `countRoomJoins`),
  empty or 0 while Rooms is off; screens outside Rooms read rooms only through these.
- `components/`: the UI (`room-start.tsx`, `room-alerts-switch.tsx`, `rename-room.tsx`). The phone app plays rooms natively (`readNativeApp()`, `mobile/src/voice/RoomScreen.tsx`); `room-left-mark.ts` keeps "You left the room." over a reload there (`.ai/features/room-polish/NOTES.md`).

Rules:

- Never record: no egress client, no recording control, no token with `roomRecord` or `roomAdmin`. Chat and
  reactions are LiveKit data messages and are never stored.
- The server owns roles. A member can't change their own LiveKit attributes (`canUpdateOwnMetadata: false`); every
  role or hand change goes through `service.ts`, which pushes it to LiveKit after the transaction commits.
- Listeners never get `canPublish`; stage roles may publish the microphone only.
- An outage of LiveKit never ends a room: upkeep is skipped while LiveKit can't be reached.
- Starting a room alerts everyone; members choose what reaches them. Joining never alerts anyone.
