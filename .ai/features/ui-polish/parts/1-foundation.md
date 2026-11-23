# Part 1: the foundation (sizes, the bottom of the screen, Sheet, ListRow, EmptyState)

Read [../SPEC.md](../SPEC.md) first: its "Shared contracts" and "Shared rules" are this part's target. Runs **first and
alone**; parts 2–6 start from main after it merges. About 1.5 hours.

## Why
One Asks screen mixes 6 control heights (140, 52, 44, 40, 34, 26 px) and two field radii (6 and 10). People search puts
a 52 px box beside a 40 px button. Today mixes 32 and 40 px buttons on neighbouring cards ([BENCHMARK.md](../BENCHMARK.md)
§4–6). And five parts are about to build bottom sheets, rows and empty states at the same time. One set of shared parts,
built first, keeps them identical and lets the five run without waiting on each other.

## Target
### Sizes
- **Buttons, everywhere.** The `Button` component *and* the plain classes used directly in about 58 files
  (`.fh-btn`, `.fh-btn-sm`) get the new sizes:
  - medium: **min-height 44 px** (`height: auto`, so large text grows it);
  - small: **min-height 36 px**;
  - `icon` and `.fh-iconbtn`: 44×44 (from 40);
  - every variant keeps a 6 px radius, with 15 px/600 text (14 px/600 for small).
  The class overrides go in `globals.css`, after the generated `parts.css`.
- **Fields.** `Input` and `Select` stay at 44 px. Their text goes from 15 to **16 px**, and so does `.fh-input`'s.
- **Text boxes.** `Textarea` uses **16 px** text, a minimum height of **96 px** (from 140), no resize grip, and grows with
  its text up to 240 px (`field-sizing: content` where it is supported, with a small fallback script).
- **`SearchBox`.** It becomes **44 px**, radius **6 px**, with **no shadow**. The search icon is 20 px, 12 px from the
  left, and the text starts at 40 px. The browser's own clear button is hidden. In its place, while the field has text, a
  **28 px grey circle with a 14 px ✕** (accessible name "Clear search", with a 44 px hit area) sits 8 px from the right.
  Tapping it empties the field, fires the same change as typing, and keeps the focus.
- **Chips.** `Chip` and `.fh-chip` are **32 px** (min-height, from 34), 14 px/500, radius 6. The active chip stays
  ink-filled. A `ChipRow` scrolls sideways and never wraps a chip's text.

### Variables and attributes
In `globals.css`, exactly as SPEC.md's "Shared contracts" lists them:
- `--sat`, `--sab`, `--tab-h: 56px`, `--tab-total`, `--mini` (0 px; Part 6 sets it while the mini player shows), `--bottom-stack`,
  `--ease-out`, `--dur-move: 220ms`.
