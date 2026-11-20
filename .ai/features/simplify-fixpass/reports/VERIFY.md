# Verify: round-6 fix pass (independent check, 2026-11-20)

Checked in the built app (`next start` on port 3481, database `app`, demo mode, Sam Lee = member, Maya Ortiz = admin),
with headless Chromium. Every server was stopped at the end. Scripts and raw notes: `.ai/tmp/verify/` (`plan1.json` run
through `.ai/tmp/check.mjs`, then `run2.mjs`; notes in `r2/notes.txt`). Screenshots: `reports/verify/`.

| # | Fix | Result | Proof | Note |
|---|-----|--------|-------|------|
| 1 | Until tomorrow before 08:00 | PASS | `verify/01-alerts-newyork.png`, `verify/01-alerts-berlin.png` | Sam had no saved settings. New York at 05:03 local: `pausedUntil` 2026-11-20T13:00Z (08:00 that morning), the card says "Paused until 08:00". Berlin at 11:03: 2026-11-21T07:00Z, the card says "Paused until tomorrow 08:00". |
| 2 | Rooms hydration | PASS | `verify/02-rooms-honolulu.png`, `verify/02-room-tokyo.png` | /rooms and /rooms/<Coming up room> in Pacific/Honolulu en-US and Asia/Tokyo ja-JP: no console errors at all. The room starts at 12:00Z: shown as "Sat 2:00 AM" / "Starts Sat, Nov 21, 2:00 AM" (Honolulu) and "21:00 (土)" / "Starts 11月21日(土) 21:00" (Tokyo). |
| 3 | Alerts row on My profile | PASS | `verify/03-me-390-paused.png`, `verify/03-me-1280-on.png` | The row is there at 390 and 1280 and opens /me/alerts. It reads On, then Paused after a pause, then On again after Resume. |
| 4 | Alert log says "Allowed" | PASS | `verify/04-alertlog-390.png` | Maya sent Sam a message through the API. The log row reads "Message from Maya Ortiz … Allowed". The word "Sent" no longer appears. |
| 5 | Live now = busiest of all live rooms | PASS | `verify/05-rooms-1280.png`, `verify/06-rooms-390.png` | Added 8 newer live rooms with only their host: 7 by direct insert (Amara…Julia), 1 through the create and join API as Maya. Today still shows "Pricing your first enterprise deal · Priya + 4". Rooms lists it first; once Sam joined Amara's room, that room moved up to 2nd ("Amara + 1"). |
| 6 | You are left out of the faces | PASS | `verify/06-today-390.png`, `verify/06-rooms-390.png` | Sam joined through the join API, and his join time was moved ahead of the listeners, so he would be the 3rd face. Today and Rooms show the faces PS, AO, MW, ER with "Priya + 5". The count includes Sam. No "Sam Lee" name, "SL" initials or Sam picture URL appears in the page. |
| 7 | /jobs on a phone | PASS | `verify/07-jobs-390.png` | No tab is lit in the bottom bar and there is no footer. The page text has no Rooms or Library links. |
| 8 | Admin highlight | PASS | `verify/08-calls-1280.png`, `verify/08-intros-390.png`, `verify/08-report-390.png`, `verify/08-features-390.png` | All 11 pages were checked at 1280 and 390 (aria-current in the DOM, plus the screenshots). invites, import, links and calls → Members. intros → Asks & intros (Asks on a phone). digest → Announce. health (redirects to /admin/report) and report → Report (Home on a phone). mail, features and rooms → Set up. |
| 9 | Mail page | PASS | `verify/09-mail-390.png`, `verify/09-mail-1280-advanced.png`, `verify/09-mail-checked-1280.png` | Before a check, only "1 mail check needs you" (the webhook) and Check DNS now are in view. Advanced holds "Every mail check", DNS settings and the rest. After Check DNS now, the 4 failing records show in view with what to add, and the passing ones stay folded. |
| 10 | Cut-offs | PASS | `verify/10-admin-members-390.png`, `verify/10-admin-intros-1280.png` | All five tabs show whole, wrapped onto two lines. In the State column, "no answer from connector" wraps onto two lines and nothing ends in "…". |
| 11 | Landing page and tour words | PASS | (source) | `site/index.html` has no "available to talk". The `tour/src/screens.tsx` Rooms header is just `<PageHeader title="Rooms" />`. |
| 12 | Today and Rooms agree | PASS | `verify/12-today-390.png`, `verify/12-rooms-390.png` | Both said "Priya + 4" on a fresh look. After Sam joined, both said "Priya + 5". |
| 13 | asks-commonhall test | PASS | (terminal) | 3 runs, 9/9 passed each time. |
| 14 | Docs | PASS | (source) | `ROOMS_ON_BY_DEFAULT` is in `.env.example` line 39, the README settings table line 274 and `docs/self-host-vps.md` line 214. CLAUDE.md links `.ai/features/room-join-notify/NOTES.md`. |
| 15 | "the directory" → People | PASS | `verify/15-privacy-390.png`, `verify/15-me-hidden-390.png`, `verify/15-intro-expired-390.png` | /me/privacy: "Show me in People to". With Sam hidden, /me shows "Hidden from People". The welcome form reads "Show me in People to" / "You can still use People", and the flash reads "These are the people here". Sam's intro, set to expired for a moment: "Find another way in: People." links to /people. |

## Other problems found
- None that break a screen. No 500s, no console errors and no overlaps on any page visited (35 page views in run 1, about 20 in run 2).
- Small things to look at, not failures:
  - On /rooms, the bell button has a border on cards whose host Sam follows and no border on the others. This looks intentional (follow on or off).
  - On a phone, the intro page lights the Inbox tab.
  - The Today and Rooms cards show at most 4 faces, even with 5 others in the room. Consistent on both screens.
  - /admin/report at 390 has no page title above the period tabs.
- Not tested: a room where the only person in is the viewer. The code would show "1 in" with no face.

## Not checked (and why)
- The tour build and `site/` screenshots: the brief says the tour build happens later. I only checked the source.
- The welcome privacy step on screen: Sam has already finished welcome. I checked the source (`privacy-form.tsx`, `welcome-steps.ts`) instead.
- A real declined or expired intro for Sam: the demo has none. I set Sam's own completed intro to `expired` in the database for one page view, then set it back.

## State left behind
Put back: the test rooms and Sam's room seats were deleted, Sam's alert settings row was deleted, the intro state was put
back, Sam was shown again under Privacy, and the saved DNS check result was removed. Left in place: Maya's test
message to Sam ("Verifier check: are you free Thursday?") and its alert-log row. The demo resets every night.
