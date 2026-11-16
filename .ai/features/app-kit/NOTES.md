# The app on the Common Hall look: how it works today

Approved page: [CHARTER.md](CHARTER.md). What the app looks like now: [SPEC.md](SPEC.md). The landing page's own kit:
`.ai/features/common-hall-v2/NOTES.md` and `site/assets/site.css`.

## Where the colours live
- `src/app/globals.css`: the `:root` block (light), the `.dark` block, and the `@media print { .dark {…} }` block that
  prints a dark page in the light colours. The named values are the shadcn ones (`--background`, `--card`, …) and
  Founderhall's own (`--ink`, `--paper`, `--leaf`, `--vellum`, `--side`, `--spine`, `--graphite`, `--ribbon`, the tints).
  `--spine` is now ink: it was the green used for section labels and the "Introduced" state. The dark block also holds
  the `--fh-*` literal colours (placeholder, chip hover, switch off, dashed edges, declined, scrollbar, mail head).
- `src/app/parts.css` and three components (`ui/input.tsx`, `ui/switch.tsx`, `step-row.tsx`) carry a few light-mode
  literals (placeholder grey, chip hover, the switch's off colour, dashed edges); they are the neutral greys now.
- `src/platform/design/accent.ts`: `DEFAULT_ACCENT_COLOR = "#111110"`; `NEUTRALS`, `LEAF` (`#ffffff`) and
  `DARK_SURFACES` match the token blocks, because the contrast rules shift a community's colour against them.
  `ACCENT_PRESETS` starts with Ink. The emails' inline text colour is ink too (`email-copy.ts`, `plain-text-email.ts`,
  `test-email.ts`).
- `src/platform/design/tokens.test.ts` reads the token blocks and checks every text pair at 4.5:1;
  `accent.test.ts` pins the derivation for a few colours (three expected values moved with the new neutrals).

## Type and icon
- `src/app/fonts.ts`: `newsreader` (variable `--font-newsreader`) from `_fonts/Newsreader-opsz-normal.woff2` and
  `-italic.woff2` (fontsource's `@fontsource-variable/newsreader` 5.3.0, OFL, see `_fonts/OFL.txt`). `--serif` in
  `globals.css` points at it. Source Serif 4 is gone.
- `src/app/icon.svg` is the door-gap mark on an ink square (same path as `site/assets/favicon.svg`). The Village "V"
  mark (`village-mark.tsx`) is Village's and stays.

## Checking it
`.ai/tmp/app-kit/after.mjs` signs in to a demo-mode copy and screenshots sign-in, Today, the directory, the asks board,
the intros and the console on phone and laptop, light and dark. Run the built app from the worktree with its own
database (`.env`: `DATABASE_URL`, `DEMO_MODE=true`, `APP_URL` on the same port) and point the script at it.
