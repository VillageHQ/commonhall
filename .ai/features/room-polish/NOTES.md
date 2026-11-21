# How the two room fixes work (21 Nov 2026)

From [SPEC](SPEC.md). Web only: the store app's code did not change, so TestFlight 4 and the Android test APK get
both fixes from the server.

## A reload after leaving, in the store app
- `src/modules/voice/components/room-left-mark.ts`. When the app closes its room screen because the member left
  (`left`) or the room continues on another device (`elsewhere`), `AppRoomHandoff` (`live-room.tsx`) keeps a mark in
  the tab's sessionStorage (`commonhall-room-left:<roomId>`) for as long as it shows those words. Join again, or going
  to another page inside the app, drops it (the effect's cleanup); a reload runs no cleanup, so the mark survives.
- On load the page reads the mark only when the page was loaded by a reload (the navigation timing's `type`). So a
  room card, or an alert tap (the app's `location.assign`, a full load that is not a reload), opens the room as before.
- Why not `history.state`: Next 16 rewrites it on `router.refresh()` (a replace navigation, which the page runs as the
  room closes), so the mark would be gone before the reload.
- `failed` and `ended` are not kept: a reload after a failure tries again, and an ended room's page says so itself.
- Back to a room page you left (Back from another page) opens the room again: only a reload is covered (roadmap).

## Who the room cards count
- `readLiveRooms` (`src/modules/voice/reads-live.ts`), used by the Rooms page's cards and Today's Live now: someone
  counts while LiveKit lists them. In demo mode, seats taken before the demo was last seeded (`joinedAt` at or before
  the `demo_seeded_at` setting, `readDemoSeededAt` in `service.ts`) count as in too, since the made-up people never
  connect. Before, demo mode counted everyone who ever joined, so a visitor who left stayed on the card.
- While LiveKit can't be reached, everyone who joined still counts (unchanged; nobody can hear a room then).

## Tests
`room-left-mark.test.ts` renders the real `LiveRoom` in jsdom with a stand-in app: leave, reload (the mark kept, no
second `openRoom`), Join again, Back then a fresh visit, an alert-style fresh load, a failed room retried.
`reads-live.test.ts`: the demo case (a seeded seat counts, a visitor who left doesn't).

## Checking in the store app's web preview on Windows
Build the app's web export with `MSYS_NO_PATHCONV=1` in Git Bash: otherwise `EXPO_BASE_URL=/__app` turns into
`C:/Program Files/Git/__app` and the preview page stays blank (two earlier `dist-web` folders had this).
