# Charter: an empty room ends by itself

Approved: decided in Commonhall round 8 by the round's lead on 23 Nov 2026 (the round runs on autopilot for the owner;
the decision is in the round's log), built as the round's last small fix.

## Direction
When the host taps Leave instead of End room, the room stays live on Rooms as "1 in" with nobody in it. From now on:
- A live room with nobody connected ends by itself after 1 minute.
- Room cards (Rooms, Today's Live now) count only the people connected now: someone who tapped Leave stops counting at
  once.

In: server side only (the voice module). Out: the store app (no change needed: it already closes its room when the
server ends one), the web room's screens, the words on the cards.

## Deciding facts (found in the code)
1. Both the web room and the store app call the leave route *before* they disconnect from the voice server, so the
   check that runs on leave still sees the leaver connected and never marks the room empty. The room was only seen
   empty by a later minute check, then waited 2 more minutes (the "nobody on stage" rule): 2–3 minutes in all, and
   the card counted the leaver for as long as the voice server still listed them.
2. Every caller of the leave route really leaves (the web room's Leave; the app's Leave, its mini bar's Leave, and
   opening another room).
3. The voice server lets the server remove a participant; both clients already treat that as "left".

## Architecture
- Leave removes the member from the voice server (LiveKit `removeParticipant`) before the room's check, so every read
  after it is accurate.
- `voice_room.empty_since` (a new nullable column, migration 0051): set when a check first sees nobody connected,
  cleared when someone is; a room empty for `VOICE_LIMITS.emptyRoomMs` (1 minute) ends. The 2-minute "nobody on
  stage" rule stays for rooms with listeners and nobody on stage.
- An outage of the voice server still never ends a room; the demo's seeded rooms are still left alone.

## Journeys and tests
- Rooms: start, leave, the cards. Tests: `src/modules/voice/voice.test.ts` (leave stops counting at once; nobody
  connected ends after 1 minute, not before; someone coming back clears it), ~2 min.
- Usability: a separate verifier, in a browser at 390 px and in the store app's web preview, against a throwaway local
  copy with made-up people and a local voice server: host leaves, the card no longer counts them, the room ends after
  a minute.

## Estimate
Build 30 minutes, tests 20 minutes, the verifier's check 30 minutes.
