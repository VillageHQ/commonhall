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

## Part 3, the Inbox (the list, the thread, the web's two panes)

The spec: [parts/3-inbox.md](parts/3-inbox.md), with the council's decision 2 (the thread is flat rows, not bubbles).
Styles: `src/modules/messages/components/inbox.css` (classes `ib-*`), loaded by `inbox-panes.tsx`.

### The frame: one layout, two panes
- `src/app/(app)/inbox/layout.tsx` (owner: members, as the page) reads the intros and the first page of conversations
  and renders `InboxPanes` (`inbox-panes.tsx`) with the list views; its child is the right pane: `/inbox` is
  "Pick a conversation", `/inbox/<id>` the thread. A layout keeps its place across navigation, so on the web the list
  stays beside the thread, and opening a row only changes the address (Back works). Each page still guards itself.
- `InboxPanes` picks All or Intros from `?show=intros` (a layout gets no search params) and reads the open thread with
  `useSelectedLayoutSegment()`. Under 1000 px, `data-open="list"|"thread"` shows one pane; from 1000 px both show in
  one card (360 px list), and `useFillHeight` sets the card's height to the window under it (24 px left at its foot).
- The selected row: `ConversationRow` reads `useParams().conversationId` and sets `data-selected` and `aria-current`.

### The list
- Every row is Part 1's `ListRow`. A conversation passes its own `Link` as the title (the stretched link still covers
  the row), the time (`inbox-time.ts`: "14:05" today, "Tue" this week, "21 Nov" before, in the reader's time zone), the
  last line with "You: " when it is theirs, and the unread dot or count.
- Intro rows (`intros-list.tsx`) are `ListRow`s too: "Asks you for an intro to …" with an outlined 36 px "Answer" (a
  second link to the intro, hidden from the keyboard because the row's link goes there), and on the Intros chip the
  status word at the right of line 2 (`LineWithStatus`).
- `TargetMemberAsk` (Today and Inbox) is a `ListRow` whose "Answer" opens the intro's words and Yes / No thanks in the
  row (focus moves to Yes). It uses only shared classes and utilities, because `inbox.css` isn't loaded on Today.
- Empty: `EmptyState` (Inbox icon, "No messages yet", "Find someone"). The rows reach the screen's (or pane's) edges with
  `margin-inline: -16px`.
- The outline (`tab-outlines.tsx`, Inbox's function) uses inline offsets, since `inbox.css` loads with the page: 0 px
  apart from the real first row at 390.

### The thread
- On a phone `.fh-main` has no top padding over a thread (its header starts at the page's top) and only the strip under
  the bar at its foot.
- `thread.tsx` sets `data-pushed-screen` and `data-own-header` (Part 1's contract): no tab bar or community bar on a
  phone; in the store app the native tab bar (Part 7) hides on it too. `ThreadHeader`: Back "Inbox" (hidden in the web
  pane), the 32 px face and name as one link to the profile, and More (a `Sheet`, a popover on the web) with
  "Block <name>" and its confirmation. `ThreadIntro`: the 64 px face, the name, their title and company, View profile,
  and the email-replies line; it shows once the oldest message is loaded.
- Messages (`message-row.tsx`) are flat rows: a run (one sender, one day, gaps under 10 minutes) starts with a 36 px
  face and "name · time"; the rest of the run is the words alone. Each message holds a visually hidden button
  ("<sender>, <day>, <time>", `aria-expanded`) for the keyboard; a tap on the words (not on a link, not while text is
  selected) toggles the same line: the moment and Delete (yours) or Report (theirs), which open the old confirmations.
- The reply bar (`message-composer.tsx`): a 40 px round box that grows to 120 px (set by hand from `scrollHeight`) and a
  40 px round Send, disabled until there are words; Enter sends only with a fine pointer. On a phone the bar is fixed at
  `bottom: var(--bottom-stack)` with paper under it to the screen's edge (`::after`), and the thread keeps the bar's
  height as its bottom padding (`--ib-compose-h`, from a ResizeObserver). On the web it is the pane's foot.
- Scrolling: the thread opens at its newest message (again one frame later); a message you send, or one that arrives
  while you're near the newest, scrolls into view. "Show older messages" measures the oldest message before and after,
  so it stays put whether or not the browser already anchored it. The page scrolls on a phone; the pane on the web.
- `/messages/new` (`new-thread.tsx`) is the same header, intro and bar; `readNewMessageTarget` now returns the person
  as a full `ConversationPeer` (title, company, face).

### Left for others
- Part 4: Today places `TargetMemberAsk` outside `.td-rows`, so that row sits 16 px in from the other rows; wrapping
  it in `.td-rows` (today-list.tsx) lines it up.
- Part 2: in the store app on a demo, a thread's header adds the status bar's inset under the demo band (the band
  already pads by it) until the page scrolls; outside the demo there is no band.

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
- **The store app's own tab bar** (Part 7): the site has no rule for it. The app hides the member bar with `visibility`
  (it reads the bar's `display` to know when the site would hide it) and sets `--tab-h` to its own bar's height, so a
  `display: none` or a `--tab-h` here would break it. The native bar copies this bar's icons and computed colours.

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

## Part 5, People and profiles (search, results, the profile header)

### People (`/people`)
- `member-directory.tsx` renders inside `.fh-people-page`; every rule is in `src/modules/members/components/people.css`,
  scoped under `.fh-people-page` or `.fh-profile-page` (the plain `.fh-people` and `.fh-person` names are already
  taken in the generated `parts.css`). The file is imported by `member-directory.tsx` and `profile-actions.tsx`, and by
  the landing page's tour through `tour/src/tour.css`.
- The search row: `SearchBox` and `FilterButton`, both 44 px. Under 1000 px Filter is a 44×44 icon and its word is
  screen-reader only, so its name stays "Filter"; the count pill (`.fh-people-filter-count`) counts the panel's filters,
  not the view (the view has chips).
- The view chips (`DirectoryViewChips`) replace the old "Mentors and experts" link and the panel's Everyone / Experts
  switch. "Mentors and experts" keeps `data-slot="people-view-link"` (the tour taps it).
- The filter panel (`FilterPanel`) opens as Part 1's `Sheet` under 1000 px and in place from 1000 px, and also in place
  inside a shadow root (the tour), where a sheet's portal would land outside. The place is read when Filter is tapped.
  Filters still apply as they change (`replaceState`, the same addresses), so "Show N people" only closes the panel;
  "Clear all" clears every counted filter and keeps the words and the view. On close the focus goes back to Filter
  (`useFocusBackOnClose`), since the sheet is opened without a trigger.
- Rows are Part 1's `ListRow` (`MemberRow`, `ExpertRow`) with a 48 px face. Under 1000 px the list runs edge to edge
  (`margin-inline: -16px`) so the face is at x 16 and the text at x 76. Line 2's company mark is the logo or a 16 px
  letter square (`.fh-people-co-letter`, `overflow: hidden` so it sits on the same baseline as a picture). At most two
  tags, then "+N". The expert row's Book a call sits in the slot on a phone; from 1000 px the slot is `position: static`
  so the button is placed on the row (right 16 px, centred) above the stretched link.
- "Search their networks for …" and "Connect your network …" are one 56 px row (`.fh-people-netrow`, in
  `src/shell/people-screen.tsx`), under the list or under the empty state.
- The tab outline (`PeopleOutline` in `src/shell/tab-outlines.tsx`) uses only the outline parts already imported there
  (the file's imports are Part 2's) and Tailwind classes; it matches the page within 2 px at 390 and 1280.

### A profile (`/people/<id>`)
- `PersonHead` (in `profile-head.tsx`; the older `ProfileHead` stays for `/me`): the 96 px photo, the 24 px serif name,
  the headline ("Title, Company") and the place on their own lines.
- `ProfileActions` (`profile-actions.tsx`): the action row. The page picks the buttons: the primary is "Ask for an
  intro", or Message when no ask can be made; the outlined second is Book a call where it shows, else Message; Message
  with no place moves into "More". "<first name> has paused intro asks" is a note under the row. The row measures the
  two labels (a `Range` over each button) and sets `data-stacked` when two equal buttons and "More" can't fit, so a
  label never wraps; from 1000 px the buttons are sized to their words.
- `ProfileMore`: Part 1's `Sheet` with `desktop="popover"` and the More button as its trigger. It holds `RoomMuteButton`
  (now a `role="switch"` row with fixed words and a drawn switch) and `BlockMemberButton` (a row that asks first, in
  place). The Block text button at the page's end is gone.
- Cards: `.fh-profile-page .fh-prof` is a grid with 16 px gaps, cards pad 16 px, card titles are 19 px Newsreader. The
  job tiles' Apply (`apply-link.tsx`, not this part's file) is restyled from `people.css` through the card's
  `.fh-company-jobs` class: 36 px, outlined, radius 6, full width.

### Left for the other parts and follow-ups
- People's web column is Part 2's page width (936 px at 1280), as every tab's; on a phone the profile's photo starts
  16 px under the bar, where Part 2 puts the back button.
- The mute confirmation (a flash) shows under the More sheet's dimmed backdrop while the sheet is open.
- The drawn switch's off colour is `#b5b4ad`, as the app's `Switch` part; neither is a token yet.
- The "own words" card's first label starts lower than other cards' (FieldBlock's own top margin; already so on main).
## Part 6, Rooms (the list, the live room, the store app's room and its mini bar)

### The web (`src/modules/voice/components/`, `voice.css`)
- **The list** (`rooms-board.tsx`, `room-start.tsx`'s `RoomsHead`, `room-alerts-switch.tsx`): the board draws its own
  head, so the page has no `PageHeader`: "Rooms" with a 36 px primary "Start a room" on its row, and today's line with
  "Schedule for later" under it. Then `SectionLabel`s "Live now" and "Coming up" over the room cards, the `EmptyState`
  (`AudioLines`) when there is neither, and the Room alerts row (bell, label, Quiet times, the switch) last. A card is
  joined anywhere: the title's link stretches over it (`.vr-stretch::after`), Join and Remind me sit above it
  (`.vr-over`), and the faces and their words let taps through (`pointer-events: none`). Two columns from 760 px, rows
  of one height.
- **The room page** (`rooms/[roomId]/page.tsx`) carries `data-pushed-screen data-own-header`. `room-header.tsx` holds
  `RoomHeader` ("‹ Rooms", Leave or End room, and a 44 px "More" `Sheet` with Rename for the host, Leave when End room
  took its place, "Back to listening" on stage, and "Never recorded.") and `RoomTitle` (22 px Newsreader, one line
  under it). Rename lives in that sheet (`rename-room.tsx` is gone). On a phone the header is sticky under the status
  bar; from 1000 px it tops a 640 px column.
- **The live room** (`live-room.tsx`): one grid of 64 px faces (columns at least 84 px; 6 from 1000 px) under "On
  stage" and "Listening", each with a role line or "Hand up". A face a moderator can act on opens its actions in a
  `Sheet`. The bar (`.vr-dock` > `.vr-bar`, 88 px) is fixed on `--bottom-stack` under 1000 px and sticky at the
  column's foot from 1000 px; the raised-hands chip sits above it. React and Chat open sheets on a phone and panels
  from 1000 px (brought into view above the bar). Raise hand shows "Hand raised. The host sees it." with Undo for 4 s
  (council: one tap plus Undo; 4 s so Undo can be reached). A member whose role goes from listener to the stage while in
  the room sees the banner for 6 s ("<host> brought you on stage. Your mic is off.", Unmute, Back to listening); that
  is watched in `refresh`, from the first time the room names the member, so joining as the host doesn't count.
- `.vr-bar` no longer reads `--tab-h`; Part 1's `html .vr-bar { bottom: … }` override in `globals.css` now does nothing
  (the bar sits inside `.vr-dock`) and can go.

### The store app (`mobile/`)
- `src/theme.ts`: the site's token values (live colour = the site's `--ribbon`, #9c4e22 / dark #e7a57e) and `FONTS`,
  one family per weight (Android can't pick a weight from one file, so never set `fontWeight` with them).
  `src/fonts.ts` (`useAppFonts`, called by `PortalScreen`) loads `assets/fonts/` with expo-font: IBM's own static Plex
  Sans cuts (unwrapped from WOFF2, unchanged: "Plex" is a Reserved Font Name) and a SemiBold cut of the site's
  Newsreader file. Licence: `assets/fonts/OFL.txt`.
- `src/voice/icons.tsx`: the site's Lucide icons as paths on `react-native-svg` (no icon package).
- `src/voice/RoomDock.tsx`, `useRoomDock({ portal, origin, onRenamed })`: the open room, its sheet (`RoomScreen`, drawn
  over everything and kept while minimised so the room plays on) and its mini bar (`MiniPlayer`). `PortalScreen` hands
  `dock.openRoom` to `PortalTabs` as `onOpenRoom` and `dock.miniBar` as its `bottomSlot`; Part 7's `PortalTabs` places
  the slot right above the native tab bar (above the home indicator on a pushed screen), hides it while a page sheet,
  menu or the keyboard is up, and sends every tab's page the slot's height in its frame (`--mini`,
  `html[data-mini-player]`), so `--bottom-stack` lifts what the page pins at the bottom.
- `RoomScreen` is a sheet (top at `insets.top + 8`, 16 px radius, slides up over 250 ms, none under reduced motion);
  the chevron, the dimmed strip above it, or a drag of 120 px on its head minimises it. The mini bar's main control and
  Leave act through its ref (`RoomControls`); it reports `RoomState` up. No chat in the app.
- The page side (`src/platform/native-app/bridge.ts`) is unchanged: Part 7's frame script does the page's part.
