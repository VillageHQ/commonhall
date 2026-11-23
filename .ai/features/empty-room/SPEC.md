# An empty room ends by itself

From the [charter](CHARTER.md) (23 Nov 2026). Server side only; the store app needs no change.

## What it does
- A live room with nobody connected ends by itself a minute after it is first seen empty. The minute check runs every
  minute and right after someone leaves, so the room ends one to two minutes after the last person goes.
- Someone joining, or connecting again, within that minute keeps the room going; the minute starts over the next
  time the room is seen empty.
- A member who taps Leave stops counting on room cards (Rooms, Today's Live now) at once: the server removes them
  from the voice server before anything else.
- Unchanged: a room with listeners but nobody on stage ends after 2 minutes; a host gone for 30 s hands the room to a
  co-host; an outage of the voice server never ends a room; the demo's seeded rooms stay as they are.

## Where
`leaveRoom`, `checkRoom` and `joinRoom` in `src/modules/voice/service.ts`; `VOICE_LIMITS.emptyRoomMs` in
`contract.ts`; `voice_room.empty_since` (migration `0051_voice_room_empty_since`). How rooms work:
`.ai/features/voice-sessions/NOTES.md`.

## Tests
`src/modules/voice/voice.test.ts`: the leaver stops counting at once and the room ends after a minute, not before;
someone back within the minute keeps it; never while the voice server is down.
