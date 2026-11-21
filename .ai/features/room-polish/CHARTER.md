# Charter: room-polish (round 7, two small room fixes)

**Approved:** the owner, 21 Nov 2026 ("decided: yes to both", round 7's fix list after store build 4). This page
records that decision; nothing here goes beyond it.

## Direction
1. In the store app, reloading a room page you just left keeps showing "You left the room." with Join again. It does
   not put you back in the room.
2. Room cards (Rooms, and Today's Live now) count and show only the people in the room now, not everyone who ever
   joined.

Out: any change to how rooms start, alert or end; the store app's own code unless the fix needs it (it doesn't);
a database change.

## Deciding facts
- Store build 4's web-preview check found both: the avatar menu's Reload on a room page Sam had just left put him back
  in the room (the page opens the room whenever it loads in the app), and it ran on a demo server.
- The cards already count from LiveKit's list of who is connected, except in demo mode, where everyone who ever joined
  counts (so the made-up seeded people, who never connect, show as in). A real member who joined and left a demo room
  stayed on the card. Outside demo mode the count was already right while LiveKit answers.
- A reload keeps the page's history entry (its `history.state`), both in the app's web view and in a browser; a fresh
  tap on a room card makes a new entry.

## Design (no look change)
- When the app says you left (or that the room continues on another device), the page marks its own history entry.
  On a reload it reads the mark and shows the same "You left the room." with Join again and Back to Rooms. Join again
  clears the mark and opens the room. Coming to the room again from a card opens it as before.
- Demo mode: the seeded people (seated when the demo was last seeded) still count as in; anyone else counts only
  while LiveKit lists them.

## Architecture
Web only: `src/modules/voice/components/live-room.tsx` (the mark), `src/modules/voice/reads-live.ts` (the count).
The store app's code does not change; build 4 gets both fixes from the server.

## Small calls (mine)
- "Continues on another device" is kept on reload too: a reload would otherwise pull the room back from the other device.
- While LiveKit can't be reached at all, the cards still count everyone who joined (no one can hear a room then
  anyway); unchanged.

## Journeys and tests
- Rooms (join, leave, cards): `src/modules/voice/reads-live.test.ts` gains the demo case (~1 min); a unit test for the
  page's left mark (~1 min); lint, typecheck, the voice tests and build (~10 min).
- A separate verifier, in a browser at 390 px and in the store app's web preview, on a throwaway local demo copy with
  made-up people and a local LiveKit (~30 min).

## Estimate
Build 30 minutes, tests and check 40 minutes. Proof: the reloaded page still saying "You left the room."; a card going
from 6 to 5 when Sam leaves the demo room.
