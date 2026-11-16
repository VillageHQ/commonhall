# Landing page, round 3: how it works today

Approved page: [CHARTER.md](CHARTER.md) (the decision page as approved on 16 November 2026). What the page shows overall:
[common-hall-v2/SPEC.md](../common-hall-v2/SPEC.md); the themes, hover field, faces and dialog: [common-hall-v2/NOTES.md](../common-hall-v2/NOTES.md).

## The ten rooms (`#rooms`)
A `<ul class="rooms">` of ten `li.room`: a key plan (`svg.kp`: the lit room as a `rect.lit` at 22% ink over the house's
walls, drawn once as `<symbol id="kp-walls">` in a zero-size `svg.defs`), the name, a `.stp` tag (`built` solid ink,
`partly` outlined, `coming` dashed) and one line. Two columns from 761 px (`grid-auto-flow: column`, five rows), one below.
The rooms, lines and tags are the v1 page's, with the job-board line at the real count (12 tools).

## The demo (`#demo`, `div#demo-root`)
Five `button.demo-tab` (role tab) and five `figure.demo-panel` (role tabpanel) stacked in one grid cell; the active pair
has `is-on` (panels crossfade on opacity; inactive ones are `visibility: hidden` and `aria-hidden`).
`setUpDemo()` in `site.js`:
- **Scroll mode** (JavaScript, motion allowed, window at least 480 px tall): `demo-root` gets `is-scroll`, which makes it
  3.2 window-heights tall (3 on phones) and pins `.demo-stage` (`position: sticky; top: 24px`, 12 px on phones). On
  scroll, progress = how far the stage has travelled inside the track (0 when it first pins, 1 when it lets go), and the
  tab is `floor(progress × 5)`. A tap scrolls the window to the middle of that step (smooth) and holds the scroll-sync for
  0.9 s so the smooth scroll lands first. Arrow, Home and End keys move between tabs.
- **Reduced motion** (or a very short window): no `is-scroll`, nothing pins, tabs switch on a tap only.
- **No JavaScript:** `html:not(.js)` shows all five panels one under the other and hides the tabs.
- On phones the tab row scrolls sideways (`overflow-x: auto`, scrollbar hidden) and the active tab is scrolled into view.
The pictures are the same crops as before (`assets/screens/`); the member-home crop is no longer on the page.

## What you get (`#compare`)
`ul.pieces`: eight cards (four across, two from 980 px down, two on phones). `table.ticks` inside `div.ticks-wrap`
(`overflow-x: auto; position: relative`, so the 560 px table scrolls inside its box: without `position: relative` the
hidden caption widened the page at 320 px). Cells: `.y` ✓, `.pt` Partly, `.n` dash. The old 11-row `table.cmp` and its
notes sit in `details.more`. Note: `.p` is the hero's portrait class, hence `.pt` for Partly.

## Fewer words
Pricing: three lines per plan and one `.fine` line for the credit and the quote. Your data: six facts. Two ways in: the
form's reply line is shorter; the self-host card's explaining sentence is gone. Section backgrounds alternate: rooms,
demo (alt), compare, pricing (alt), data, doors (alt).

## Proof
`.ai/features/landing-v3/reports/`: the phone and desktop clips of the demo, the section screenshots in both themes, the
verifier's report.
