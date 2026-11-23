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

## Part 4, Asks and Today (the prompt row, the composer, the ask list, Today)

### The composer (`src/modules/asks/components/asks-composer.tsx`, styles in `asks.css`)
- One client part, `AsksComposer({ member, allowance, draft, isComposing })`, on Asks and on Today. Closed, it is the
  prompt row (`.ak-prompt`: a 32 px face and the 44 px field-look button `.ak-prompt-btn`, "Ask the community…"; a button,
  so the page never raises the keyboard). The face comes from `readAvatarUrl`, as the top bar's.
- Under 1000 px it opens Part 1's `Sheet` at `size="full"` (`.ak-sheet`): Cancel (`.ak-cancel`) · the title · Post
  (`.ak-post`, small, 40% while under 2 letters) in the 52 px head; the author line with the week's allowance; the
  borderless 17/24 box (`.ak-box`, `#p-body`, it grows and the sheet scrolls); the toolbar (`.ak-tools`, two 32 px chips
  that scroll and never wrap) as the sheet's footer.
- From 1000 px it turns into the card `.ak-card` in place, with the chips and Post (44 px) in its foot. Escape with an
  empty box folds it back. The width comes from `use-is-wide.ts` (its own file so the landing tour can shim it to
  "always in place": `tour/src/shims/use-is-wide.ts`, listed in `tour/build.mjs`).
