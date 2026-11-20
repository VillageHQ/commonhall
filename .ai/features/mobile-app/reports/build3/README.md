# Store build 3: the web-preview check (20 Nov 2026)

The store app's web build (`mobile/scripts/web-preview.mjs`) against a throwaway local demo server (production build
of main after the room hand-off, its own Postgres and a local LiveKit), at 390 px, with real clicks as the demo member Sam.

- `01-signed-in.png`: the five tabs, Rooms · Today · Asks · People · Inbox, as on the web app. The server holds the
  app's push token (`notification_device`, type `expo`).
- `04-notify-on.png` → `05-room-native.png`: Start a room with Notify others on, "My followers" picked; Start opened the
  app's own room screen, connected to LiveKit, with no Tell people (the page passed `hasNotified`). The server saved
  `voice_broadcast.audience = followers` and Sam's last choice `followers`.
- `06-left.png`: Leave closed the room screen, and the room page now says "You left the room." with Join again
  (the hand-off from PR #108; build 2 kept saying "Playing in the app.").
- `07-rejoined.png`: Join again opened the room natively again, still without Tell people. End room then showed
  "This room has ended." and the page read Ended.
- `10-joined-listener.png` → `13-told.png`: Join on another live room opened it natively as a listener with Tell people;
  picking Maya and Send read "Told them you're here." and closed the button (server: `voice_broadcast` `picked`).
- `15-rejoined-told.png`: after Leave and Join again, the room came back without Tell people: the page's fresh
  `hasNotified` reached the app on the hand-off.

Nothing in the store app needed a fix this round.
