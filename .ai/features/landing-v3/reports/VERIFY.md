# Verify: Common Hall landing, round 3 (http://127.0.0.1:8798/design/v17/)

Independent run, Playwright + Chromium. Scripts and raw output (t1..t9 .mjs / .json) are in this folder.
Note: `dark-1280-demo-step3.png` and `dark-390-demo-step5.png` show tab 2 and tab 4 (the names are my step index, not the tab).

## Criteria
1. PASS - Rooms. 10 rooms in the order Asks, Intros, Network, Members, Messages, Feed, Job board, Perks, Chat, Admin. Perks = Partly; Chat = Partly plus "Coming: WhatsApp, Telegram, Signal"; all others Built. Job board line "12 hiring tools, read every hour." Two columns at 1280 (lefts 74/588, filled column-first: Asks..Messages left, Feed..Admin right), one column at 390 (left 20). Legible light and dark. Evidence: t1.json, rooms-1280-light.png, rooms-1280-dark.png, rooms-390-light.png, rooms-390-dark.png.
2. PASS - Demo desktop 1280x900 light. Slow wheel scroll (60 px steps): tab sequence 1,2,3,4,5 in order; stage top = 24 px at every pinned sample (and at all five screenshot positions); `.demo` gets `is-scroll`. Tap on tab 4 from the section top: tab 4 active at ~155 ms, panel 4 visible at ~270 ms, page scrolled and settled by ~600 ms (limit 1.5 s). Taps 2,5,1,3 each land correctly. Arrow keys (Right/Left/Down/Up/Home/End) move selection and focus; aria-selected and roving tabindex follow. Evidence: t2.json, t3.json, demo-1280-light-step1..5.png, tap4-d1280.png.
3. PASS for scrolling and taps (keyboard defect D1 at this width) - Phone 390x844. Same pinned behaviour (stageTop 12 at every sample, order 1..5). The tab row scrolls so the active tab is centred and fully visible at each scroll step and after each tap (tabVisible true at all five settled steps). During the smooth row scroll the tab is briefly partly off the edge, then lands. Evidence: t2.json (m390), demo-390-light-step1..5.png, t3.json (m390_taps).
4. PASS - Reduced motion. `.demo` class is just "demo" (no `is-scroll`), demo height 496 = stage height 496 (at 390 wide: 604 = 604). The stage scrolls away with the page (stageTop -130, -280, ...) so nothing pins. Taps on tabs 4,2,5 switch the panel; arrows work; the row keeps the active tab visible. Evidence: t3.json (rm1280_*, rm390_*), reduced-rm390-demo.png.
5. PASS (cosmetic defect D2) - JS off. All five screenshots visible one under the other, 0 tabs visible, no external requests. Evidence: t4.json, t4b.mjs, nojs-nojs1280-demo.png, nojs-nojs390-demo.png. (Images are lazy and load once scrolled near, as expected.)
6. PASS - Compare. Eight cards titled Warm intros, Network search, Member directory, Asks board, Job board, Admin dashboard, Your own domain, Open source, each with one short line. Tick table: Common Hall has a tick on all eight rows plus a Price row (Free / $10,000 a year); columns Getro, Cabal, Metal, Discord with tick / Partly / dash. "Read the details" opens an 11-row table and 3 notes. At 390 and 320: cards in two columns (lefts 20/199 and 20/164); the tick table (560 px) scrolls sideways inside its box, the long table (860 px) likewise; document width unchanged. Evidence: t5.json, compare-1280-closed.png, compare-1280-open.png, compare-390-closed.png, compare-390-open.png, compare-320-open.png, ticks-390-scrolled.png.
7. PASS - No horizontal page overflow: scrollWidth == clientWidth at 320, 390 and 1280, light and dark; also with details open at 320/390 and during all resize steps. Evidence: t1.json, t5.json, t8.json.
8. PASS - Dark theme readable at 1280 and 390 for rooms, demo (tabs and screens), compare (cards, tick table, price row), pricing, data, doors. Evidence: rooms-*-dark.png, dark-1280-{compare,pricing,data,doors}.png, dark-390-{compare,pricing,data,doors}.png, dark-*-demo-*.png, dark-*-details.png.
9. PASS - Nav links Rooms, Screens, Compare, Pricing, Two ways in: hrefs #rooms #demo #compare #pricing #doors all exist; clicking each at 1280 scrolls the target to top 16 px. Evidence: t1.json (nav, navScroll). (At 390 I only checked that the targets exist; I did not click the nav there.)
10. PASS - Form. Empty submit shows four field errors and focuses Name; bad email shows an email error only; valid values show "Thanks, Sam. Nothing was sent." (data-endpoint is ""). During the whole run: 0 non-GET requests and 0 requests to any host except 127.0.0.1:8798. Evidence: t7.json, form-errors.png, form-confirm.png.
11. PASS - Zero console errors/warnings, page errors, failed requests or HTTP >= 400 on load in light and dark at 390 and 1280 (also none during the demo, resize, fast-scroll and theme-switch runs). Evidence: t1.json, t8.json.
12. PASS - Rendered text (body text plus alt/aria-label/title) has no SSO, SAML, SOC 2, ISO 27001, GDPR, HIPAA, free trial / trial, one-click, encrypt, customer(s), trusted by, logo(s), secure/security. Evidence: t1.json (honesty), rendered-text.txt.

