# ui-polish: how it works today

## Part 1, the foundation (sizes, the bottom of the screen, Sheet, ListRow, EmptyState)

### Sizes live on the plain classes
`src/app/parts.css` is generated, so every size override is in `src/app/globals.css`, in the block "Round 8's foundation"
at its end. `parts.css` is imported unlayered, so it beats Tailwind's utilities: a utility class on a `Button` (`min-h-…`)
does not change its height. The sizes are therefore set on the classes themselves, and the `Button` part only adds them:
- `.fh-btn`: `min-height: var(--ctl-h)` (44 px), `height: auto`, radius 6, 15/20. `.fh-btn-sm`: `var(--ctl-sm-h)` (36 px), 14 px.
  `size="icon"` adds `.fh-btn-icon` (44×44, as `.fh-iconbtn`).
- **The admin's console keeps 40 and 32 px** (council decision 5): `.fh-app:has(> [data-slot="tab-bar"] a[href^="/admin"])`
  sets `--ctl-h: 40px; --ctl-sm-h: 32px`. The console's tab bar is the only one whose tabs go to `/admin`, and it is in the
  page at every width. A cleaner hook (a `data-mode` on the shell) would be Part 2's to add.
- Fields (`.fh-input`, `.fh-select`, `.fh-textarea` and the `Input`/`Select`/`Textarea` parts): 16 px text, no shadow,
  `Select` 44 px.
- Text boxes: at least 96 px, at most 240 px, no grip, `field-sizing: content`. `Textarea` is a client part and sizes itself
  by hand where `field-sizing` is missing (older Safari). The Asks box (`.fh-composer .fh-askbox`) starts at 96 px too.
- `SearchBox`: 44 px, radius 6, no shadow; a 20 px icon 12 px in. It is a client part: while it holds text it shows
  `.fh-search-clear` ("Clear search", a 28 px grey circle in a 44 px tap area). Clearing calls the input's own value setter
  and sends an `input` event, so a controlled field's `onChange` runs as if the member had typed; the focus stays.
- `.fh-chip`: at least 32 px (`--chip-h`), 14/500, never wraps its text.

### The bottom of the screen
On `:root` in `globals.css`: `--sat`, `--sab` (the only readers of `env(safe-area-inset-*)`), `--tab-h: 56px`,
`--tab-total`, `--mini: 0px`, `--bottom-stack`, `--topbar-h` (56 px; 56 + `--sat` under `html[data-app]`), `--ease-out`,
`--dur-move`. A verifier simulates a phone by setting `--sab: 34px; --sat: 47px` on `html`.
- Every override of these sits **on `html`** (the same element as `:root`), so the sums declared there follow. Setting
  `--tab-total` on a child would not change `--bottom-stack`.
- The tab bar is `height: var(--tab-total)` with `padding-bottom: var(--sab)`: the inset is added under the 56 px.
- Under 1000 px, `.fh-main`'s bottom padding, `.fh-toast`, `.fh-reply`, `.fh-sticky-send` and the room's `.vr-bar` sit on
  `--bottom-stack`.
- `html:has([data-pushed-screen])` hides `.fh-tabbar` and sets `--tab-total: var(--sab)`; `html:has([data-own-header])`
  hides `.fh-topbar` and sets `--topbar-h: 0`, so the founder-view strip and `.fh-report-actions` stick at the top.
- `in-app.css` reads `--sat` and `--topbar-h` instead of `env()`.

### The shared parts
- `src/components/ui/sheet.tsx`, `Sheet`: Radix `Dialog` (focus trapped and returned, Escape, backdrop). Props: `isOpen`,
  `onClose`, optional `trigger` + `onOpen`, `title` (`isTitleHidden`), `description`, `headStart` / `headEnd` (the end
  defaults to a ✕ "Close"), `footer` (a pinned row), `desktop: "dialog" | "popover"` (popover needs a `trigger`; it is a
  Radix `Popover` from 1000 px), `size: "auto" | "full"`. A drag down of 80 px on the grabber or the head closes it (not on
  `full`). `html[data-sheet-open]` is set while any sheet is open (a counter, so a sheet over a sheet works). Styles:
  `.fh-scrim`, `.fh-bsheet*`, `.fh-bpop` in `globals.css` (`.fh-sheet` was already the name of a card).
- `src/components/ui/list-row.tsx`, `ListRow` (`.fh-lr`): `face`, `title`, `href` (a stretched link, so the `below` slot's
  buttons are not inside it), `meta`, `line`, `lines`, `isUnread`, `count`, `below`. `SectionLabel` lives in the same file.
- `src/components/empty-state.tsx`, `EmptyState` (`.fh-empty-state`): centred, an optional 48 px `icon`, and any button
  inside is drawn at 36 px. Pages that write `.fh-empty` themselves keep the old dashed box.
- `src/components/page-outline.tsx`: `OutlineListRows({ count, avatar, pitch })`; `OutlineChips` are 32 px and
  `OutlineBox` defaults to 44 px.
- `/parts` (with `SHOW_PARTS_PAGE=true`) shows them first, under "Round 8: shared sizes and parts"
  (`src/app/parts/round8-parts.tsx`).

### Left for the other parts (found while building and verifying Part 1)
- Part 5: the profile's "Don't notify me about <name>'s rooms" wraps onto two lines at 390 px and narrower (already so on
  main); Part 5 moves it into the profile's "More" sheet.
- Part 4: the Asks box now starts at 96 px beside a 44 px Post button (Part 4 rebuilds the composer); Today's "I can help"
  and "Not for me" are still medium (44 px) buttons, while the size table lists them as small actions.
- Part 6: `src/modules/voice/components/voice.css` still reads `--tab-h` for `.vr-bar` (`globals.css` overrides it for now).
- Not owned by any part: `confirm-dialog.tsx` (admin) and the feed's `composer.tsx` still read `env(safe-area-inset-bottom)`
  in their classes; they could move to `Sheet` or `var(--sab)`.
