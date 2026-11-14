# Design system

> ⚠ RECONSTRUCTED from code on 2026-11-10 — needs confirmation
> Sources: `docs/design/tokens.md`, `src/app/globals.css`, `README.md` (Design).

The design system's rules live with the code, not here:
- **Tokens and rules:** `docs/design/tokens.md` (the accent input and its six contrast-safe tokens, light and dark).
- **CSS variables:** `src/app/globals.css`; the fund's accent is written per theme by the server.
- **Components:** shared components under `src/components/` (shadcn primitives in `src/components/ui/`) and each module's `components/`.
- **Fonts:** self-hosted through `next/font/local` (no font network).

The merged look (serif headings, hairline edges, plain buttons, only the fund's name for members) is in
`docs/design/tokens.md`; what it changed on each screen is in `.ai/features/look-theme/SPEC.md`.

## The landing page (`site/`)
Its own small system, in `site/assets/site.css` (see `.ai/features/common-hall-v2/NOTES.md`):
- **Themes:** light = paper `#FAFAF7`, ink `#111110`; dark = `#0E0E0D` ground, `#F4F2EC` ink. No navy, no green. Cards and
  tooltips are ink on paper in both themes. Text is at least 4.5:1 in both.
- **Type:** Newsreader 500 for the headline and section titles, IBM Plex Sans 400/500/600 for text and UI, JetBrains Mono for the install line. All self-hosted (OFL texts beside the files).
- **Buttons:** 48 px high, 6 px radius, 15 px/600; solid ink (paper text) or outlined; the Set up button is a split button with a caret menu.
- **Logo 03:** the floor plan with a door gap (`M4 8H60V56H40V48H52V16H12V48H24V56H4z` on a 64 grid), beside "Common Hall" and "BY VILLAGE"; the favicon is the mark on an ink square.
