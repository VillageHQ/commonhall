# Proof: notify-schedule (round 6, part 4)

Taken 20 Nov 2026 by a separate verifier on the built app (demo mode, a throwaway database, made-up people), Chromium at
390px unless named 1280. All seven acceptance criteria passed; the re-check after three fixes passed too.

| File | Shows |
|---|---|
| c1-01-alerts-390-initial.png | The Alerts page's first view at 390px: This device, Pause, Quiet times (criterion 7; 75 words) |
| c1-03-rooms-390-bell-quiet.png | The bell on Rooms: "Quiet until …" (criterion 6) |
| c1-05-alert-log-390.png | Working hours on: the room alert skipped (quiet hours), the intro ask sent (criterion 1) |
| c2-02-alert-log-390.png | Let through off: both skipped (criterion 2) |
| c3-03-fourth-refused-390.png | A fourth quiet time refused with one line (criterion 3, before the fix that hides the buttons at 3) |
| w390-04-three-quiet-times-full.png | After the fix: at 3 quiet times, the one line instead of the buttons |
| c4-01-paused-1h-390.png, c4-02-log-paused-390.png | Pause 1 hour: "Paused until …", every alert skipped (criterion 4) |
| c5-alerts-after-migration-390.png | An old quiet window (22:30–06:45, Mon–Fri, Berlin) shown as the first quiet time after the real migration (criterion 5) |
| w390-01-utc-chosen-after-reload.png | A chosen UTC zone sticks after a reload (the re-check of the one real bug) |
| b1280-06-final-full.png | The page at 1280px |

Words (study/capture.mjs, demo data): /me/alerts 75 at 390px, 68 at 1280px (before: 147 / 154). /rooms 98 / 91 with the bell (before: 96).
