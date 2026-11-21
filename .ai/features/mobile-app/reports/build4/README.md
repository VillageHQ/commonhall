# Store build 4: the web-preview check (21 Nov 2026)

The store app's web build (`mobile/scripts/web-preview.mjs`) against a throwaway local demo server (production build
of main after round 7, PRs #110-#118, its own Postgres and a local LiveKit), at 390 px, with real clicks as the demo
member Sam.

- `01-signed-in.png`: the app opens on Today, with the five tabs Rooms · Today · Asks · People · Inbox.
  `12-web-app-today.png` is the web app at the same width: the same tab bar, word for word. The server holds the app's
  push token (`notification_device`, type `expo`).
- `02-rooms.png` → `03-room-native.png`: one tap on Start a room opened the app's own room screen as host ("Sam's
  room", Rename, on stage, muted), connected to LiveKit. The server recorded one alerting start (`voice_broadcast`,
  audience `everyone`).
- `04-renamed.png`: Rename on the room screen saved "Pricing AMA" on the server (`voice_room.title`); `05-minimised.png`:
  the mini bar and the room page under it both read the new title.
- `06-left.png`: Leave from the reopened room closed the screen, and the page says "You left the room." with Join again.
  Join again, then End room, showed "This room has ended."
- `07-quiet-start.png`: with Sam's 3 alerting starts for the day used (two rows added in the throwaway database), a new
  one-tap start opened the room with "People weren't alerted this time: 3 rooms a day alert everyone." on the app's
  room screen.
- `08-joined-listener.png`: Join on another member's live room opened it natively as a listener: no Rename, no Tell
  people; Raise hand turned into Lower hand; Leave brought "You left the room." back.
- `09-this-app-menu.png`, `10-switch-community.png`: the avatar menu's This app group: Reload reloads the page (on a room page Sam had just left, the
  reload put him back in the room, as the room page opens the room whenever it loads in the app: a question for the
  owner, not a store-app fault), Open
  in the browser opened `/today` in a new browser tab, Switch community showed the join screen with Northwind Founders
  under On this phone, and a tap returned to it.
- `11-alerts.png` → `13-paused.png`: Rooms' Quiet times link opens Alerts (this phone's alerts come from the app; quiet
  times; pause). Pause alerts, 1 hour, read "Paused until 07:16", and Rooms showed the same line.

The first room attempt failed at the network step because the local LiveKit in Docker announced its container
address; restarted with `--node-ip 127.0.0.1`, the room joined. The app showed its own failure screen and the page
said "The room didn't open in the app." with Join again, as it should.

Not checkable in a browser: bounce, pull-to-refresh, momentum, link previews, the status-bar colour and the iOS back
swipe (`.ai/features/smooth-app/reports/device-check.md`, filled in on a phone). The settings behind them are in
`mobile/src/components/PortalView.native.tsx` (`bounces={false}`, `overScrollMode="never"`,
`pullToRefreshEnabled={false}`, `decelerationRate="normal"`, `allowsLinkPreview={false}`,
`allowsBackForwardNavigationGestures`).

Store app checks: `npm run typecheck` clean, `npm test` 17/17. Nothing in the store app needed a fix this round.
