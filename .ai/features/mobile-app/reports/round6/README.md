# Round 6 store builds: the web-preview check (20 Nov 2026)

The store app's web build (`mobile/scripts/web-preview.mjs`) against a throwaway local demo server (production build,
its own Postgres and a local LiveKit), at 390 px, with real clicks as the demo member Sam.

- `02-signed-in.png`: the five tabs, Rooms · Today · Asks · People · Inbox, as on the web app; the push token registered.
- `03-rooms.png`, `04-start-notify.png`: Rooms, then Start a room with Notify others on (My followers · People I pick · Everyone).
- `05-room-native.png`: Start opened the app's own room screen, connected to LiveKit. The server saved
  `voice_broadcast.audience = everyone` and Sam's last choice.
- `07-joined-listener.png`: Join on a live room opened it natively as a listener.
- `13-before-fix-already-told-in-red.png` → `14-after-fix-already-told.png`, `16-told-success.png`: Tell people I'm here.
  The server got `picked` notifies; a room already told about answers `voice_notified_already`, which now closes the
  button, and confirmations read in ink instead of the warning colour. A room started with Notify off saved `off`.
- `17-left.png`: Leave disconnects and returns to the portal (also checked as a listener, and End room as the host).