## Break attempts
- Resize while pinned (1280x900 -> 390x844 -> 800x700 -> 1280x900 -> 1280x460 -> 1280x900 -> 320x568 -> 1280x900): tab and panel stay in sync, pin is recomputed each time, no overflow, `is-scroll` drops at height 460 and returns. Minor: after the shrink to 390 or 320 the tab row is not re-centred, so the active tab (4) was cut off until the next change (D3). Evidence: t8.json, resize-390x844.png.
- Very fast scroll (12 x 1000 px wheel bursts down and up, End, Home, random jumps): always ends on the right tab for the scroll position (5 at the end, 1 at the top, 4 at 70 %), panel matches tab, no stuck state. Evidence: t8.json (fast).
- Theme switch mid-scroll (light to dark while pinned on tab 3, then scroll on): stays on tab 3, then goes to 4, stage still pinned, dark colours correct. Evidence: t8.json, theme-switch-mid.png.
- "Read the details" at 320 px: opens, the table scrolls inside its box, page width stays 320. Evidence: t5.json, compare-320-open.png.
- Keyboard: Tab from the section reaches the active tab only (roving tabindex), then the tick table box, links, summary; focus ring visible. Arrow/Home/End work (D1 for phone width). Evidence: t8.json (tabThrough), t3.json.
- Odd viewports: 1280x560, 1366x650, 1024x768, 768x1024, 844x390 all fine (844x390 does not pin, by design). Evidence: t8.json (short), short-*.png.

## Defects found
- D1 (real bug, medium-low): at phone width with motion allowed, ArrowRight/ArrowLeft on a focused tab selects the next tab but leaves it cut off at the row's right edge and does not scroll the row (3 to 4: tab spans x279-411 in a row ending at 370; 2 to 3: x267-424; 4 to 5: x267-408). Repeatable. Likely cause (from reading `site.js`): the key handler calls `tab.click()` (smooth `row.scrollTo`) and then `.focus()` immediately, which cancels the smooth row scroll. The same keys with reduced motion (instant scroll) are fine, and taps and wheel scrolling are fine. Evidence: t3b.mjs (rerun it to reproduce), t3.json (m390_keys).
- D2 (cosmetic): JS off at 1280: the five screenshots render only about 220 px wide (the hidden tabs' 220 px grid column is still reserved), so the screens are tiny and unreadable; at 390 they are full width and fine. Evidence: nojs-nojs1280-demo.png.
- D3 (cosmetic): active tab not re-centred after a width change (see above).
- D4 (cosmetic): viewport height 480 to 519 px: the pinned stage is 496 px tall at top 24, so its bottom (the caption) is cut by up to about 40 px (1280x500: caption missing). Evidence: short-1280x500.png.
- Observation, not a bug: while pinned in a 900 px window the stage fills only the top ~520 px, leaving about 380 px of empty background below it (demo-1280-light-step1.png).

## Verdict
All 12 criteria PASS as stated. Not clean: D1 is a real keyboard bug at phone width (the selected tab can end up hidden off the edge of the row); D2 to D4 are cosmetic. Recommend fixing D1 and D2 before release; D3 and D4 are optional.

## After the report (builder's note, 16 November 2026)
All four defects were fixed in the same pull request and re-checked with the verifier's own repro (`t3b.mjs`) and a
small script (`d2d4.mjs` in `.ai/tmp/landing-v3/`): D1 (arrow keys leave the tab cut off at phone width) gone with
motion on and off; D2 (no JavaScript at 1280 px) the screens take the full width (980 px); D3 the active tab is
re-centred after a resize; D4 the stage pins only when it fits under the pin line (no pin at 500 px tall, pin from 560).
