# Charter: the room hand-off between the web page and the store app

**Approved:** the owner said yes to both points on 20 Nov 2026 (round 6, last small fix, found by the store-build
check). No decision page: the brief carried the owner's decisions.

## Direction
Two gaps where the web room page and the store app's room screen disagree:
1. After a member leaves a room in the store app, the web room page under it still says "Playing in the app." with
   "Open the room". It should say they left and offer **Join again**.
2. When the web room page hands a room to the store app, it passes along whether the member already told people
   about this room, so the app does not offer "Tell people I'm here" only to fail.

Out: anything else in the room screens; the browser's own room (unchanged).

## Deciding facts
- The page already knows `hasNotified` (the room page reads it from the server).
- The app's room screen closes in one place (`PortalScreen.closeRoom`), after Leave, a lock-screen Leave, or "Back to
  the portal" on an ended or failed room.
- The app has no over-the-air updates, so any change in `mobile/` means a new TestFlight build. Point 2 needs one by
  its nature (the app must read the new fact), so point 1 uses the same new bridge rather than polling the server.

## Architecture
- Page → app: `CommonhallApp.openRoom(roomId, title, { hasNotified })`; the bridge message `voice.open` gains
  `hasNotified`. An old app ignores the third argument; a new app with an old server reads it as false (as today).
- App → page: when the room screen closes, the app sends the page the event `commonhall-room-closed` with
  `{ roomId, reason }` (`left` · `ended` · `elsewhere` · `failed`). The room page for that room shows what happened,
  re-reads itself from the server (so a second hand-off carries a fresh `hasNotified`), and offers Join again (not for
  an ended room).

## Journeys and tests
- Rooms in the store app (`.ai/journeys/`, rooms). Unit tests: the app's bridge (`mobile/src/lib/lib.test.ts`: the
  message carries `hasNotified`, the closed event script) and the page's reading of the event (`src/platform/
  native-app/`). About 10 minutes.
- A separate verifier drives the store app's web preview (`mobile/scripts/web-preview.mjs`) against a throwaway local
  server with made-up people: leave in the app → the page says you left, Join again works; a member who notified at
  start opens the room → no "Tell people". About 30 minutes.

## Proof and estimate
Build 30–45 minutes, tests 30 minutes. Proof: screenshots from the web preview.
