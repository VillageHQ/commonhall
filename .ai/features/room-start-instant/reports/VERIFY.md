# Verify: room-start-instant (independent verifier, 20 Nov 2026)

Driven against the throwaway copy at http://localhost:9757 (demo mode). Browsers: Playwright Chromium, phone 390×844
(isMobile, touch, DSF 2) and desktop 1280×860 (DSF 1), clock in UTC. Scripts are in `.ai/tmp/verify/` (gitignored).
Pushes were read from `/__preview/pushes`, state from `room_app` with psql. No tracked file was edited.

Setup (made-up members, written in the throwaway DB): Expo devices for Sam and Maya through
`POST /api/notifications/devices` (200 "Alerts are on for this device.") and, by SQL, for Priya and Ada (normal),
Marcus (room alerts off: `off_kinds = {voice_room,voice_broadcast}`), Elena (an all-day, every-day quiet time),
Oliver (paused for a day) and Lena (has muted Sam).

## Results

| # | Check | Result |
|---|-------|--------|
| 1 | One tap starts "Sam's room", live; none of the removed controls exist (390 and 1280) | PASS |
| 2 | One push for each member with a device; none to Sam or to the off, quiet, paused or muting members | PASS |
| 3 | 4th start in 24 h is quiet and shows the line once; gone after a reload | PASS on a single tap. A double tap loses the line (see B1) |
| 4 | Room alerts switch on Rooms, one row on Alerts, Maya's start no longer reaches Sam, then reaches him again | PASS |
| 5 | Profile "Don't notify me about Maya's rooms" → Muted people → "Notify me about…", then undone | PASS |
| 6 | Schedule → card with no reload; Start now alerts everyone; Remind me gets only "Starting now" | PASS |
| 7 | Store app: the native room screen has no Tell people; the hand-off carries `hasNotified: true` | PASS (needed a harness flag, see B4) |
| 8 | Quiet time: no push and no receipt; once removed, Maya's next start reaches Sam | PASS |
| 9 | `pnpm lint`, `pnpm typecheck`, `pnpm vitest run src/test/architecture src/modules/voice` | PASS |

### 1. One tap, "Sam's room"
- At 390: Rooms has 17 visible controls: Skip, header, menu, **Start a room**, **Schedule for later**, the
  **Room alerts** switch, **Quiet times**, room cards (Join / Remind me), the footer and the tab bar. Searching all
  controls for notify others / everyone / invite only / my followers / people I pick / tell people / follow /
  invite more / a search input / a Now-Schedule segment found nothing. Tapping Start a room went to
  `/rooms/79404164-…` in 120 ms. The H1 reads "Sam's room", the eyebrow "Live · Never recorded", and the page shows
  "You're in · on stage, muted". The room page has 16 controls (Rename, Leave, React, Chat, Unmute, End room, plus
  the page frame). None of the removed controls are there.
- At 1280: the same result (19 controls on Rooms, 16 on the room page). The room `a00c9b70-…` opened as "Sam's room".
- DB: `Sam's room | live | open`, and `voice_broadcast` holds `audience = everyone`.
- Screenshots: `1-rooms-390.png`, `1-room-page-390.png`, `1-rooms-1280.png`, `1-room-page-1280.png`.

### 2. Who got the alert
- Sam's first start (390): pushes went from 0 to 3, to **Maya, Priya and Ada** only: "Sam Lee started “Sam's room”",
  "Tap to listen.", `data.url = /rooms/<id>`, kind `voice_broadcast`. Nothing went to Sam, Marcus, Elena, Oliver
  or Lena. The second start (1280) gave the same three (3 → 6).
- `notification_log` for the first room: Ada, Maya and Priya were sent; Elena was skipped (`quiet_hours`), Lena
  (`muted`), Marcus (`kind_off`) and Oliver (`paused`).
- `voice_notify_receipt` for the room holds only Ada, Maya and Priya. The held-back members hold no receipt
  (the receipts fix works).

### 3. The 4th start is quiet
- Sam's starts in the last 24 h before the test: 3 (two one-tap starts, plus the scheduled room's Start now from
  check 6).
- A **single tap** (390) answered `{"isQuiet":true}`. The page opened `/rooms/42491046-…?quiet=1` and showed "People
  weren't alerted this time: 3 rooms a day alert everyone." once. The address then dropped `?quiet=1`. Pushes stayed
  at 9 → 9, and the room holds no receipts. After a reload the line was gone (count 0), and after Back as well.
  Screenshot: `3-quiet-line-single-390.png`.
- Seven more quiet starts later in the run (web and app) sent no pushes; the list stayed at 17.
- **Failure on a double tap:** the line never shows. See B1. Screenshots:
  `3-quiet-line-missing-after-double-tap-390.png` and `3-quiet-line-missing-after-double-tap-1280.png`.

