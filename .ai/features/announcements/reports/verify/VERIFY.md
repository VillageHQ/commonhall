# Announcements: independent verification

Verifier: Claude (did not write the feature). Date: 2026-11-18. Test copy: http://localhost:9702, DB container
`cb-announcements-pg`, fake mail inbox `.ai/tmp/mail/inbox.jsonl`. Driven with real clicks (playwright-core, Chromium),
scripts in `.ai/tmp/verify/`. Branch head: 28d20a4.

## Verdict per acceptance criterion

| # | Criterion | Result |
|---|-----------|--------|
| 1 | Fill-in fields replaced per member; no raw `{...}` | PASS (with two edge leaks, see P2) |
| 2 | Only members who did not unsubscribe get it; one-click unsubscribe; count = queued | PASS |
| 3 | Through the outbox in the send's transaction, sent once | PASS |
| 4 | Only admins can open or send | PASS |
| 5 | Feed shows a pinned post from the team | PASS |
| 6 | Empty audience cannot be sent; page says why | PASS |
| 7 | Audit log entry | PASS |
| - | Entry point: Asks & digest › chip "Announcements" | FAIL (P1) |

### Evidence

1. **Fields.** Cohort send "Fund III dinner, {first name} from {company}" with a message that had `{first name}`,
   `{full name}`, `{company}`, `{Community}`, `{nickname}`, `{}`, `{ }`. Emails: "Fund III dinner, Tomas from Paperplane",
   "... Zara from Clearpath Legal", and for Sam (company cleared on his profile) "Fund III dinner, Sam from your company".
   `{nickname}`, `{}`, `{ }` were dropped; the page warned "Not a field we know: {nickname}, {}, { }. It will be left
   out." `{Community}` (other case) became "Northwind Founders". In the feed post the name fields read "everyone"
   ("Hi everyone,", "Demo day is on 4 December, everyone"). The missing-first-name → "there" case could not be set up
   live (see "Not tested"). Screenshot `2-cohort-preview.png`.
