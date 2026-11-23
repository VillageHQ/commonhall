# An empty room ends by itself: verification

Verifier: a separate agent, not the builder. Branch `absi-agent/empty-room` at 891f3164 (PR #133). Checked on
23 Nov 2026, 14:35–15:18 UTC, against a throwaway local copy with made-up demo people only (Sam Lee, member; Maya
Ortiz, admin). Pictures are 1x at 390×844. Scripts and logs: `.ai/tmp/verify-empty-room/` (not committed).

**Overall: PASS.** Every claim held in the browser and in the store app's web preview. A Leave stopped counting on
Rooms and Today within about 0.6–0.8 s. Rooms left empty by a Leave ended 62–119 s later (8 runs). A rejoin within
the minute kept the room. End room still ends the room at once. Two minor defects, neither from this change's Leave
path: (1) a room left empty with **no** Leave tap (tab closed) once took 174 s to end, because of how the minute
ticks line up; (2) the store app's own Rooms tab says "1 in" for up to 15 s after a Leave from the mini bar.

## How it ran
- Postgres 17 in my own container `empty-room-verify-pg` (127.0.0.1:9612), databases `community` (the app) and
  `community_test` (tests only). LiveKit `livekit/livekit-server:v1.13 --dev --bind 0.0.0.0 --node-ip 127.0.0.1` in
  `empty-room-verify-livekit` (7880, 7881, 7882/udp on 127.0.0.1, devkey/secret).
- `pnpm build`, then `next start -p 9725` with a gitignored `.env`: `DEMO_MODE=true`, `JOBS_SELF_TICK=true`,
  `PORT=9725`, `APP_URL=http://localhost:9726`, `LIVEKIT_URL=ws://127.0.0.1:7880` with the dev keys,
  `ROOMS_ON_BY_DEFAULT=true`. The job runner ran inside `next start` (the self-tick): `job_lease` showed
  `voice-rooms` running every minute at hh:mm:46.
- I built the store app's web export (`MSYS_NO_PATHCONV=1 EXPO_BASE_URL=/__app … npx expo export --platform web`) and
  served it with `mobile/scripts/web-preview.mjs` on 9726 (portal 9725). Everything, web included, went through
  http://localhost:9726.
- Playwright 1.65 driving Chromium headless with `--use-fake-device-for-media-stream --use-fake-ui-for-media-stream`.
  Each person ran in a separate browser context. Times come from the script clock and from `voice_room` (`empty_since`,
  `ended_at`).
- Setup step: Maya (admin) ended the demo's seeded live room with End room. Otherwise Today's Live now (it shows the
  busiest room only) and the Rooms tab's dot would always show the seeded room, and neither could be checked.
- Where the host's Leave is: for the host, the header word is **End room**, and Leave is in **More** (web and app).
  So "host taps Leave" below means More › Leave. A listener's Leave is the header word.

## Results

| # | Check | Result | Measured | Pictures |
|---|---|---|---|---|
| 1 | Host leaves alone (web) | PASS | Sam started "Sam's room". Maya's Rooms and Today both said "Sam is in", and the dot was on. Sam tapped More › Leave at 14:35:43 and was back on /rooms 38 ms later. His own Rooms card then said **"Nobody in yet"**. Maya's Rooms said "Nobody in yet" at +0.8 s and her Today at +1.5 s, never "1 in". `empty_since` was set at the leave (14:35:43.682). It stayed live through +56 s, and the 14:36:46 tick ended it: **gone at 62 s** (seen at +67 s). Rooms then had no card and no dot, Today had no Live now, and the room's URL said "Ended · Hosted by Sam Lee" with "This room has ended." | c1-01 … c1-09 |
| 2 | Back within the minute (web) | PASS | Sam left at 14:37:40 (`empty_since` set) and rejoined from his own card's Join at +21 s, which cleared `empty_since`. Every 30 s for **246 s** the room stayed live, Maya's card said "Sam is in", and Sam's room said "1 in the room". | c2-02, c2-03 |
| 3 | Not alone (web) | PASS | Maya hosted and Sam listened ("Maya + 1"). Maya tapped More › Leave. Her own Rooms page right after said **"Sam is in"**, from a fresh page as well, with no "2". Sam's room said "1 in the room · Nobody on stage yet" by +0.3 s in one run. In the other run his page still listed Maya about 1 s after, then caught up (c3-02). `empty_since` stayed empty while Sam was connected, so there was no 1-minute end. It ended by the 2-minute "nobody on stage" rule: stage empty marked at 14:38:46 (the first tick after the 30 s connect grace), **ended 14:41:46, 245 s after the leave**. Sam's room then said "This room has ended." | c3-04, c3-02, c3-03 |
| 4 | End room ends at once (web) | PASS | Sam's End room: `ended_at` 14:42:08.998, and his page said "This room has ended." within 25 ms. Maya's Rooms had no card at +0.85 s. | c4-01, c4-02 |
| 5a | App preview: Leave from the room sheet | PASS | Sam started a room in the app, and its sheet opened ("1 in the room"). Maya saw "Sam is in". More › Leave at 15:04:01. Maya's Rooms said "Nobody in yet" at +0.62 s and her Today at +1.26 s. The sheet closed (no stuck sheet, no closed view, no mini bar). The page under it said "You left the room." with Join again and Back to Rooms. **Ended at 106 s** (first run: 93 s). After the end, Maya had no card, no dot and no Live now. Join again on the left page then opened the app's sheet with "This room has ended." and "Back to the portal", and the page then said "This room has ended." No error was shown; the 409 from the join only reached the console. | c5-a-app-room-sheet, c5-a-app-more-panel, c5-a-maya-rooms-after-leave, c5-a-app-after-leave, c5-a-app-left-page-after-end, c5-a-app-join-again-after-end, c5-a-app-room-page-after-portal |
| 5b | App preview: Leave from the mini bar | PASS (see defect 2) | Sam minimised: the mini bar showed on the room page, and over the tab bar on Today. Mini bar ✕ (Leave) at 15:11:08. Maya's Rooms said "Nobody in yet" at +0.63 s and her Today at +1.28 s. The mini bar went away and nothing stayed stuck. **Ended at 99 s**, and a third run ended at 62 s. Afterwards the app's Rooms tab had no live room, and the tab's label was plain "Rooms" (no live mark). **But** the app's own Rooms tab, opened right after the Leave, still said "Sam's room · 1 in" at +1.4, +2.9 and +6.9 s. It said "Nobody in yet" by +16.9 s (defect 2). | c5-b-app-mini-bar-on-room-page, c5-b-app-mini-bar, c5-b-maya-rooms-after-leave, c5-b-app-after-leave, c5-c-app-rooms-while-in, c5-c-app-rooms-tab-after-mini-leave |
| 6a | Double-tap Leave | PASS | Listener (header Leave, double-clicked) and host (More › Leave, double-clicked): one leave request each, 200. Both landed on /rooms with no error. The card said "Nobody in yet", and the rooms ended at 70 s and 97 s. | b1-01, b1-02 |
| 6b | Leave, then Join again at once | PASS | Sam was back in 291 ms after Leave (`empty_since` cleared), and Maya saw "Sam is in". The room was still live 150 s later. Then End room ended it. | b2-01, b2-02 |
| 6c | Two tabs, same person | PASS | Tab 2 opened the room, and tab 1 said "You joined this room in another tab…". Tab 2 left: the card said "Nobody in yet" and the room **ended at 72 s**. Tab 1 kept its earlier "continues there" words (still true when shown). A second run had tab 1 in the room and tab 2 on Rooms. Tab 1 left, and tab 2's reload said "Nobody in yet". **Ended at 119 s.** | b3-01 |
| 6d | Reload in the middle of Leave | PASS | I reloaded the room page the moment the leave request left the browser. The page loaded back into the room ("1 in the room", End room), and Maya saw "Sam is in". `empty_since` stayed empty, and the room was still live 90 s later. Either the leave never landed, or the rejoin cleared it: both are fine. | b4-01, b4-02 |
| 6e | Host closes the tab (no Leave) | PASS with defect 1 | Run A: Maya's card said "Nobody in yet" 0.6 s after the close. The 14:58:46 tick set `empty_since` and the 14:59:46 tick ended it, **75 s** after the close. Run B (a browser that closed on its own): about 83 s. Run C (browser closed about 15:07:53): `empty_since` 15:08:46.401, **not** ended by the 15:09:46 tick, ended 15:10:46.401, **about 174 s** after the last person went (defect 1). | (times only) |
| 6f | Co-host takes over (unchanged rule) | PASS | Maya made Sam co-host, then tapped More › Leave. Sam became host at once, and the card said "Sam is in" under host "Sam Lee". The room was still live 133 s later, and Sam's End room ended it. | u-01 |
| 6g | Seeded demo room left alone | PASS (partial) | The seeded room had nobody connected from boot (14:31) until I ended it at 14:35:37. The voice-rooms tick ran over it at 14:34:46 and left `empty_since` empty. I saw only one tick, because I ended the room to check Today. | — |
| 7 | `pnpm vitest run src/modules/voice` | PASS | `NODE_ENV` unset, `TEST_DATABASE_URL` = the throwaway `community_test`. **3 files, 35 tests passed**, including both new tests: "stops counting a member the moment they leave, and ends a room a minute after nobody is connected" and "keeps an empty room going when someone comes back within the minute, and never ends one while LiveKit is unreachable". The tests wrote to `community_test` (checked). | — |

Leave → gone, every run where the last person tapped Leave: 62, 70, 72, 93, 97, 99, 106, 119 s (all within 1–2 min).

## Defects

1. **A room emptied without a Leave can take about 3 minutes, not 1–2 (minor).**
   - Steps: start a room as Sam on the web, then close the browser tab (or let the app die) without Leave. Read
     `voice_room` once a minute.
   - Expected (SPEC: "ends one to two minutes after the last person goes"): the room ends within about 2 minutes.
   - Seen: in one of three runs, `empty_since` = 15:08:46.401 and the 15:09:46 tick did not end the room. The
     15:10:46.401 tick did, about 174 s after the person went. In the other runs it took 75 s and about 83 s.
   - Likely cause: the self-tick runs every 60 000 ms, so a tick can come a few ms short of a full minute after the
     tick that first saw the room empty. `now - emptySince >= emptyRoomMs` is then false by a hair, and the room waits a
     whole extra tick. The same thing made the 2-minute stage rule take 3 minutes in check 3 (stage empty 14:38:46.19,
     ended 14:41:46). Rooms left with Leave are not affected: `empty_since` is the leave time, and the first tick a
     minute or more later ends them.
   - A fix could allow a few seconds of slack in both comparisons, or compare against `emptyRoomMs` minus the tick's
     jitter.
2. **The store app's own Rooms tab says "1 in" for up to 15 s after a Leave from the mini bar (minor; client).**
   - Steps (app preview): start a room, Minimise, go back to Rooms (your card says "1 in", c5-c-app-rooms-while-in),
     go to Today, tap ✕ on the mini bar, then tap the Rooms tab.
   - Expected: your own card no longer counts you (check 1's "A's own Rooms page must not say '1 in'").
   - Seen: "Sam's room · 1 in" at +1.4, +2.9 and +6.9 s, and "Nobody in yet" by +16.9 s. A reload shows "Nobody in
     yet" at once, so the server is right.
   - Likely cause: the app keeps each tab's page alive. The Rooms board only polls every 15 s (`ROOMS_POLL_MS`) and
     does not refetch when the app reports the room closed. On the web, Leave navigates to /rooms, which refetches, so
     the web is fine. This is outside the charter's "server side only" scope.

## Noticed, not from this change
- While you are the only one in your own room, your own card reads "1 in" with no face, because the viewer's face is
  left out (c5-c-app-rooms-while-in).
- A room card with nobody in shows the host's face beside "Nobody in yet" on Rooms, but no face on Today (c1-05,
  c1-06).
- After the room ends, the app's "You left the room." page keeps offering Join again. Tapping it shows "This room has
  ended." (5a). The page doesn't learn of the end by itself.
- After the co-host takeover, Sam's banner read "Sam Lee brought you on stage", which is his own name (u-01).

## Not run
- A real phone (iOS/Android store build): only the web preview was run.
- A LiveKit outage in the browser: covered only by the unit test (passes).
- The seeded-room guard over many ticks: I saw one tick before I ended the seeded room on purpose.
- The full `pnpm test`, lint, typecheck and build checks: I only built the app (`pnpm build` succeeded) and ran the
  voice tests.

## Cleanup
I stopped the app (`next start` on 9725) and the preview server (9726), and closed every browser. I removed both of
my containers with `docker rm -f empty-room-verify-pg empty-room-verify-livekit`. I deleted the throwaway `.env`. The
other containers (commonhall-team-pg, community-demo-pg, community-preview-pg, empty-room-test-pg) were not touched.
Gitignored build output (`.next/`, `mobile/dist-web/`, `mobile/node_modules/`) is left in the worktree. No tracked
file changed. This report and its pictures are new and uncommitted.
