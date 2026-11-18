# Hero door field: CHARTER (approved)

Approved by the owner on 2026-11-15 in Telegram topic 75190 on decision page PqL30bOyL1nJ8v6YO07YDA: "Which door field goes
behind the hero? → A · Plan-view door arcs". His words earlier the same day: "Make the background like these
architecture doors: when hovered they trigger a domino effect of doors getting opened with a circle-like effect. Make
the background also a bit more subtle so that the hero section is more visible."

## Direction
**In:** replace the hover field behind the first screen of `site/` (today: faint blueprint glyphs that warm near the
pointer) with variation A from the prototypes (`~/.business-builder/runs/2026-11-13-founderhall-v2/design/v17-doors/vA/`):
a 72 px grid of plan-view doors (wall with a gap and jamb ticks, leaf closed across it, four orientations); pointer or
touch movement starts circular waves (about 560 px/s, a new wave every ~110 ms and 36 px of travel, up to 8 at once);
a door swings open 90° in 400 ms as the wavefront passes while its quarter-circle arc inks in, holds 900 ms, swings
shut in 400 ms. Rest ink 6.5% (light) / 9% (dark); open leaf peaks ~55%, wall ~22%, arc ~32%. Exclusion: the eyebrow,
headline, sub-line, buttons, GitHub card and the blueprint house (plus ~8 px) stay shut and never trigger.
**Out:** everything else on the page; the click chain (variation D); any change to copy, themes, sections or the form.

## Deciding facts (lead's calls)
1. The port lives in the page's own `assets/site.js` and `site.css` under the same Content Security Policy: no inline
   script, no library. The canvas keeps its id/class (`hero-field`) and the `data-skip` exclusion mechanism; the text
   boxes stay excluded as in version 2.
2. Reduced motion: doors drawn once, closed, no listeners. No JavaScript: no canvas. Device pixel ratio capped at 2;
   grid rebuilt on resize and theme change; the loop stops when nothing moves; one cached hero rect.
3. Both themes: ink colour from the theme token; the field re-reads it on `themechange`.
4. Known limit, accepted: on phones the content fills the width, so the doors show mostly above and below the content.

## Tests
`check-site.mjs` (both themes) and a focused verifier: the field behaves as above at 1280 and 390 in both themes; text
contrast with the pointer over the H1 stays ≥ 4.5:1; nothing under the excluded boxes; off under reduced motion and
without JavaScript; no console errors; no outside requests; no overflow; the rest of the first screen unchanged.

## Proof and estimate
A ≤10 s clip of the wave in light and in dark, plus two stills. Build ~45 min, tests ~20 min. Roll back: revert the merge.
