---
id: room-polish
status: built
waits-on: []
size: under an hour
touches: ["src/modules/voice/components/live-room.tsx", "src/modules/voice/components/room-left-mark.ts", "src/modules/voice/reads-live.ts"]
---
# Spec: two room fixes after store build 4

**Approved:** the owner, 21 Nov 2026 ([CHARTER](CHARTER.md)). How it works: [NOTES](NOTES.md).

## What it does
1. In the store app, a room page that says "You left the room." (or "You joined this room on another device, so it
   continues there.") says the same after a reload, with Join again, and does not open the room again. Join again
   opens it. Coming to the room afresh (a room card, an alert) opens it as before.
2. The room cards on Rooms and Today's Live now count and show only the people in the room now. In demo mode the
   seeded made-up people still count as in; anyone else counts only while they are connected.

## Acceptance criteria
1. In the app: Join, Leave, Reload (This app › Reload, or a plain reload) → "You left the room." with Join again; no
   room screen opens. Join again opens it.
2. Back to Rooms, then the card's Join → the room opens.
3. A room that failed to open tries again on a reload (unchanged).
4. Demo room "Priya + 4"; Sam joins → "+ 5"; Sam leaves → "+ 4" on Rooms and on Today.

## Verification
`src/modules/voice/components/room-left-mark.test.ts` (the page in jsdom: leave, reload, Join again, a fresh visit),
`src/modules/voice/reads-live.test.ts` (the demo case). A separate verifier on a throwaway demo copy, in a browser at
390 px and in the store app's web preview: [reports/VERIFY.md](reports/VERIFY.md).
