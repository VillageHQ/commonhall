---
id: room-handoff
status: built
waits-on: []
size: under an hour
touches: ["src/modules/voice/components/live-room.tsx", "src/platform/native-app/", "mobile/src/"]
---
# Spec: the room hand-off between the web page and the store app

**Approved:** the owner, 20 Nov 2026 ([CHARTER](CHARTER.md)). How it works: `.ai/features/mobile-app/NOTES.md`,
"Voice rooms, native".

## What it does
- In the store app, the web room page hands the room to the app's room screen. When that screen closes, the page says
  why: "You left the room." (with **Join again** and Back to Rooms), "This room has ended." (Back to Rooms only),
  "You joined this room on another device, so it continues there." or "The room didn't open in the app." (both with
  Join again).
- The hand-off carries whether the member already told people about the room ("Tell people I'm here", or a Notify when
  starting it). The app then shows no Tell people button for that room.

## Contract
- Page → app: `CommonhallApp.openRoom(roomId, title, { hasNotified })`; message `voice.open` with `hasNotified`
  (anything but `true` reads as false).
- App → page: `window` event `commonhall-room-closed`, `detail: { roomId, reason }`, reason one of `left`, `ended`,
  `elsewhere`, `failed` (`ROOM_CLOSED_REASONS` in `src/platform/native-app/bridge.ts`).
- Needs a new store build: older app builds keep the old behaviour; nothing breaks either way.

## Acceptance criteria
1. Leave in the app → the page shows "You left the room." with Join again; Join again opens the room in the app.
2. A room started with Notify, or one the member told people about → the app's room screen has no Tell people.
3. A room with no notify yet → Tell people shows.
4. Host ends the room → the page says it ended, no Join again.

## Verification
Unit tests: `mobile/src/lib/lib.test.ts` (the message and the closed-event script), `src/platform/native-app/bridge.test.ts`
(the page reads the event, only for its room). A separate verifier in the store app's web preview: `reports/`.
