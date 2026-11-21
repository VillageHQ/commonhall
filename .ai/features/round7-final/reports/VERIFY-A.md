# Verifier A: round 7's last fixes, on the demo copy

Demo copy, Node Playwright (Chromium), 390 px (touch, iPhone UA) and 1280 px. Every screenshot named below was read.
Note: `http://127.0.0.1:9571` refuses the one-click sign-in ("This request came from another site", 403 on
`/api/demo/sign-in`); the same copy works at `http://localhost:9571`, so every check ran there.

| # | Result | Proof | Screenshots |
|---|---|---|---|
| A1 | PASS | Pasted `name, email` / `Ann Test, …` / `this is not an email` / `Bo Test <…>`: "2 invited. 1 skipped: this is not an email: There's no email address on this line." The header was skipped quietly. With `this is not an email` as the first line it is still named. `name, email` on line 2 is named as well. A `Name,Email,Company` header is skipped. | A-1-header-skipped-1280, A-1-first-line-named-390, A-1-header-not-first-1280, A-1-csv-header-390 |
| A2 | FAIL | At 390 the send-it-yourself rows are broken. The new rule `.fh-sendself .fh-r>.fh-avatar{display:none}` sits in `@layer components`, and Tailwind's `.inline-flex` in `@layer utilities` beats it, so the mail mark still shows (measured `display:flex`, 28 px). That leaves 3 children in the new 2-column grid. Result: the mail mark overlaps the name and address, "Copy" wraps to a second line and is pushed off the left edge ("…py"), and the Li Wei row puts its name on the right. The long address is still cut with "…". 1280 is fine. The demo has mail on, so I stubbed the bulk-invite API's answer to `isEmailOn:false` with 3 links to render the real component. | A-2-sendself-page-390, A-2-sendself-rows-390, A-2-sendself-rows-1280 |
| A3 | PASS | Start a room opened `/rooms/6d366e82…`. After Back, Start a room again (1280) and again later on the phone (390) both opened the same id (`/api/voice/create` returned the same roomId), and only one "Sam's room" was listed. Scheduling "Verifier A test: later room" while live made a separate room (`f437b358…`, listed under Coming up). I ended both. | A-3-rooms-live-1280, A-3-room-second-1280, A-3-rooms-after-second-1280, A-3-room-phone-same-390, A-3-scheduled-separate-390 |
| A4 | FAIL | It works only on a fresh load or when tapping the Today tab. Sam opened the ask with Read (`POST /api/asks/seen` 200) and came back with the browser's Back: "Your ask · 1 answer / Read" was **still shown**, along with "Sam, 2 things wait for you". It disappeared only after a reload. After Maya answered, the line came back ("Your ask · 2 answers"). Opening it again and tapping the Today tab removed it. | A-4-today-before-390, A-4-ask-opened-390, A-4-today-after-back-390, A-4-today-after-open-390, A-4-today-back-after-new-answer-390, A-4-today-after-tab-tap-390 |
| A5 | PASS | After Introduce (Marcus to Rachel on the phone, and Maya to Alex at 1280), one status pill ("With Rachel" / "With Alex") sits by the title. Only "You answered on 21 Nov." sits above the Now ask box, with no second pill. | A-5-6-tabA-after-introduce-390, A-5-6-tabA-after-introduce-1280 |
| A6 | PASS | Tab A Introduce got 200 (`asking_target`). Tab B, not reloaded, then sent No thanks: 409 `intro_changed`, and B redrew as introduced ("With Rachel", Make a new link). A fresh load shows it introduced. As the asker (Maya, on the 1280 run) it shows "With Sam" and is not declined; the admin intro log lists both as "with target". | A-6-tabB-after-nothanks-390, A-6-tabB-after-nothanks-1280, A-6-fresh-load-390, A-6-as-asker-maya-390, A-12-intro-log-open-390 |
| A7 | PASS | I raised the allowance to 10 and posted 4 asks, which made 5 open. "Post a win instead" was posted ("Update posted."). A 6th ask got 409 "You already have 5 open asks. Close one, then post this." at 390 and 1280. From that refused state, "Post a win instead" still posted. Clean-up: I removed my 4 asks and 2 wins and set the allowance back to 5. | A-7-win-posted-390, A-7-sixth-ask-refused-390, A-7-sixth-ask-refused-1280, A-7-win-after-refusal-1280 |
| A8 | PASS | At 390x844, 390x667 and 1280x900, as Maya in the founder view (15 items) and as Sam, Sign out was fully inside the menu and the viewport at scrollTop 0, and it was the top element at its centre. The lists above scroll; at 390x667 the menu scrolled 240 px while Sign out stayed in place. | A-8-menu-Maya-today-390x844, A-8-menu-Maya-today-390x667(-scrolled), A-8-menu-Sam-today-390x844, A-8-menu-Sam-today-390x667(-scrolled), A-8-menu-Maya-today-1280x900, A-8-menu-Sam-today-1280x900 |
| A9 | PASS | The avatar menu and My profile both read "How you sign in", which opens `/me/password`. That page's card title is "How you sign in" and its tab title is "How you sign in · Northwind Founders". My profile shows a visible "Settings" heading (h2) over the list. | A-9-my-profile-settings-390, A-9-my-profile-settings-1280, A-9-sign-in-page-390, A-9-sign-in-page-1280 |
| A10 | PASS | Both demo users (Sam and Maya) are already connected, so the page shows the connected view. Its share row says "Intro asks to you are switched on Privacy", linking to `/me/privacy`. To see the not-connected consent, I stubbed `/api/network/status` to `needs_consent`. The small print then reads "…You can stop sharing any time; intro asks to you are switched on Privacy." and the link opened `/me/privacy` ("Privacy · Northwind Founders"). | A-10-consent-not-connected-390, A-10-consent-not-connected-1280, A-10-privacy-target-390, A-10-my-network-Sam-390 |
| A11 | PASS | As Sam I added "Verifier A Test Engineer" (Boston, no link). As Maya, Apply on Jobs and Apply on Sam's profile jobs card both opened `/messages/new?to=<Sam>&draft=…` with the box prefilled "I'd like to apply for Verifier A Test Engineer at Tallyhealth." (390 and 1280). After Maya messaged Sam, Apply opened the existing thread `/inbox/5582…?draft=…` with the same draft. I removed the job and deleted the test message. | A-11-our-jobs-added-1280, A-11-board-apply-390, A-11-board-apply-1280, A-11-board-message-1280, A-11-profile-apply-390, A-11-profile-apply-1280, A-11-profile-message-1280, A-11-existing-thread-draft-390 |
| A12 | PASS | Admin Home shows "1 intro waiting over 3 days", which links to `/admin/intros?f=open`. Tapping it lands on the Intro log with "Open 5" selected (`aria-current`). | A-12-admin-home-1280, A-12-intro-log-open-390, A-12-intro-log-open-1280 |
| A13 | PASS | For you showed 2. "I can help" on Lena's ask (`/api/asks/help` 200) dropped it: For you went to 1, with only Amara's ask left. "I can help" on Amara's ask at 1280 made For you show "Nothing for you right now." with no count. | A-13-for-you-before-390, A-13-after-i-can-help-390, A-13-for-you-after-390, A-13-for-you-after-1280 |
| A14 | PASS | "mentor" returns exactly Grace Kim, the only card with a Mentor badge in the directory ("1 match", header "Mentors and experts"). "Mentors" and "MENTOR grace" also return Grace. "expert" returns Ines Costa and Marcus Webb, and "advisor" returns Oliver Grant, which matches their badges. | A-14-people-mentor-390, A-14-people-mentor-1280 |

