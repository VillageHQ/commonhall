# Verify: onboarding-settings-fold (commit 5188a33)

**Verdict: PASS**, with two small findings and one note. None of them blocks the merge.

How I tested: I ran the built app (the build has the commit's code; no file under `src` is newer than the build) on
127.0.0.1:9512 with the throwaway database `ob_settings`, no RESEND_* variables and no Village keys. I drove it with
Playwright as dana@example.com using `.ai/tmp/verify.mjs` and `.ai/tmp/verify2.mjs`. The raw log is
`.ai/tmp/verify-log.json`. At the end I put back every value I changed: name, colour, region, contact, logo URL,
plan, DKIM selector, daily limit, and the uploaded logo file.

## What passed
1. **Load at 390 px and 1280 px:** Advanced is closed on all three pages. No page scrolls sideways. In view matches
   the SPEC:
   - Settings: name, logo file, colour, preview and Save.
   - Mail: the status line with Send a test, and the DNS checklist with Check DNS now.
   - Village: Connection and the meters.

   Screenshots: `closed-*-{phone,desktop}.jpg`.
2. **Opening and closing:** a mouse click opens and closes Advanced. Tab reaches the summary (`kbd-focus-summary.jpg`
   shows a clear focus ring), and both Enter and Space toggle it.
3. **Settings saves:**
   - The in-view Save keeps the name and colour after a reload (`settings-after-save-name-colour.jpg`).
   - The Advanced Save keeps the Region after a reload.
   - A bad data-protection email: I closed Advanced and clicked the in-view Save. Advanced opened, showing "Use an
     email address like privacy@fund.example." It opens again on a second failed save after I close it.
   - A bad Logo URL (`javascript:…`) also opens Advanced and shows its error.
   - A bad colour (in view) does *not* open Advanced, which is correct.
   - Uploading a 128 px PNG works: the preview and sidebar show it, and "Remove the logo file" appears
     (`settings-logo-uploaded.jpg`).
4. **Links with #:**
   - `/admin/settings#mail`, `#hosting` and `#look` open Advanced and put the section at the top (88 px down).
   - `#plan` opens Advanced and scrolls as far as the page allows; the section is near the bottom.
   - Changing the # on the same page also opens it.
   - The Mail page's "Settings › Advanced" link lands on Settings with Advanced open and the Mail section at the top
     (`mail-link-lands-settings-mail.jpg`).
5. **Mail:**
   - Status line: "Mail service: not set, sending from hello@example.com…".
   - Send a test to me answers "Email is off. Add your Resend settings on your host first."
   - Check DNS now answers "No sending domain yet. Set one in Settings, or add your Resend settings on your host."
     The server returns 409 here, which is expected.
   - The DKIM selector saves under Advanced and is kept after a reload.
   - With the plan set to Managed, the status line reads "✓ Handled by Village — invites send from hello@example.com"
     (`mail-managed.jpg`). It goes back to the self-host line when the plan is switched back.
6. **Village:**
   - In view: Running it yourself, Connection, Lookups this month, Members who connected.
   - Under Advanced: Limits and switches, Profile fill-in, What Village sees, What this costs.
   - The Limits Save works: the daily limit went from 50 to 51, was kept after a reload, then was put back
     (`village-advanced-open.jpg`).
7. **Dark mode** (emulated `prefers-color-scheme: dark`): the fold, its hover state and the open state look right at
   both widths (`dark-*.jpg`).

## Findings
1. **(Minor UX) A failed save opens Advanced, but the error stays off screen.** The save handler calls
   `window.scrollTo({top:0})`, so the page jumps to the "Some settings need a fix." note. The error line sits about
   2,000 px further down, and the note does not say which field is wrong.

   Steps: on /admin/settings, open Advanced, set the Data-protection contact to "not-an-email", close Advanced, then
   click the top "Save settings". The organizer has to scroll down and find the field. See
   `settings-failed-save-viewport.jpg` and, after scrolling, `settings-failed-save-error.jpg`.

   Suggestion: scroll to the first field with an error and focus it instead of going to the top. The old long form
   already behaved this way, so this is not a regression; folding the fields just makes the gap larger.
2. **(Nit) `/admin/settings#advanced` does not open the fold.** It scrolls to the closed summary, because
   `openForHash` skips the case where the target is the `<details>` itself. Nothing in the code links to `#advanced`
   today.

## Note (not a defect in this change)
- **"Running it yourself" on the Village page.** When no Village key is set, this box stays in view on Village, above
  Connection. It was already there before this change, but the SPEC lists only Connection and the meters as in view
  on Village, and on Mail the same box moved under Advanced. Worth a decision.

## Could not test
- **Sending real mail:** there is no mail service and none is allowed here.
- **A connected Village:** there are no keys, so this does not check how Connection looks once a key is set.
- **Screen readers:** I checked keyboard use only.
- **The chevron in two full-page shots** (`mail-advanced-open.jpg`, `dark-*-open-*.jpg`) looks half-turned. Those shots
  were taken while the 0.15 s turn was still running. Once it finishes it is a correct down chevron
  (`chevron-open-settled.png`, computed rotation 90°).

## Round 2: re-check of commit 0d0e1d1
**Overall: PASS on both points.** I re-checked against the rebuilt app; no file under `src` is newer than the build.
The script is `.ai/tmp/verify3.mjs`; it starts and stops the server itself. I checked at 390 px and 1280 px, read
every screenshot, and put back what I changed: the colour is `#111110` and the contact is empty again.

1. **A failed save lands on the wrong field: PASS.**
   - **Error inside Advanced:** I set the data-protection contact to "not-an-email", closed Advanced, then clicked
     the top "Save settings". Advanced opens, the page scrolls to the field and focuses it, and the field and its
     error line are both on screen. On a phone they sit above the bottom navigation bar.
     `round2-advanced-error-{phone,desktop}.jpg`
   - **Bad colour (in view):** I typed "zzz" and saved from the bottom of the page. The page lands on the colour
     field, focused, with "Use a colour like #24525A." on screen, and Advanced stays closed.
     `round2-colour-error-{phone,desktop}.jpg`
   - **Good save:** it scrolls to the top (scrollY 0) and shows "Settings saved." `round2-good-save-{phone,desktop}.jpg`
   - **Small note:** after a failed save, the "Some settings need a fix." message is at the top of the page, which is
     now scrolled away. The field and its error are what the organizer sees, which is fine.
2. **`/admin/settings#advanced` opens the fold: PASS.** Advanced opens and its header sits 88 px from the top at both
   widths. `round2-hash-advanced-{phone,desktop}.jpg`
   - `#mail` still opens it and scrolls there.
   - A plain load of /admin/settings still starts with Advanced closed.