### 4. Room alerts switch
- At 390 on Rooms: the switch read `aria-checked=true` "Room alerts on". One tap made it "Room alerts off" with the
  same URL and no reload (a window marker survived). The DB then held `off_kinds = {voice_room,voice_broadcast}`
  and `time_zone = UTC`.
- /me/alerts showed exactly **1** "Room alerts" row, switched off. The old rows ("…reminded of", "People starting…")
  are gone, and "What was sent and skipped" is linked.
- Maya's start #1 sent pushes to Priya, Ada and Lena, and **0 to Sam**. Sam holds no receipt, and his log shows
  `skipped kind_off`.
- One tap turned it back on (`off_kinds = {}`). Maya's start #3 (after check 8) reached Sam: one push "Maya Ortiz
  started “Maya's room”", one receipt, log `sent`.
- Maya's alerting starts: 1, 2, 3 (`voice_broadcast` count), all within her 3 a day.
- At 1280: off and on again with no reload; the DB matched.
- Screenshots: `4-rooms-alerts-off-390.png`, `4-alerts-room-row-off-390.png`, `4-rooms-alerts-off-1280.png`,
  `4-alerts-room-row-off-1280.png`.

### 5. Muting Maya's rooms from her profile
- At 390 and 1280, Sam opened People › Maya Ortiz. The profile has "Don't notify me about Maya's rooms" and no
  Follow. Tapping it changed the button to "Notify me about Maya's rooms", flashed "Their rooms won't alert you."
  and wrote a row to `notification_mute`. The state survived a reload.
- Alerts › Muted people (folded) read "Muted people (1) … Maya Ortiz · Unmute".
- Undoing worked both ways: from the profile at 390, and with Unmute in Alerts at 1280. The mute count went back to 0.
- Screenshots: `5-profile-390.png`, `5-profile-muted-390.png`, `5-alerts-muted-390.png`, `5-profile-1280.png`,
  `5-profile-muted-1280.png`, `5-alerts-muted-1280.png`.

### 6. Schedule for later
- At 390: Schedule stays disabled with an empty title or a title of spaces. A past time is refused:
  "Pick a time in the future, within the next two months." (`6-schedule-past-time-390.png`).
- Through the API: no title → 422 `voice_needs_title`; the old `access` and `notify` keys → 422 "Unrecognized keys".
- With a title and a future time, the card appeared under Coming up with no reload, and the form closed
  (`6-coming-up-card-390.png`). DB: `scheduled | notify_audience = everyone`. Scheduling added no `voice_broadcast`
  row.
- Maya (1280) tapped Remind me, which changed to "Reminder on". Sam tapped Start now. Pushes went from 6 to 9:
  **Maya "Starting now: Fundraising in a down market"** (voice_room, only that one), and Priya and Ada "Sam Lee
  started “Fundraising in a down market”". Nothing went to Sam or the held-back members.
- At 1280 the schedule form worked the same way and the card appeared with no reload (`6-coming-up-card-1280.png`).
- The host's Rename shows on a scheduled room (`6-scheduled-room-page-390.png`). A scheduled room renamed by Maya
  saved as "Seed round terms, explained" and stayed scheduled (`brk-scheduled-renamed-390.png`).

### 7. Store app web preview
- The preview at `/__app/` was exported with a broken base path: its HTML loads
  `C:/Program Files/Git/__app/_expo/...`, a Git Bash path rewrite. The harness rewrote that to `/__app/` in flight.
  The native room's LiveKit socket was also blocked by Chromium's Local Network Access check
  (`net::ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`), so Chromium ran with
  `--disable-features=LocalNetworkAccessChecks,…`. Neither change touches the app's code (B4).
- I joined the community at http://localhost:9757 and signed in as Sam in the iframe. Start a room handed off; the
  recorded bridge call was `OPENROOM ["2b98e054-…","Sam's room",{"hasNotified":true}]`. The native screen reached
  **Live**, with the controls Minimise, Leave, React, Unmute and End room. There is no Tell people.
  (`7-app-native-room-started-390.png`)
- Joining Maya's room: `OPENROOM ["054246de-…","Maya's room",{"hasNotified":true}]`. The screen was live with Leave,
  React and Raise hand, and no Tell people (`7-app-native-room-joined-390.png`).
- After Minimise, the portal shows the room page with the quiet line (this was a quiet start), "Playing in the app."
  and a mini bar (`7-app-after-minimise-390.png`).

### 8. Quiet time
- On /me/alerts, Custom → All day on, every day → Save. The DB held one quiet time (`all_day = t`, days 0–6, UTC),
  and Rooms showed "Quiet until Fri 19:08" (`8-quiet-time-set-390.png`, `8-rooms-quiet-link-390.png`, and see B3).
- Maya's start #2 sent pushes to Priya, Ada and Lena, and **0 to Sam**. `voice_notify_receipt` rows for Sam in that
  room: **0**. His log reads `skipped quiet_hours`.
- Removing the quiet time left 0 rows. Maya's start #3 sent **1 push to Sam**, and Sam holds 1 receipt for that room
  (`8-sam-opens-maya-room-390.png`).