## Tried to break it
- **A1:** A pasted list that is only `this is not an email` gives "Paste at least one email address." The line is not named, but it isn't silent either. Blank lines and then an `Email` header were skipped as the header, as expected.
- **A1:** A line `Fi Test fi.test1@example.com` (name, a space, then the address, no comma) is answered "There's no email address on this line.", which is untrue. This was the same before this round.
- **A1:** `Di Test,di.test1@example.com,Acme` saved the name as "Di Test Acme" (the company joined onto the name).
- **A2:** A long address (56 characters) and a row with no name. At 1280 both cut with "…" but keep Copy. At 390 the layout breaks, as in the table.
- **A3:** Start, Back, Start again, then Start again from a phone-size window gave the same room each time. Schedule-while-live made a new room. End room works ("This room has ended."). I ended the scheduled room with `POST /api/voice/end`, since a scheduled room has no cancel on its page.
- **A4:** Browser Back after opening the ask keeps the stale "Read" line until reload (see the table). The Today tab and a reload are correct.
- **A6:** Tab B's refusal message ("This intro request just changed. Here's where it stands now.") never shows. The 409 sets the error, then `router.refresh()` redraws the page without the answer buttons, which unmounts the message. Someone who tapped No thanks sees the page flip to "With Rachel" with no word that their No didn't count. The intro itself is safe.
- **A7:** From the refused 6th ask, "Post a win instead" in the same box posts fine.
- **A8:** 390x667 is the tightest case, and Sign out holds there. The menu at 1280 for Sam is not scrollable and shows everything.
- **A11:** Apply on an existing conversation works. On the board, the no-link Apply's accessible name is just "Apply". On the profile it is "Apply for Verifier A Test Engineer at Tallyhealth (writes a message)", and the linked jobs on the board say "Apply for … (opens in a new tab)", so a screen reader user on the board hears only "Apply".
- **A13:** Checked both the phone path (navigate to For you) and 1280.

## Anything else visibly broken
- **The A2 layout bug on phones** (the most serious item here): overlapping mail mark, Copy pushed off-screen, rows misaligned. Fix it by moving the rule out of `@layer components`, or with `!important`, or by dropping the `inline-flex` utility on that span.
- `127.0.0.1:9571` can't sign in on the demo; only `localhost:9571` works. The brief's address doesn't work for sign-in.
- My profile at 390: the "Filled in from public profiles" card and the Settings card almost touch, about 2 px apart (A-9-my-profile-settings-390). Minor.

## What I changed on the demo and put back
- The 7 test invites were revoked (they stay listed as revoked).
- Rooms I started were ended.
- My test asks and wins were removed, and the allowance is back to 5.
- The job was removed and the test message deleted.
- Maya's test intro to "Alex Verifier" was withdrawn.

Left as is (the demo resets nightly):
- The Marcus to Rachel intro is now introduced.
- Maya's answer on Sam's VP Sales ask.
- Sam's "I can help" on Lena's and Amara's asks.