- Every rule that sits on the tab bar today (`.fh-main`'s bottom padding, `.fh-toast`, `.fh-reply`, `.fh-sticky-send`)
  is overridden to use `--bottom-stack`.
- Every rule that reads `env(safe-area-inset-*)` uses `--sat` or `--sab` instead (`.fh-tabbar`, and the 5 places in
  `in-app.css`; that file is Part 2's, but this mechanical change is allowed here).
- The rule `html:has([data-pushed-screen]) .fh-tabbar { display: none }` (under 1000 px), with `--tab-total` set to
  `var(--sab)` there. The rule `html:has([data-own-header]) .fh-topbar { display: none }` (under 1000 px), with a
  `--topbar-h` variable (56 px plus `var(--sat)`, or 0) that anything sticking under the bar uses: the founder-view strip
  and `.fh-report-actions`.
- For now the tab bar keeps today's look and simply gets `height: var(--tab-total)` with `padding-bottom: var(--sab)`, so
  the inset is added instead of taken out. Part 2 restyles it.

### Shared components (new, in `src/components/ui/`)
- `sheet.tsx`, `list-row.tsx` and `SectionLabel`, as SPEC.md describes them.
  - `Sheet` takes `title`, `footer` (a pinned row), `onClose`, `desktop: "dialog" | "popover"`, and
    `size: "auto" | "full"`. `full` covers the whole screen from `var(--sat)` down, with no grabber (Part 4's composer).
  - It uses the existing Radix dialog primitives if the repo has them (the user menu uses Radix), with focus trapped
    and restored.
  - It slides up over 250 ms, and does not move under reduced motion.
- `EmptyState` (`src/components/empty-state.tsx`) gets the new look and takes an `icon`. Its existing callers (admin
  pages, Jobs, Perks, not-found) keep working without changes.
- `page-outline.tsx` gets the outline pieces the parts need:
  - `OutlineListRows({ count, avatar: 48, pitch: 72 })`;
  - `OutlineChips` at 32 px;
  - `OutlineBox` defaulting to 44 px.
  Each part draws its own tab's outline from these pieces.
- The parts page (`src/app/parts/parts-gallery.tsx`) shows each new piece: a field and a button side by side, a search
  box with text, chips, a `ListRow` read and unread, a `Sheet`, and an `EmptyState`.

## Files this part owns
`src/components/ui/*` (button, input, textarea, select, search-box, chip, and the new sheet and list-row),
`src/components/empty-state.tsx`, `src/components/page-outline.tsx`, `src/app/globals.css`,
`src/app/parts/parts-gallery.tsx`, and the `env()` → variable change in `src/app/in-app.css`. No page or module file
changes. If a page breaks with the new sizes (it overflows or wraps), list it in the pull request for the part that owns
that page; do not fix it here.

## Checks (the verifier drives these)
1. On `/parts` at 390 and 1280 px:
   - a `Button` measures 44 px, a small one 36 px;
   - an `Input` and a `SearchBox` 44 px, a `Chip` 32 px;
   - every radius is 6 px, and the search box has `box-shadow: none`.
2. **Plain classes too:** Today's "Answer" (`.fh-btn-sm` inside the intro row) is 36 px, and Asks' chips are 32 px.
3. **People at 390 px:** the search box and Filter are both 44 px with a 6 px radius, and their edges line up (±0 px).
4. **Clear:** type "fintech" in People. The ✕ is the app's grey circle, not the browser's blue. Tapping it empties the
   field, keeps the focus, and brings back everyone. Its accessible name is "Clear search".
5. **16 px:** every field's computed `font-size` is 16 px: the Asks box, People search, a settings field, the Inbox box.
6. **Text box:** on Asks at 390 px, the box has no grip, starts at 96 px and grows to 240 px as lines are typed.
7. **Bottom of the screen:** with `--sab: 34px` on `html`, the tab bar is 56 + 34 = 90 px tall and its icons sit
   **above** the inset (their bottom at least 34 px over the screen's bottom edge). The page's last item and a toast both
   sit above the bar. Setting `--mini: 56px` on `html` raises both by 56 px more.
8. **Attributes:** adding `data-pushed-screen` to any element (in devtools) at 390 px hides the tab bar, and the page's
   bottom padding drops to the inset. `data-own-header` also hides the top bar, and the founder-view strip (as Maya
   viewing as a founder) moves up to the top.
9. **Sheet:** the parts page's sample sheet:
   - is at most 85% of an 844 px screen (718 px);
   - closes by the backdrop, Escape, and a drag down;
   - keeps the focus inside while open and returns it after;
   - sets and clears `data-sheet-open`.
   At 1280 it is a centred dialog.
10. **Admin:** Maya's members table and invites page at 390 and 1280 px, with the bigger buttons: nothing overflows its
    cell or wraps inside a button. Screenshots in `reports/`.
11. **No sideways scroll** at 390 px on the 5 tabs, a profile and `/me`. **At 360 and 300 px wide** (SPEC's small and
    large check), buttons and chips grow or scroll and nothing is cut.
12. `pnpm lint && pnpm typecheck && pnpm test` pass. Run `pnpm tour:build` if the tour test asks for it.
