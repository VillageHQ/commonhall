# VERIFY: choice-asks (independent verifier, 20 Nov 2026)

App: http://localhost:6141 (demo mode). Playwright Chromium, phone 390x844 (isMobile, hasTouch) and laptop 1280x860.
Scripts: `.ai/tmp/verify/*.mjs`. All screenshots are in this folder. The server answered throughout. No source files were edited.

Third member: as Maya, I used Members › Sign-in links › Copy (ruby.haas@example.com, an open invite). I opened the link in a separate context and finished the welcome steps. "Ruby Haas" is a real signed-in member who is neither the asker nor the helper.

## Results

| # | Check | Result |
|---|-------|--------|
| 1 | Matching: empty vs filled target | PASS (one nuance, see P4) |
| 2 | Intro ask yes in 2 taps, 0 fields | PASS on the criteria; the screen has a visible layout break (P1) |
| 3 | Composer: 1 box + 1 button, then win link, fold, allowance | PASS on the criteria; small state bug after a win (P3) |
| 4 | Private help note: asker sees it, third member doesn't | PASS |
| 5 | One-tap I can help / Not for me (Today and For you) | PASS |
| 6 | Drafted intro note: no earlier need, follows typing, keeps edits | PASS (the network search ask page was not reached) |

### 1. Matching: PASS
- Sam, text "Looking for procurement contacts at a US hospital group for our clinic supplies":
  - Target empty: **"1 member can help."** (Ada Okafor, matched on her "Hardware supply chains…" line from the ask's own words). `check1-proc-empty-1280.png`
  - Target "Head of procurement" / "Halcyon Health": **"3 members can help."** (Marcus Webb on a path, "Knows Rosa Lindqvist (CTO at Halcyon Health)"; Oliver Grant; Ada Okafor). `check1-proc-filled-1280.png`
  - The empty ask did not say "Nobody has a path yet". Ada, found from the ask's words, is in both lists. The two extra helpers in the filled ask come from the target words.
- Maya, text "Has anyone done SOC 2 from scratch while hiring engineers in London? Keen to compare notes" (matches Grace Kim's "Hiring engineers in London; SOC 2 from scratch"):
  - Target empty: **"5 members can help."** (Marcus Webb, Grace Kim, Priya Shah, Lena Fischer, Ravi Menon). `check1-skill-empty-1280.png`
  - Unrelated target "Rosa Lindqvist" / "Halcyon Health": **"6 members can help."** (Ravi Menon on a path, Oliver Grant, Marcus Webb, Grace Kim, Sam Lee, Priya Shah). `check1-skill-filled-1280.png`
  - The filled ask did not find fewer (6 ≥ 5). However, **Lena Fischer** was found from the ask's own words ("hiring") with the box empty and is gone once the box is filled. See P4.

### 2. Intro ask, yes in 2 taps: PASS on its criteria
- 390 px: Sam's Today, "Waiting on you": "Marcus Webb asks you to introduce them to Rachel Kim." → **Answer (tap 1)** → `/intros/f7bd35cd…`. The heading reads **"Introduce Marcus to Rachel?"**. "Marcus' note" shows first, then exactly two buttons, **Introduce** and **No thanks**, plus "If it's no thanks, Marcus is never told why." There are no radio choices and no fields (controls: Introduce, No thanks, Report, Message). `check2-intro-ask-390.png`
- **Introduce (tap 2)** → "Now ask Rachel". The private link is shown, **Copy link** is the main (black) button and "Copy with a message" is a quiet button beside it. Visible fields: **0**. `check2-after-introduce-390.png`
- Copy link → the button reads **"Copied"**, and the clipboard holds exactly the `/i/…` link. `check2-copied-390.png`
- The "Email it to Rachel" fold opens on "Rachel's email" (email field) and an "Email Rachel" button. `check2-email-fold-390.png`. The fold's header is visibly broken: see P1.
- 1280 px, with a fresh intro ask (Maya asked Sam to introduce her to Rosa Lindqvist, VP Procurement, Halcyon Health): same flow. The heading is "Introduce Maya to Rosa?", the note sits on the left and Introduce / No thanks on the right. After Introduce: link, Copy link → Copied, and the email fold opens. `check2-intro-ask-1280.png`, `check2-after-introduce-1280.png`, `check2-copied-1280.png`, `check2-email-fold-1280.png`
- No thanks (Maya → Tom Berg, Head of Supply, Mercy Ridge Hospital): one tap closed it. Sam sees "Sam can't make this one". `check2-no-thanks-connector-390.png`. Maya, the asker, sees "They can't make this one · 20 Nov. Your ask is back. Find another way in: People." with no reason anywhere. Her Inbox list shows "They can't make this one". `check2-no-thanks-asker-390.png`
- The "only when the community sends email" condition was seen in its "on" state only. I could not switch mail off, so the "off" state was not checked.

### 3. Composer: PASS on its criteria
- Before typing, at 390 and 1280, on both `/asks` and `/asks?compose=1`, the composer holds exactly **1 box ("What do you need?") and 1 button ("Post")**. There is no Ask/Update switch. `/asks?compose=1` focuses the box. Today's "Post an ask" links to `/asks?compose=1` and arrives focused. `check3-composer-before-390.png`, `check3-composer-empty-compose-390.png`, `check3-composer-empty-compose-1280.png`, `check3-from-today-compose-390.png`
- After typing, these appear: "Post a win instead" (under Post), the folded **"Name who you're trying to reach"** (no "(optional)"), which opens to "A person or a role" and "Company", and the line "4 of 5 asks left this week". `check3-composer-typed-390.png`, `check3-composer-typed-1280.png`
- A long sentence is shown whole. 190 characters at 390: box clientHeight equals scrollHeight (152 px), all text visible. `check3-composer-long-390.png`, `check3-composer-long-1280.png`. 324 characters, in dark mode: also whole (262 px, no inner scroll). `break-dark-composer-long-390.png`
- "Post a win instead" posted "We signed our second hospital pilot…" with kind=update and showed "Update posted.". It appears on Open with the **Update** badge. `check3-win-posted-390.png`, `check3-win-on-open-390.png`
- Enter in the box posted an ask ("Anyone know a good fractional CFO…") → its page shows "Posted. We told the members who can help." and "2 members can help". `check3-enter-posted-390.png`
- An empty submit is blocked by the browser ("Please fill out this field"). No request was sent.

### 4. Private help note: PASS
- As Maya on Sam's ask "Who has hired a first VP Sales selling to US hospitals?" the box is labelled **"A note only Sam sees"**. `check4-helper-form-390.png`. I wrote "SECRETNOTE-7731 my old colleague Dana ran sales at Mercy Ridge" and tapped I can help.
- Maya, the helper, sees the public line "I've done this myself. Happy to talk it through." and below it "Your note, only the asker sees it" with the note. `check4-helper-after-390.png`
- Sam, the asker, sees the same line and under it **"A note only you see"** with the note. `check4-asker-sees-note-390.png`
- Ruby, the third member, does not see the note on the ask page (Maya's line only), in the page HTML, in the RSC payload, on /asks, on Open, on Today, or in Asks search: "SECRETNOTE-7731", "Dana" and "colleague" all give 0 results. `check4-third-member-390.png`

### 5. One-tap I can help / Not for me: PASS
- Before: Today "You could help" had Maya's SOC 2 ask and Lena's supply-chain ask. For you = **3**. `check5-today-before-390.png`
- **I can help** on Maya's ask, tapped twice quickly: exactly **1** POST (`/api/asks/help`) and no form. The flash read "Thank you. They hear from you by email." The ask left the list. `check5-today-after-help-390.png`. On the ask page Sam's line is "Has done this · I've done this myself. Happy to talk it through." and the answer count is 1, so no duplicate. `check5-ask-page-fixed-line-390.png`
- **Not for me** on Lena's ask: "Done. It won't show for you again." The ask left Today. `check5-today-after-notforme-390.png`. For you went 3 → **2** and Lena's ask is gone from it. `check5-foryou-after-today-390.png`. Open still lists it.
- **Not for me on a For you card** (Amara's seed-round ask): For you 2 → **1**. Open still lists it and it is gone from Today. `check5-foryou-after-notforme-390.png`
- At 1280 (Maya's HIPAA ask routed to Sam): Not for me double-clicked sent exactly **1** POST (`/api/asks/skip`). `check5-today-could-help-1280.png`

### 6. Drafted note: PASS (search ask page not reached)
- As Sam, on Lena Fischer's profile at 390 and Julia Weber's at 1280 → "Ask for an intro" → `/intros/new?via=…`. The starting note is "I'm Sam, Co-founder & CEO at Tallyhealth. Prior-authorisation automation for outpatient clinics. Could you introduce me to them?". There is **no** hospital-procurement sentence, even though Sam's profile "Looking for" reads "An intro to procurement at a US hospital group."
- After typing Name/Role/Company the note ends "…Could you introduce me to Rosa Lindqvist (VP Procurement at Halcyon Health)?" `check6-form-filled-390.png`, `check6-form-filled-1280.png`
- I appended " MY OWN EDIT." and then changed the Name to "Tom Berg". The note kept my edit unchanged (still names Rosa and ends "MY OWN EDIT."). `check6-form-edited-390.png`, `check6-form-edited-1280.png`
- Maya's note to Sam was built the same way ("I'm Maya, Head of Platform at Northwind Ventures. Runs the Northwind founder network… Could you introduce me to Rosa Lindqvist (VP Procurement at Halcyon Health)?").
- Not reached: the network search ask page (`/search/ask`), because search needs the member's own Village connection. The "Ask Marcus for an intro" button on an ask's page opens an inline "A note Marcus can forward" box that starts **empty** (`check6-from-ask-390.png`). It carries no old need, but no note is drafted there either.

## Problems found (most severe first)

**P1 (visible break, medium). The "Email it to <name>" fold header is unstyled: the marker, the mail icon and the words sit on three separate lines.**
Steps: as Sam answer any intro ask → Introduce → look under "This link is only for them…". You see "▶", then a mail icon, then "Email it to Rachel", each on its own line. This happens at 390 and at 1280. `check2-copied-390.png`, `check2-email-fold-390.png`, `check2-email-fold-1280.png`.
Cause: the `details.fh-more summary` styles in `src/app/parts.css` (lines ~665-667) are scoped to `.fh-composer`. The new fold in `consent-link-panel.tsx` sits outside the composer, so it gets none of them.

**P2 (low-medium). An intro answered in a second tab tells you it changed but keeps offering the old buttons.**
Steps: open `/intros/<id>` (an intro waiting on you) in two tabs. Tab A: No thanks. Tab B: Introduce → the server answers 409. Tab B shows "This intro request just changed. Here's where it stands now." yet still shows the heading "Introduce Maya to Tom?" and both buttons. "Where it stands now" is not shown until a reload. The state is not corrupted: a reload shows "Sam can't make this one". `break-intro-two-tabs-390.png`

**P3 (low). After "Post a win instead" the composer stays opened with an empty box.**
Steps: /asks, type text, tap "Post a win instead". The page shows "Update posted." and the box is empty, but "Post a win instead", "Name who you're trying to reach" and "2 of 5 asks left this week" remain. The 1-box-1-button state only comes back on reload. `check3-win-posted-390.png`.
Cause: `hasText` is not reset after `element.reset()` while the component stays mounted.
Related: clearing the box unmounts the fold, so a typed target/company is lost if the member clears and retypes the ask.

**P4 (low, matching nuance). Target words compete with the ask's own words for the 5 word-match slots, so an ask-text match can be pushed out.**
Steps: as Maya post "Has anyone done SOC 2 from scratch while hiring engineers in London? Keen to compare notes" with the target empty → 5 helpers including Lena Fischer. Post the same text with target "Rosa Lindqvist" / "Halcyon Health" → 6 helpers, and Lena is gone. Her slot went to Oliver Grant and Sam Lee, who match only the company word "Health".
Cause: `readWordHelpers` sorts by shared-word count and caps at `wordHelpersPerAsk: 5`. Ties are not ranked by ask-text matches first.
The total did not drop here. Still, the claim "a named target only adds words, so filling the box never finds fewer helpers" holds for the count but not for who is found. A target with a strong path plus several word matches could also lower the total.

**P5 (low). Pressing Enter twice quickly sends two create requests.**
Steps: /asks, type an ask, press Enter twice fast → two POSTs to `/api/asks/create`. The second is rejected with 409, so only one ask exists and the allowance dropped by one (2 → 1). No double post reached the board, but the client does not guard Enter while a post is pending: `requestSubmit` ignores the disabled Post button. The 409 shows as a console error.

**P6 (low, existing before this change). The status pill shows twice on the connector's answered intro page.**
"With Rachel" (or "Sam can't make this one") appears beside the title and again above "You answered on 20 Nov.". `check2-after-introduce-390.png`, `check2-after-introduce-1280.png`, `break-dark-intro-390.png`. The duplicate comes from `ConnectorMain`, which this diff did not change.

**P7 (cosmetic). Empty band at the top of the "A note only Sam sees" card** on an ask page at 390: about 40 px of blank space above the label. `check4-third-member-390.png`

**Observation (product, not a defect against the spec).** With one tap from Today the public line is a fixed claim ("I've done this myself. Happy to talk it through." / "Has done this"). Sam was routed to Maya's SOC 2 ask only because his "Health" tag matched the target company "Halcyon Health", and one tap published "I've done this myself" in his name.

## Other things tried that held up
- Whitespace-only ask: the win link stays hidden, and Post shows "Write your ask in a line: who or what you need." (422) with nothing posted. `break-whitespace-submit-390.png`
- Dark mode (prefers-color-scheme: dark): the composer and the intro page render correctly. `break-dark-composer-long-390.png`, `break-dark-intro-390.png`
- No page errors and no console errors on the changed screens, apart from the expected 409/422 responses noted above.

## Re-check after fixes (fix commit f736d18d, 20 Nov 2026)

Same app, same browsers (Playwright Chromium, 390x844 phone with touch, 1280x860 laptop). Scripts: `.ai/tmp/verify2/*.mjs`. Screenshots: `recheck-*.jpg` in this folder (about 1.6 MB in total). No source files were edited.
Setup: Maya had no asks left this week, so she asked Sam for one intro (Nora Quill) and Ruby Haas asked him for four more (Otto Fenwick, Pia Larsen, Quinn Harlow, Rhea Tanaka). All are made-up names. Sam had 5 open posts, so a win was refused with 409 "You already have 5 open asks". To free room I used "Mark answered" on three of Sam's test asks from the first run (`57dd93d8…`, `0ed4ac9b…`, `25516e85…`).

| # | Check | Result |
|---|-------|--------|
| 1 | P1: "Email it to <name>" fold on one line, and it still sends | PASS |
| 2 | P3: composer empty and folded after a win; the fold keeps typed words when the box is cleared | PASS |
| 3 | P5: double Enter sends one create request | PASS (one synthetic edge, see below) |
| 4 | P2: intro answered in another tab, the second tab redraws | PASS |
| 5 | One-tap line reads "I can help with this." / "Can help"; the private note still shows only to the asker | PASS |
| 6 | P7: no blank band above "A note only <name> sees" | PASS (new spacing nit, N1) |
| 7 | P4: every helper found with the target empty is also found with it filled | PASS |

**1. Email fold: PASS.** Sam went from Today › Waiting on you › Answer (the row for that intro) › Introduce.
- 390, Maya ↔ Nora: the summary is one line, 22 px tall. It uses `display:flex` with no marker or arrow, and the mail icon and "Email it to Nora" share the line. `recheck-fold-closed-390.jpg`
- Opening the fold shows "Nora's email". I typed nora.quill@example.com and tapped "Email Nora" → `POST /api/intros/consent/email` 200, and the panel shows "We emailed Nora Quill. They can answer from the email." `recheck-fold-open-390.jpg`, `recheck-fold-sent-390.jpg`
- 1280, Ruby ↔ Otto: also one line (22 px). "Email Otto" with otto.fenwick@example.com → 200 and "We emailed Otto Fenwick…". The panel text also changed to "We emailed Otto on 20 Nov…". `recheck-fold-closed-1280.jpg`, `recheck-fold-open-1280.jpg`, `recheck-fold-sent-1280.jpg`
- P6 (the status pill shown twice) is still there. It is visible in these shots and was not part of this fix.

**2. Composer after a win: PASS.**
- 390: I typed a win and tapped "Post a win instead" → create 200, URL `/asks?m=updated`, "Update posted.". The box is empty and `#compose` holds only the textarea and Post. There is no win link, no fold and no allowance line. `recheck-after-win-390.jpg`. Typing again in the same mounted composer brings the extras back.
- 1280: same result. The only extra is "0 of 5 asks left this week", which the code shows on purpose once the weekly allowance is used up (Sam had used his last ask in check 3). `recheck-after-win-1280.jpg`
- Clearing the box: I typed text, opened "Name who you're trying to reach", typed "Head of procurement" / "Halcyon Health", then cleared the box with Ctrl+A and Backspace. The fold stays open with both values. `recheck-cleared-fold-390.jpg`. A whitespace-only Post then gives 422 "Write your ask in a line…" and the fold still holds the values.

**3. Double Enter: PASS.**
- Real run, Sam at 390: Enter, Enter on "Who has done SOC 2 compliance hiring for a first security engineer at a health startup?" → exactly **1** POST to `/api/asks/create` (200). One copy exists under Yours, and the page shows "5 members can help". `recheck-double-enter-390.jpg`
- With the API stubbed (a 1.5 s delay, so nothing reached the server), I counted requests:
  - two Playwright Enter presses → 1
  - three Enter presses → 1
  - two keydowns 16 ms apart → 1
  - Enter then a forced Post click → 1
  - **two keydown events sent in the same JS task → 2.** This happens because the guard is React state (`isPending`), not a ref. A real keyboard cannot do this, since each key press is its own event and React redraws between them, so it is not a user-facing failure. If a strict guard is wanted, use a ref. The server's 409 also still protects the board.

**4. Intro answered in another tab: PASS.** Each run had Sam with the same intro open in two tabs.
- 390, Quinn: tab A tapped No thanks. In tab B, Introduce → 409, and without a reload tab B redrew to "Sam can't make this one", with only Report and Message left. No Introduce or No thanks buttons remained. `recheck-two-tabs-390.jpg`. Tab B shows no "this just changed" line: the page simply redraws.
- 1280, Rhea: Introduce in A, then Introduce in B → 200 (the same answer is accepted again). B shows the answered state, "Make a new link" and "I can't make this intro after all", with no stale buttons. `recheck-two-tabs-1280-a.jpg`
- Observation (no screenshot kept): Pia at 390, Introduce in A then **No thanks in B → 200**. The intro that had just been introduced became "Sam can't make this one", and the link from tab A stops counting. The server treats No thanks after Introduce like "I can't make this intro after all" (a move it allows). The redraw itself is correct, but a stale tab can cancel a yes with one tap and no confirmation.

**5. One-tap line: PASS.**
- Sam's Today › You could help listed Ruby's asks. I tapped "I can help" on "Looking for procurement contacts…" → one POST `/api/asks/help` `{"kind":"done_myself","note":""}` and the flash "Thank you. They hear from you by email." `recheck-today-after-help-390.jpg`
- The ask page shows Sam Lee with a **"Can help"** label and the line **"I can help with this."**. "I've done this myself" appears nowhere. `recheck-onetap-line-390.jpg`
- From the page of Ruby's SOC 2 ask (`d7694156…`), Sam wrote "SECRETNOTE-2208 my former colleague ran SOC 2 at a clinic chain" in "A note only Ruby sees" and tapped I can help.
  - Ruby, the asker, sees "I can help with this." and under it "A note only you see" with the note. `recheck-note-asker-390.jpg`
  - Maya, a third member who is also an admin in Founder view, sees the line without the note. "SECRETNOTE" is absent from the visible text, the DOM and the raw HTML/RSC response. `recheck-note-third-390.jpg`
- Older answers with kind done_myself (Priya's seed answer) now also carry the "Can help" label. That is consistent with the change.

**6. Note card band: PASS.** Ruby is a non-author and not a routed helper on Sam's VP Sales ask.
- The label sits 19 px below the card top at 390, which equals the card's 18 px padding (23 px vs 22 px at 1280). The ~40 px band is gone. `recheck-note-band-390.jpg`
- **N1 (new, cosmetic, side effect of this fix).** When the card starts with a "Why you: Your profile says…" paragraph (a routed helper, e.g. Sam on `d7694156…`, or Maya there), the label now sits **0 px** below that paragraph at both widths and reads as cramped. `recheck-note-card-390.jpg`, `recheck-note-card-1280.jpg`
  - Cause: the new rule `.fh-helpbox .fh-decide > .fh-field:first-child{margin-top:0}` also matches when the form is not the card's first child.
  - Fix: scope the rule to `.fh-helpbox > .fh-decide:first-child > .fh-field:first-child`.

**7. Matching: PASS.** Sam was out of asks, so Ruby (a member with no Village paths) posted these.
- "Who has done SOC 2 compliance hiring for a first security engineer at a health startup?":
  - target empty (`34bfd796…`): **5**: Marcus Webb, Grace Kim, Sam Lee, Maya Ortiz, Priya Shah.
  - target "Head of procurement" / "Halcyon Health" (`d7694156…`): **the same 5**, all on their "can help with" lines. `recheck-match-filled-1280.jpg`
  - All 5 places were already taken by matches on the ask's own words, and none was pushed out. That is the case P4 failed on before.
- "Looking for procurement contacts at a US hospital group for our clinic supplies" with the same target (`26fcbe56…`): **3**: Oliver Grant, Sam Lee, Ada Okafor. Ada, the only helper the ask's own words found in the first run (Sam's empty-target ask), is kept, and the target added two more.
- Not reproduced exactly: P4's original pair (Maya's SOC 2 text with "Rosa Lindqvist" / "Halcyon Health"), because Maya has no asks left this week.

### Other things tried
- A win counts toward the 5-open-posts limit and is refused with "You already have 5 open asks. Close one, then post this." while the line under the box says "1 of 5 asks left this week". This was already there before this branch (`service.ts:48` is on main), but a member who sees "1 left" and is told no will be confused.
- At 390 the target chip's search icon touches its text ("Head of procurement · Halcyon Health"). Cosmetic. `recheck-onetap-line-390.jpg`
- The empty composer box is 138 px tall at both widths before anything is typed. It was the same in the first run (`check3-composer-before-390.png`).
- No page errors. The only console errors were the expected 409/422 responses.
