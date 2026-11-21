# Verifier B: round 7's last fixes, on the plain copy (http://localhost:9576)

Real Chromium through Node Playwright, at 390 px (touch, isMobile) and 1280 px. Made-up people only: admin Avery
Testadmin (avery.admin@example.com), founders Jordan, Riley and Casey Testfounder (@example.com). I read every
screenshot I kept.

| # | Result | Proof | Screenshots |
|---|---|---|---|
| B1 | PASS | Three refusals at each width: a wrong token ("The setup token is wrong."), a community name of spaces ("Enter your community's name.") and a name of spaces ("Enter a name."). Every time all five fields came back as typed, the 40-character token included, and the focus went to the field the error names (token / communityName / name). Then setup finished as "Northwind Founders" and opened /admin/start. | B-1-wrong-token-1280/390, B-1-blank-community-1280/390, B-1-blank-name-1280/390 |
| B2 | PASS | Invite emails to Jordan, Riley and Casey (in the mailbox) say "see who in Northwind Founders' circle can help you". Admin › Invites › "The email they get" says the same at both widths. Neither says "can introduce you". Casey joined by the link without its emailed mark, so Casey waits to be confirmed. The note under "Waiting for your OK", the "Yes, this is them" dialog, the member page's Email note ("…isn't confirmed.") and its "Confirm their email" dialog never mention network search. | B-2-mailbox-invite-1280/390, B-2-invite-preview-1280/390, B-2-waiting-ok-1280/390, B-2-confirm-dialog-waiting-1280/390, B-2-confirm-dialog-member-1280/390 |
| B3 | PASS | Jordan asked Riley at 1280 for an intro to "Dana Whitfield", and Riley asked Jordan at 390 for one to "Morgan Lee". Each connector email lists exactly two answers, "Yes, introduce them: …?a=yes" and "No thanks: …?a=not_now". The page the link opens has the same two radios at both widths. `?a=yes` preselects Yes, and an old `?a=dont_know` opens on No thanks. The connector's intro page in the app shows Introduce and No thanks. | B-3-ask-form-1280/390, B-3-asked-1280/390, B-3-link-page-1280/390, B-3-link-page-dontknow-1280/390, B-3-app-intro-connector-1280/390 |
| B4 | PASS | Store app preview at 390: the admin's room screen shows "Rename" under the title. Renaming to "Clinic payouts chat" changed the room screen, the page under it (/rooms/<id>) and the mini bar after Minimise. Founder Jordan also hosted a room and renamed it to "Clinic ops Q&A". Listeners (Jordan in Avery's room, Riley in Jordan's) had no Rename on the room screen or the page under it. | B-4-room-screen-host-390, B-4-rename-form-390, B-4-renamed-room-screen-390, B-4-minimised-page-minibar-390, B-4-founder-host-renamed-390, B-4-listener-no-rename-390, B-4-listener-page-under-390 |
| B5 | PASS | Avery started 4 rooms in the app, ending each one before the next. Starts 1–3 alerted (3 `voice_broadcast` rows in the database) and showed no quiet line. Start 4 showed "People weren't alerted this time: 3 rooms a day alert everyone." on the app's room screen and on the page under it. Every room I started is ended (no live rooms left). | B-5-start2-room-screen-390, B-5-start3-room-screen-390, B-5-start4-quiet-room-screen-390, B-5-start4-quiet-page-under-390 |
| B6 | PASS | Store app preview at 390×844, as admin and as founder: "Sign out" is in view at the menu's foot (y 786–830 of 844), and nothing covers it. The "This app" group shows (founder: Reload, Open in the browser, Switch community all in view). At 390×667, Sign out stays pinned, and after scrolling the list every "This app" item can be reached and tapped. | B-6-avatar-menu-admin-390x844, B-6-avatar-menu-founder-390x844, B-6-avatar-menu-admin-390x667, B-6-avatar-menu-admin-390x667-scrolled |

## Tried to break it
- **B1:**
  - A refusal from the server for each kind of field, not only the token: spaces pass the browser's `required` but the server trims them.
  - Each time the values came back and the focus moved to the right field.
  - After setup, /setup says "Setup is complete", and a second POST to /api/setup answers 409.
- **B2:** I made an unconfirmed member (Casey, the invite link opened without `&e=`) so the confirm wording would show at all. It shows in both places and never mentions search.
- **B3:**
  - A stale tab, test 1: Jordan's app page was open; I answered Yes on the email link page with Morgan's address, then tapped No thanks in the stale tab. The API answered 409, and the page redrew as "With Morgan… Now ask Morgan"; the yes held.
  - On my first try I tapped Yes on the link page without Dana's email. The page refused to send ("Add Dana's email, so we can ask them."), so the No thanks in the stale tab then went through, as it should. That intro (Jordan ↔ Dana) is now declined.
  - An old `?a=dont_know` link opens on No thanks.
- **B4:**
  - A title of spaces: Save is disabled.
  - 130 characters: the input stops at 120, and the title wraps without overflowing.
  - "Founders' Friday 🎙️ AMA" shows the same on the room screen, the page and the mini bar.
- **B5:**
  - Tapping Start again while the quiet room was live reopened the same room, not a second one (one live room in the database), and showed the quiet line again. That matches the code's "a second tap answers as the first did".
  - A rename clears the line from the room screen.
- **B6:**
  - A shorter phone (390×667): Sign out stays in view, and with the list scrolled to its end, "This app", Reload, Open in the browser, Switch community and Admin console all respond to taps.

## Anything else visibly broken, or worth knowing
1. **Problem with the test setup:** the store app's web preview build is broken as served. `mobile/dist-web` was exported from Git Bash without `MSYS_NO_PATHCONV=1`, so `index.html` and the JS bundle point at `C:/Program Files/Git/__app/...`. /__app/ opens blank ("Not allowed to load local resource"). I rewrote that prefix to `/__app` in my own browser only (a Playwright route) and changed nothing on disk. `mobile/README.md` already warns about this.
2. **Problem with the test setup:** headless Chromium blocks the LiveKit websocket on localhost:17880 (`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`). Without a launch flag, the room screen only shows "We couldn't reach the room's audio server", with no Rename (B-4-audio-blocked-390). With `--disable-features=LocalNetworkAccessChecks`, rooms connect.
3. **The alert limit is per host, not per community.** The code and room-start-instant NOTES count 3 alerting starts per host each day; the brief says 3 per community. After Avery's 3, Jordan's start still alerted, with no quiet line. I tested the quiet line on the host's 4th start.
4. **Admin, 390×844:** the pinned foot (Admin console, Dark mode, Sign out) cuts the "This app" group after Reload. "Open in the browser" and "Switch community" need a scroll, and nothing shows the list scrolls: the cut falls on a divider, so the group looks complete (B-6-avatar-menu-admin-390x844). At 390×667 the "More" heading sits right above the pinned "Admin console", so Admin console looks like it belongs to More.
5. **With Village not connected,** a member's profile still has a "Who Riley can introduce you to" card saying "Riley hasn't shared a network yet" (`people/[memberId]/page.tsx`, shown whenever the Network module is on). The admin's member page also says "Village: Not shared. They haven't agreed to share their network." Neither can change on a copy without Village.
6. **The preview mailbox** (`/__preview/mailbox`) has no viewport tag, so it renders tiny at 390. It's a dev tool only.

Put back: Rooms (Admin › Features) was off when I started; I turned it on for B4/B5 and off again. Every room I started is ended.
