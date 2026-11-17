---
status: building
---
# The app on the Commonhall look

What it does now (approved 2026-11-17, [CHARTER.md](CHARTER.md)): the app wears the landing page's kit, so the product
reads as one thing on its page and inside.

- **Colours:** light = paper white `#fafaf7` canvas, white sheets, `#f2f1ec` sunk boxes, ink `#111110`; dark = `#0e0e0d`
  canvas, `#161615` sheets, `#1e1e1c` sunk, `#f4f2ec` ink. Rust `#9c4e22` (dark `#e7a57e`) stays for warnings, the
  demo banner and the "Introduced" bookmark. Avatar tints stay. The print view uses the light values.
- **Brand colour:** each community still picks its own; one that never did gets ink (`DEFAULT_ACCENT_COLOR`), and "Ink"
  is the first preset in the admin's picker ("Spine green" stays as a preset). The derivation rules did not change.
- **Type:** Newsreader (variable, weight and optical size) for titles and people's names; IBM Plex Sans and Mono as before.
- **Icon:** the floor plan with a door gap on an ink square (the landing page's favicon).
- **Name:** "Commonhall by Village" in the source credit, "Full pricing on the Commonhall site", the README's title.
  Code comments still say "Commonhall" where they cite the reference design; the public paths and the demo stay.

How it works: [NOTES.md](NOTES.md). Not in this round: the roadmap's wider rename of docs and comments.