- The state (text, kind, target, company) is the composer's own, so it survives a resize between the two forms.
- "Who to reach" opens the two target fields under the text (the chip turns ink, `aria-expanded`). "Post a win" switches
  the kind to an update: the title "New win", the win placeholder, no allowance line (wins don't count), no target
  chip, and the chip reads "Post an ask".
- Cancel with text opens a small `Sheet` ("Discard this ask?": Keep editing · Discard); Keep editing puts the focus back
  in the box. Escape in the full sheet runs the same Cancel.
- Enter (no Shift) still posts: an ask is one line and the server joins lines. A post goes to `/asks?m=posted|posted0|updated`
  (Asks › Open with the page's confirmation), from Asks and from Today. Pinned asks stay above it.
- Opening on arrival: `?compose=1`, a drafted ask (Find candidates' `?ask=…`) or `#compose`.
- On a phone whose keyboard doesn't resize the page (iOS), `visualViewport` sets `--kb` and `html[data-keyboard]`
  while the sheet is open, and the sheet stops at the keyboard's top, so the toolbar sits right above it.

### The ask list (`post-parts.tsx` › `PostCard`, `clamped-body.tsx`)
- `.ak-post-item`: a 36 px face, the name (15/600) with the age and the quiet words "Pinned", "Update", "Answered",
  "Closed" at the right (12 px with a 14 px icon; the pill stays on the ask's own page), the company line (13 px, its
  16 px logo). The body is 16/24, cut at 4 lines by `ClampedBody`, which shows "more" only when something was cut.
- Under it one line (`.ak-meta`): "N answers" (`MessageCircle`), "You could help", the helpers on Yours, "Mark
  answered", and For you's "Not for me". Their tap areas reach 44 px through `::after`.
- The page: the title (4 px under it), the prompt row, the search 12 px under it, the chips 12 px under that.

### Today (`src/shell/today-list.tsx`, `today.css`, `today-actions.tsx`)
- The head is Today's own (`.td-head`: the 13 px date, the 24 px Newsreader greeting), then the prompt row 16 px under it.
  `/today` reads the allowance and the face for it.
- "Waiting on you" keeps round 7's place (first, above the live card; `today-list.test.ts` guards it). Intro asks for
  the member's yes are Part 3's `TargetMemberAsk`, unchanged; the others are `ListRow`s (48 px face, 2 lines, a 36 px
  Answer or Read in the slot) in `.td-rows`, which reaches the column's edges (`margin: 0 -16px`).
- The live card is the room card (`.td-live`): the dot, "Live" and the host; a 17/600 title; faces 40 then 28 px; a 36 px
  Join. The title's link stretches over the card, under Join.
- "You could help" cards (`.fh-titem.td-card`): a 32 px face and name, the ask cut at 4 lines, and `.td-pair`: two equal
  36 px buttons that stack where the card is under 240 px inside (a container query).
- "Is this right?" → "Fix it": the field and Save are stacked, so a 44 px field and a 36 px button never share a row.
- "More for you": 48 px rows with the module's own icon (from its manifest) and a chevron.
- Every button on Today is 36 px.

### The outlines (`src/shell/tab-outlines.tsx`, Today's and Asks' functions)
- Drawn with global classes and inline sizes (not `today.css` / `asks.css`, which load with the pages), so they land
  where the page does: 0 px apart at 390 and 1280 (the verifier's check 11).

### Left for others
- Part 3: the intro-ask card on Today is still a card with medium buttons.
- Members: `LookupQuestionCard` on Today has medium buttons.
- The install card's ✕ is 16×24 (only its buttons were Part 4's).
- The web card has no Cancel: Escape folds only an empty box (as the part file says).

## Part 7, the store app's own tab bar (smooth-app Part D)

The spec: [parts/7-native-tabs.md](parts/7-native-tabs.md). All of it is in `mobile/`; the site is unchanged.
- **`PortalTabs`** (`mobile/src/components/PortalTabs.tsx`) replaces the single `PortalView` in `PortalScreen`. It keeps
  one `PortalView` per tab, keyed by a view id with a `home` (the tab's own path). Hidden tabs keep their full size
  under the open one (`opacity: 0`, no touches, hidden from screen readers): a 0×0 view would make the page lay itself out
  again and lose its scroll. It exposes the same `PortalHandle` as before: `call` and `reload` go to the open tab,
  `setPushToken` and `roomClosed` to all, and `navigate` opens the tab the path belongs to.
- **The page's side** is a script string (`buildTabsScript` in `mobile/src/lib/tabs.ts`) injected with the bridge's
  bootstrap (and run with `eval` in the web preview's iframe; the portal has no script-src policy). It reads the site's
  member bar (`[data-slot="tab-bar"]` without `/admin` links) after every DOM change (a `MutationObserver`, 40 ms
  coalesced, sent only when it differs) and hides it with an adopted style sheet (`visibility`, so `display` still says
  whether the site would show it). It catches taps on links to another tab's own path in the capture phase on `window`,
  before Next's `Link`. `__commonhallTabs.go(path)` clicks the hidden bar's own link for a client-side move.
- **A web view can change tab:** when a page moves itself to another tab's own path (a `router.push`, the landing page after
  sign-in) and that tab has no web view yet, the web view becomes that tab (`home` changes).
- **Low memory:** an Android phone under 3 GB (`expo-device`'s `totalMemory`) keeps at most 3 tabs alive, dropping the
  least recently shown; others keep all 5. A tab that fails while hidden is dropped and loads again when opened.
- **Slide:** one `Animated.Value` for the open tab, started in a layout effect after the tab is drawn (started before it
  is bound, the web build never moved it).
- **Memory in the web preview** (desktop Chromium, 390×844, Sam, 23 Nov 2026): one tab 11 MB JS heap, 657 DOM nodes;
  all five tabs 24 MB, 3,253 nodes. On a phone each web view also costs its renderer's memory; the real numbers on a
  low-end Android come from store build 5 (Android Studio's profiler).

## Part 2, the frame (tab bar, tab switch, headers, menu sheet, no footer on phones, web width)

All of the frame's look is in `src/shell/frame.css`, loaded by `src/app/layout.tsx` after `globals.css` and `in-app.css`.

### The tab bar (under 1000 px)
- 56 px visible plus `--sab`; the bar's `min-height` is `--tab-total`, so large text grows it. Inside a tab: the 1 px top
  border, the icon 9 px under it (24 px, stroke 1.5; 2 when current), 3 px, the label 11/13 with an ellipsis
  (`.fh-tab-label`). The current tab is ink and 600; the others `--graphite`.
- **One indicator** per bar: `[data-slot="tab-indicator"]` (`.fh-tab-ind`), one column wide with a 28×3 px `::after`,
  moved by `transform: translateX(n × 100%)`. React sets `--tab-i` (the current tab's index) on it and `--tab-n` on the
  bar; a press sets `--tab-press-i` on the bar (`pressTab` in `pressed-tab.tsx`, removed by `endPress`), so it slides to
  the pressed tab over `--dur-move` before the page comes. `data-off` hides it where no tab is current; reduced motion
  makes it jump.
- The count pill and the live dot (`.fh-tab-dot`) share one place: top 6 px, `left: calc(50% + 7px)`, a 2 px Leaf ring.
- **The store app's own tab bar** (Part 7): the site's bar hides only under `html[data-app][data-native-tabs]`, and
  `--tab-h` becomes 0 there. Today's store build sets only `data-app`, so it keeps the site's bar. Part 7's app must set
  `document.documentElement.dataset.nativeTabs` in its bootstrap.

### The tab switch
- `slideIn()` in `pressed-tab.tsx`: on a tap of a tab-bar link with an outline, under 1000 px and without reduced
  motion, the page area (`[data-slot="page-width"]`, which stays across pages) runs a Web Animation from
  `translateX(±40px)`, opacity 0, over 220 ms. The side follows the links' order in the bar (`data-index`). Because the
  animation lives on the area and not on the page, the real page landing mid-slide finishes the same slide.
- `.fh-main` clips sideways (`overflow-x: clip`) under 1000 px: without it the slide widened the page, the phone zoomed
  out and the fixed tab bar left the screen for a moment.
- Tapping the tab already shown (`href` equals the address with its query) prevents the navigation and scrolls to the
  top, smoothly unless reduced motion.
- The admin tabs' outlines (`tab-outlines.tsx`: Home, Members, Asks, the intro log, Announce, Set up) were reshaped to
  their pages at 390 px; `TextLine` draws a bar inside a line box of the page's own height.

### The top bar and the back button (under 1000 px)
- The page's h1 is 16 px under the bar (`.fh-main` top padding). The avatar button (`.fh-avatar-btn`) is 44×44 around
  the 28 px face, with `margin-right: -8px` so the face keeps its place.
- `BackLink` (`page-header.tsx`) now wraps its label in a span and carries `data-slot="back-link"`. Pages keep calling
  it. Inside the app shell on a phone, CSS fixes it over the bar's left side (`top: calc(var(--sat) + 6px)`), 44 px
  tall, a 24 px chevron and 17 px ink text; the fund mark hides and the page's `.fh-h1` is 24 px
  (`.fh-app:has(.fh-main .fh-back)`, not while a tab's outline shows). Pages with `data-own-header` hide it. Outside
  the shell (`/public/board`) and from 1000 px it stays in the page.
- The demo band: `layout.tsx` keeps its band for pages without the shell and for 1000 px and up; the shell renders a
  second band right under the top bar, shown under 1000 px only. In the app, a band at the top of a page without the
  bar pads by `--sat`. `--demo-h` (34 px) is set on html while a band is in the body.

### The menu sheet, no footer on phones
- `user-menu.tsx` builds the menu once (`useMenuGroups`: Settings, More, This app, then the view switch, Dark mode,
  Sign out) and draws it twice: `AccountMenu` (the Radix dropdown, from the sidebar's foot) and `PhoneAccountButton`
  (a `Sheet` with the member's 48 px face and name at its top, `SectionLabel`s, 48 px `.fh-menu-row`s, Dark mode as a
  `role="switch"` row), so the two lists can't drift apart. The sheet's last row is "Source code (AGPL-3.0)"
  (`SOURCE_CODE_URL`). `app-actions-group.tsx` now only gives the "This app" items (`useAppActionItems`).
- `PhoneFoot` is no longer in the shell (the parts page still shows it). The sidebar keeps the source line or the
  product credit.
- The dropdown is at most `calc(100vh - 80px)`.

### The web (1000 px and up)
- `ShellFrame` (in `navigation-links.tsx`) is the shell's outer `.fh-app` and marks it `data-mode="member|console"` and
  `data-tab-root` on a member tab's own address. There the page area is at most 960 px and the tab's `.td-page` or
  `.fh-narrow` root drops its 720 px. At 1280 the column is 936 px, so all five tabs share left 304 and width 936.
- The sidebar is `calc(100vh - var(--demo-h))` tall and its menu scrolls inside, so its foot shows under the demo band.

### Left over (found while building and verifying Part 2)
- At 1280, after scrolling past the demo band, the sidebar's foot rests 34 px above the window's bottom (it is sized for
  the band, which has scrolled away). Cosmetic.
- On a pushed screen the back button comes after "Your menu" in the Tab order (it is in the page, drawn over the bar).
- Rooms' outline misses its first section by about 34 px (Part 6's); Today's and Asks' row pitches differ by 16–18 px
  (Part 4's).
- Opening the desktop dropdown scrolls the page a little (already so on main).