- (Priya and Ada got nothing from start #3: they had reached their 5 room alerts for the day. That is the receiver
  cap working: 3 from Sam + 2 from Maya.)

### 9. Lint, types and tests
Run from the worktree with `NODE_ENV=test` and `TEST_DATABASE_URL=…/room_test`:
- `pnpm lint`: exit 0, 0 errors and 1 warning. The warning is in `deploy/cloudflare/worker.js:9`, which this change
  doesn't touch.
- `pnpm typecheck`: exit 0.
- `pnpm vitest run src/test/architecture src/modules/voice`: 7 files and **550 tests passed**, exit 0.

## Trying to break it
- Double tap on Start a room (Playwright `dblclick`) made **one** room; the 10-second repeat check works. But two
  POSTs went out (see B1).
- Rename with a blank title or spaces: Save is disabled, and the API answers 422 "Give the room a title.".
- Rename to 130 typed characters: the input stops at 120. 121 characters through the API → 422 "Too big". A
  101-character title wraps cleanly at both widths (`3-renamed-long-390.png`, `brk-long-title-room-1280.png`,
  `brk-rename-open-1280.png`).
- Rename by a non-host: Maya sees no Rename on Sam's room. Her API call → 403 "Only the host can do that.", and the
  title is unchanged.
- The removed routes `/api/voice/notify`, `follow`, `following`, `invite` and `people` all answer 404.
- With every alert off, Rooms says "All your alerts are off. Alerts" with no switch, and the link goes to
  `/me/alerts?from=rooms` (`brk-all-alerts-off-rooms-390.png`, `brk-all-alerts-off-rooms-1280.png`).
- Schedule with no title, or with a past time: refused, as covered in check 6.
- Maya opening Sam's room with `?quiet=1` sees no line, because it is shown to the host only.

## Broken or doubtful
- **B1. A double tap on "Start a room" loses the quiet-start line (real bug, low to medium).**
  Repro: as a member who already has 3 alerting starts in 24 h, open /rooms and double-tap "Start a room" (Playwright
  `dblclick`, or a fast double tap on a phone). Two `POST /api/voice/create` go out. The answers are
  `{"roomId":X,"isQuiet":true}` and then `{"roomId":X,"isQuiet":false}`: the second hits the 10-second repeat path in
  `createRoom`, which returns `isQuiet: false`. The page then navigates to `/rooms/X` without `?quiet=1`, so the host
  never learns the room was quiet. Also, `disabled={start.isPending}` does not stop the second click from sending a
  request.
  Fix ideas: have the repeat path report whether the room had alerted (it has no `voice_broadcast` row), or ignore
  clicks while a start is in flight (a ref guard).
- **B2. The quiet line can be faked by the address (cosmetic).** Sam opening one of his rooms that did alert, with
  `?quiet=1` typed by hand, still sees "People weren't alerted this time". The page trusts the mark without
  checking the room's `voice_broadcast` row. Only reachable by editing the address.
- **B3. "Quiet until Fri 19:08" for a quiet time that never ends (doubtful).** An all-day, every-day quiet time makes
  the Rooms link read "Quiet until Fri 19:08" when the time is Friday 19:08, which looks like "until now". It is
  `readQuietUntil` capping at a week. The words are new on Rooms in this change.
- **B4. The store app web preview is built with a broken base path (environment, not the change).** `/__app/` serves
  `<script src="C:/Program Files/Git/__app/_expo/...">`, so the preview loads nothing in a normal browser (Git Bash
  rewrote `/__app/` when the export ran). In current Chromium the native room's socket to `ws://localhost:9752` is
  also blocked by the Local Network Access check unless that feature is turned off. The page's own LiveRoom
  connects fine. Re-export the preview with `MSYS_NO_PATHCONV=1` or from PowerShell.
- **B5. Many identical "Sam's room" cards (doubtful UX).** Each one-tap start after the 10-second window makes
  another live "Sam's room" while the host's earlier ones are still live. After this run Live now listed six or
  more cards called "Sam's room", each "1 in" (`6-coming-up-card-1280.png`). Nothing stops a host from holding
  several live rooms at once, and their cards look alike.
- **B6. In the store app the host doesn't see the quiet line until they minimise** the native room screen
  (`7-app-after-minimise-390.png`). The note renders on the page behind it. Minor, but a host who never minimises
  never learns the room was quiet.
- Cosmetic: the "Rename" quiet button sits indented by about 13 px from the title's left edge (its own padding),
  at both widths (`1-room-page-390.png`, `1-room-page-1280.png`).
- Not a failure: the full-page screenshots (`6-schedule-past-time-390.png`, `6-coming-up-card-390.png`) show the
  fixed tab bar in the middle of the page. That is how full-page capture draws a fixed bar, not a layout bug. In the
  viewport shots the bar sits at the bottom and covers nothing that matters.