2. **Opt-outs and unsubscribe.** Ada and Julia unsubscribed with a one-click `POST` to the URL in their
   `List-Unsubscribe` header (200 `{"unsubscribed":true}`, rows in `email_opt_out` topic `announcements`). Sam and Maya
   turned "Announcements from the team" off at /me/email (`4-me-email-sam.png`). The page then said "16 members will get
   the email (4 turned announcements off)"; the everyone send queued 16, and the inbox got exactly 16 distinct
   recipients, none of ada/julia/sam/maya. Earlier the cohort (8 in Fund III, Ada off) said 7 and 7 arrived. Every
   delivered announcement carries `List-Unsubscribe: <…/api/email/unsubscribe?token=…>`,
   `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, and a "Stop announcement emails: http://localhost:9702/unsubscribe?token=…" line.
3. **Once only.** Double-click on "Yes, send": 2 requests with the same send key, one `announcement` row, 7 outbox rows,
   7 emails. Triple-click on the everyone confirm: 1 request. Replaying the captured send body via the API: 200
   `isRepeat:true`, nothing new. Six concurrent identical API requests: 1 `isRepeat:false` + 5 `isRepeat:true`, one row,
   3 outbox rows. A send that failed (P3) left no announcement row and 0 outbox rows (transaction rolled back). Outbox
   totals: 43 `announcement` rows sent = 20 + 7 + 16 (+3 race test pending/sent), no duplicates.
4. **Admins only.** As sam: GET /admin/announcements → 404 "That page isn't here". POST /api/admin/announcements/send
   and /test with sam's cookies and a trusted Origin → 403 `{"code":"forbidden","message":"Only an admin can do this."}`;
   nothing queued.
5. **Feed.** As sam at /feed: the everyone announcement is on top, "Pinned by Maya Ortiz", label "From the team" with
   the megaphone, subject as heading (`8-feed-pinned.png`). `<script>alert('feed')</script>` shows as text; no dialog fired.
   The cohort send made no post (`post` type `announcement` count stayed at the everyone sends only).
6. **Empty audience.** With Julia and Maya opted out, cohort "Northwind team (2 members)": "Everyone in this audience
   turned announcement emails off, so it can't be sent." and the button "Send to 0 members" is disabled
   (`5-empty-audience.png`). Via the API: that cohort → 422 "Everyone in the Northwind team cohort turned announcement
   emails off…"; a cohort "Nobody here" → 422 "Nobody is in the Nobody here cohort yet…".
7. **Audit.** /admin/audit lists "Sent an announcement · “Fund III dinner, {first name} from {company}” to the Fund III
   cohort: 7 emails" and "… to everyone: 16 emails, pinned in the feed" (`9-audit.png`).

Also checked and fine: cohort names differing only in case (Sam's cohort set to "FUND III" was counted in "Fund III
(8 members)" and got the email; an API send to `"fund i"` reached the 3 Fund I members); HTML in the message is escaped
in the email html (`&lt;script&gt;…`) and shown as text in the preview and feed; subject capped at 100 in the input and
422 "Keep a subject under 100 characters." via the API; "Send a test to me" delivered "[Test] Fund III dinner, Sam from
your company" to maya only (its stop line links /me/email); history table shows subject, audience, time, sender, email
count and "pinned in the feed". Phone width 390: no horizontal page overflow (scrollWidth 390), form, preview, send
button and history all readable (`10-phone-390.jpg`, `11-phone-send-button.jpg`; the full-page shot shows the fixed
bottom tab bar mid-page, an artifact of full-page capture). The chip row of fill-in fields scrolls sideways on a phone
(4th chip cut at the edge), same pattern as other chip rows.

## Problems found

### P1 (FAIL) No way to reach the page from the console
Steps: sign in as maya → Admin console → "Asks & digest" (/admin/asks). There is no "Announcements" chip (nor any link
to /admin/announcements anywhere in the UI; the sidebar has no item). `src/shell/admin-tabs.tsx` adds the tab, but the
tab row is only rendered by `AdminSection`, and neither /admin/asks (`AdminAsksView`) nor /admin/announcements uses
`AdminSection`, so the chips never show. Only typing the URL works. (The "Weekly email" chip has the same problem, but
that page just redirects.) Screenshots: `1-page-start.png` (no chips under the title).

### P2 (minor) Two ways a brace still reaches the member
- `{{first name}}` becomes `{Sam}` (the inner field is filled, the outer braces stay).
- Anything in braces longer than 40 characters, e.g. `{this is an unknown field that is longer than forty chars}`,
  is sent raw and the page gives no "not a field we know" warning.
Steps: put either in the message, look at the preview, send a test. Seen in the cohort emails above.

### P3 (bug) A long message with fields fails with "Something went wrong on our side"
Steps: Everyone, subject "Long one for {community}", message of 2800 characters made of "News for {community}. "
repeated (allowed by the 2800 limit) → Send → Yes, send. Result: HTTP 500, "Something went wrong on our side. Try again
in a moment." (`7-long-body-error.png`); nothing is sent and trying again fails the same way. Cause: the feed post is
`subject + "\n" + filled body`; fields expand (`{community}` → "Northwind Founders", `{company}` → "your company",
`{first name}` → "everyone") past the `post_body_length` check (3000), so the insert fails inside the transaction.
The limit is checked on the unfilled text only. Good: the transaction rolls back, no emails go out.

### P4 (minor UX)
- After a double-click the status reads "Already sent: 7 emails are on the way." even though this was the first and
  only send; it looks like a warning about a duplicate.
- The "Sent." confirmation is at the top of the page; after sending from the button (lower on the page) the admin does
  not see it without scrolling up (`6-everyone-sent.png`).
- "Test sent to maya.ortiz@example.com, filled in as Sam Lee." stays on screen after the real send cleared the form
  (`3-cohort-sent.png`).
- With `{company}` in the subject, the feed heading reads "…for everyone at your company" and an email to a member
  without a company reads "Sam from your company": no raw braces, but awkward wording.
- Each everyone-send pins its post and silently unpins the oldest pin when 3 are pinned (the next one will unpin the
  welcome post). By design per the code comment; worth knowing.

## Not tested
- A member with no name ("there" fallback): the profile name cannot be empty through the app, and I did not write to
  the database. Covered only by the code path shared with the preview.
- The feed module turned off (email only, no post): I did not toggle modules on the shared test copy.
- Email off on the site (`emailOff` path): needs a restart without Resend config; the server must not be restarted.
- An unsubscribe that lands between queueing and delivery.

## State left on the test copy
Opted out of announcements: ada, julia (one-click), sam, maya (/me/email). Sam's profile: company cleared, cohort
"FUND III". Announcements sent by the verifier: "Fund III dinner…" (Fund III, 7), "Office hours…" (everyone, 16, pinned),
"Fund I breakfast…" (fund i, 3).

## Re-check after repair 1

Head f02412b, same test copy, real clicks (script `.ai/tmp/verify/r1.mjs`).

| Item | Result |
|------|--------|
| P1 Reach the page from the console (desktop and phone) | PASS |
| P3 Too long for the feed post: blocked with a reason, 422, nothing queued | PASS |
| P2 `{{first name}}` and braces over 40 characters | PASS |
| P4 Sent note under the button, no "Already sent" after a double click, test line clears | PASS |

- **P1.** Desktop: the /admin sidebar now reads Home · Partner report · Intro log · Members · Invites · Asks & digest ·
  **Announcements** (megaphone) · Job board · Set up. Clicking it opens /admin/announcements and the item is
  highlighted (`r1-1-desktop-nav.png`). Phone 390 px: /admin has an "Announcements" link near the bottom of the page,
  above "Sign out". Tapping it opens /admin/announcements, and the bottom bar lights Home (`r1-5-phone-admin.jpg`,
  `r1-6-phone-page.jpg`). Note: on a phone the link is easy to miss, because it sits at the foot of a long page and is
  not in the bottom bar. It is reachable, though, so this passes.
- **P3.** Everyone, subject "Long one for {community}", a 2790-character message of "News for {community}.": the page
  says "With the fields filled in, this is too long for the feed post by 700 characters. Shorten the message." and the
  send button is disabled (`r1-2-too-long.jpg`). The API answers 422 `announcement_too_long` with the same text. No
  500, no announcement row, 0 outbox rows. Switching the same text to One cohort (no feed post) allows it again
  ("3 members will get the email"), which is correct.
- **P2.** Subject "Fund I breakfast round two, {{first name}}" → "Fund I breakfast round two, Felix/Marcus/Ravi".
  "Hi {{first name}}," → "Hi Felix,". `{{{company}}}` → "Atelier Bleu". The 58-character brace text gets the warning
  "Not a field we know: {this is an unknown field … forty chars}. It will be left out." and is dropped from the preview,
  the test email and all 3 delivered emails (`r1-3-braces-preview.jpg`). Still shown raw, as expected, because it is not
  a closed field: an unclosed "{first name." stays as typed.
- **P4.** Clicking Send, then double-clicking "Yes, send": the note under the button reads "Sent. 3 emails are on the
  way. It's in the list below." Nothing says "Already sent". There is one announcement row and 3 emails, one per
  member. The "Test sent to maya.ortiz@example.com, filled in as Felix Moreau." line was gone after the send
  (`r1-4-sent-note.jpg`).

Newly broken: nothing found.
