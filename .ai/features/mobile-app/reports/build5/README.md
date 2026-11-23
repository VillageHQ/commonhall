# Store build 5: the web-preview check (23 Nov 2026)

The store app's web build (`mobile/scripts/web-preview.mjs`) against a throwaway local demo server (production build
of main after round 8, PRs #122-#129, its own Postgres and a local LiveKit with `--node-ip 127.0.0.1`), at 390×844,
with real taps (Playwright, touch) as the demo member Sam. Made-up people only.

- `01-signed-in-today.png`: the app opens on Today under the app's own tab bar (Part 7): Rooms · Today · Asks · People ·
  Inbox, 56 px at the bottom, Today selected, the Rooms live dot and the Inbox count "1". `05-web-app-today.png` is the
  web app at the same width: the same five tabs, word for word, the same badges. The site's own bar is hidden
  (`visibility: hidden`) in every tab, each tab has `--tab-h: 56px`. The server holds the app's push token
  (`notification_device`, type `expo`).
- `02-people.png` → `03-slide-midway.png`: People, then Today again: Today slides back in (caught 90 ms in, a few px
  off and fading in). After visiting all five tabs, all five web views are alive, each loaded once.
- `06-rooms.png` → `07-room-sheet-host.png`: one tap on Start a room opened the app's new room sheet as host ("Sam's
  room", End room, More, on stage with the mic off) in the site's fonts and icons. The server recorded the room
  (`voice_room`, live) and one alerting start (`voice_broadcast`, audience `everyone`).
- `08-mini-player-room-page.png`, `08-mini-player.png`, `09-mini-player-today.png`: the chevron minimised the room. On
  the room page (a pushed screen, no tab bar) the mini player sits at the bottom; back on Rooms and on Today it is
  docked right above the tab bar (mini 732–788, bar from 788), and the live tabs get `--mini: 56px`, so Room alerts
  at the end of Rooms stays above it.
- `11-host-more.png` → `10-after-leave.png`: the mini player reopened the sheet; More (Rename, Leave, "Never
  recorded.") › Leave closed the sheet and the mini player.
- `12-joined-listener.png` → `13-left-room-page.png`: Join on Priya's live room opened the sheet as a listener (Leave,
  Raise hand, no End room); Leave brought the room page "You left the room." with Join again and Back to Rooms.
- `14-quiet-start.png` → `15-after-end.png`: with Sam's 3 alerting starts for the day used, a 4th start opened with
  "People weren't alerted this time: 3 rooms a day alert everyone." and no new `voice_broadcast` row; End room ended it
  on the server and the sheet read "This room has ended." with Back to the portal.
- `16-room-alerts-off.png`: Rooms' Room alerts switch, tapped off, saved `off_kinds={voice_room,voice_broadcast}` for
  Sam on the server; tapped again, it was on.

"Notify others" on start and join (the brief's words) is no longer in the product: since round 7 a start is one tap
and alerts everyone (3 a day, then quietly, as above), joining never alerts anyone, and members turn room alerts off
with the Room alerts switch or quiet times. Those are what this check covered.

Not checkable in a browser: the keyboard hiding the bar, Android's back button, VoiceOver and TalkBack on the hidden
tabs, memory on a low-end Android, the fonts on a real device, a room playing with the screen locked. They wait for
the phone test of build 5.

Store app checks: `npm run typecheck` clean, `npm test` 29/29. Nothing in the store app needed a fix this round.
