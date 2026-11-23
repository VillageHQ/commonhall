---
id: ui-polish
status: planned
waits-on: []
size: about a day (a foundation part, then 5 parts side by side, then a store build)
touches: ["src/components/", "src/app/globals.css", "src/app/in-app.css", "src/app/layout.tsx", "src/shell/", "src/app/(app)/", "src/modules/messages/components/", "src/modules/intros/components/", "src/modules/asks/components/", "src/modules/members/components/", "src/modules/job-board/components/shared/company-jobs-card.tsx", "src/modules/voice/components/", "src/platform/native-app/bridge.ts", "mobile/src/", "mobile/package.json"]
---
# Spec: the app on a par with the apps people use (round 8)

**Direction:** the owner, 23 Nov 2026, after store build 4: the Inbox is unstructured and has a footer, the tab bar's
border touches its icons and switching tabs twitches, posting an ask should be one big box and one Post button, People
search has a short button beside a tall box, Today is weak, and Rooms should be as close as possible to X Spaces and
Clubhouse. Every tab and screen, on the phone and on the web. The evidence: [BENCHMARK.md](BENCHMARK.md) (our screens
measured against 75 reference screens). The approval: [CHARTER.md](CHARTER.md).

**The rule for every part:** copy a proven pattern and its sizes; invent nothing. No new features, data, settings or
menu items: every control in this spec exists today, and only its look and place change. Round 6 and 7 stay: 5 tabs
(Rooms · Today · Asks · People · Inbox), rooms start in one tap, fewer choices. The Commonhall look stays: paper and
ink, Newsreader titles, IBM Plex Sans text, Lucide line icons, the community's colour (`--fund`) on primary buttons, and
rust only for live and warnings.

## Depends on / check-ins
- **Part 1 (the foundation) runs first and merges before the others start.** It builds every shared part and contract
  below, so parts 2–6 never wait on each other. Parts 2–6 then run side by side, each in its own worktree, and each
  rebases on main before its pull request.
- **The forks below are picks, not yet decisions.** The council answers them before wave 2 starts. A changed answer is
  written into this section and the part files before the builders start.
- **Shared files have one owner each** (the table below). Any other part that needs a change there writes it into its
  pull request as a follow-up for the owner, and does not edit the file. `src/app/parts.css` is generated: nobody edits
  it, and overrides go in the owner's CSS file.
- **Proof for every part:** before / reference / after pictures side by side, at 390 px inside the app (web preview)
  and at 1280 px. The 14 key before pictures are in [reports/](reports/) (`before-*.png`, made-up demo people only).
  The full before set and the references are in the round's scratch folder (the orchestrator gives the path in each
  brief); Mobbin's pictures are never committed. The after pictures go to `reports/` too.
- **The store build:** parts 1–5 reach the store app through the site. Part 6's native changes need store build 5, which
  the round plans after the merges. Checks that need a real phone (the keyboard, real insets, audio) run on that build.

## Shared files and their owners

| File | Owner | Others |
|---|---|---|
| `src/components/ui/*` (button, input, textarea, select, search-box, chip; new `sheet.tsx`, `list-row.tsx`) | 1 | use them |
| `src/components/empty-state.tsx`, `src/components/page-outline.tsx` | 1 | use them |
| `src/app/globals.css` (sizes, variables, the attribute rules) | 1 | own CSS files only |
| `src/app/in-app.css`, `src/app/layout.tsx` (the demo banner's place), `src/components/page-header.tsx` (`BackLink`) | 2 | — |
| `src/shell/` frame files: `navigation-links.tsx`, `pressed-tab.tsx`, `app-shell.tsx`, `shell-chrome.tsx`, `user-menu.tsx`, `app-actions-group.tsx`, `source-code-link.tsx` | 2 | — |
| `src/shell/tab-outlines.tsx` | each part edits **only its own tab's function**; 2 owns the admin tabs' functions and the imports | Part 1 exports every outline piece the others need |
| `src/modules/intros/components/target-member-ask.tsx` (the intro-ask row, shown on Inbox and Today) | 3 | 4 places it unchanged |
| `src/shell/today-list.tsx` (Today, with its live card) | 4 | — |
| `src/modules/messages/components/start-conversation-button.tsx`, `src/modules/job-board/components/shared/company-jobs-card.tsx`, `src/shell/people-screen.tsx`, `src/components/alerts/room-mute-button.tsx` | 5 | — |
| `src/platform/native-app/bridge.ts` (the page's side) and `mobile/src/lib/bridge.ts` (the app's side) | 6 | — |

## Shared contracts (Part 1 builds them; every part relies on them)
- **The bottom of the screen**, as CSS variables on the root:
  - `--sat` and `--sab` are the top and bottom insets (`env(safe-area-inset-*, 0px)`). Nothing reads `env()` directly,
    so a verifier simulates a phone by setting `--sab: 34px; --sat: 47px` on `html`.
  - `--tab-h: 56px` is the tab bar's visible height, and `--tab-total: calc(var(--tab-h) + var(--sab))` is its full height.
  - `--mini: 0px` takes the mini player's real height while it shows: Part 6 sets `html[data-mini-player]` and
    `--mini` (56 px at normal text sizes).
  - `--bottom-stack: calc(var(--tab-total) + var(--mini))` is what everything pinned at the bottom sits on (sticky send
    rows, toasts, a thread's composer, a sheet's pinned row).
  - On a pushed screen, `--tab-total` is `var(--sab)`.
- **Attributes a page puts on any element it renders:** `data-pushed-screen` hides the tab bar under 1000 px.
  `data-own-header` also hides the community's top bar, and the page draws its own header (52 px plus `var(--sat)`).
  Part 1 writes the rules; Part 2 restyles the bars.
- **`Sheet`** (`ui/sheet.tsx`): under 1000 px, a bottom sheet with a 16 px top radius, a 36×5 px grabber, a dimmed
  backdrop, at most 85% of the screen high, scrolling inside, `var(--sab)` at its foot, and an optional pinned footer row.
  It closes by the backdrop, Escape, or a drag down of 80 px or more, traps the focus while open, and sets
  `html[data-sheet-open]`. From 1000 px it renders as a centred dialog (or as a popover where its caller asks).
  Every sheet in this spec is this one.
- **`ListRow`** (`ui/list-row.tsx`): the one row for people and conversations. It is at least **72 px**, with a
  **48 px** avatar at x 16 and the text column at **x 76**. Line 1 holds a 16 px/600 title and an optional right-hand
  13 px meta; line 2 a 15 px `--graphite` line (one or two lines); then an optional slot under it (a button, tags). It
  has an unread state (the title and line 2 ink and 600, an 8 px `--fund` dot or a count pill at the right of line 2) and
  a hairline from x 76. Inbox, People and Today's waiting rows all use it.
- **`SectionLabel`**: 13 px/600 `--graphite`, 20 px above and 8 px below. No capitals and no rule.
- **`EmptyState`**: a 48 px Lucide icon in `--graphite`, a 17 px/600 headline, a 15 px `--graphite` line at most 300 px
  wide, and at most one 36 px button, centred a little above the middle of the free space.

## Shared rules (sizes)

| What | Size | Where it applies |
|---|---|---|
| Control height, medium | **44 px** (a minimum: it grows with large text) | Single-line inputs, search fields, the button beside a field, primary page buttons, sheet buttons |
| Control height, small | **36 px** (minimum) | Actions inside rows and cards: Answer, Join, Remind me, I can help, Message, Read |
| Chip height | **32 px** (minimum) | Filter and scope chips. A row of chips scrolls sideways; it never wraps a chip's text |
| Control radius | **6 px** (`--r-sm`) | Every button, input, search field and chip. Exceptions: round icon buttons, and a thread's message box (20 px, as every messenger) |
| Card radius | **8 px** (`--r`) | Every card, room cards included. Sheets: 16 px on their top corners |
| Field text | **16 px** | Every input and text box (below 16 px, iOS zooms in on focus) |
| Button text | 15 px/600 (medium), 14 px/600 (small and chips) | |
| Avatars | 48 px in `ListRow`, 36 px for an author in a feed (Asks), 32 px in headers and composers, 64 px in a room's grid, 96 px on a profile | |
| Titles | a tab root's h1: 28 px Newsreader 600; Today's greeting (a sentence): 24 px; a pushed screen's h1: 24 px | |
| Fields | as today: a 1 px `--graphite` border, white (`--leaf`), the 2 px focus outline; **no shadow** | |
| Motion | 200–250 ms, `--ease-out` (`cubic-bezier(.2,.8,.2,1)`); none under `prefers-reduced-motion` | |
| Colours | from the tokens only: `--fund` and its text colour for primary, the live token for live dots (its own value in dark mode) | |

Two controls on one row always share a height and a radius. A clear button in a search field is the app's own grey
circle with an ✕, never the browser's. Heights are minimums: with large text, rows and buttons grow and nothing is cut.

## The room card (Part 6 builds it on Rooms; Part 4 builds Today's live card to the same sizes)
X Spaces' and Clubhouse's card, in the Commonhall look.
- An 8 px radius, `--leaf`, a 1 px `--rule` border (no tinted fill), 16 px of padding; cards 8 px apart.
- **Line 1:** the live dot (8 px, the live token, pulsing as today) and "Live" at 12 px/600 in the live colour, then
  " · " and the host's name in `--graphite`, 13 px.
- **The title** at 17 px/600 (Plex Sans), at most 2 lines.
- **The faces row:** up to 4 faces, the first **40 px** and the rest **28 px**, overlapping by 8 px with a 2 px `--leaf`
  ring, then today's words ("Priya + 4") at 14 px `--graphite`. A **36 px primary "Join"** sits at the right of the row.
- **The whole card joins** (a stretched link under the button, so no control is nested in another). The button is there
  for clarity.

## Accessibility (every part)
- Every icon-only button has an accessible name ("Back", "More", "Send", "Clear search", "Filter", "React", "Leave",
  "Raise hand"). Every tap target is at least 44×44 px, even where the drawn shape is smaller (the 28 px avatar button
  in the top bar, a 24 px icon).
- An action behind a long press also has a tap or keyboard path.
- Grey text uses `--graphite` (about 8.9:1 on paper; it passes in dark too). New colours come from the tokens.
- Emoji stay only where they are the content (the reaction picker, a member's own text), never as a button's icon.

## The parts

| # | Part | File | Runs | Size |
|---|---|---|---|---|
| 1 | The foundation: sizes, the bottom-of-screen variables, `Sheet`, `ListRow`, `EmptyState` | [parts/1-foundation.md](parts/1-foundation.md) | first, alone | ~1.5 h |
| 2 | The frame: tab bar, sliding tab switch, headers, menu sheet, no footer on phones, web layout, the admin's screens | [parts/2-frame.md](parts/2-frame.md) | wave 2 | ~3 h |
| 3 | Inbox: the list, the thread, the web's two panes | [parts/3-inbox.md](parts/3-inbox.md) | wave 2 | ~3 h |
| 4 | Asks and Today: the composer, the ask list, Today | [parts/4-asks-today.md](parts/4-asks-today.md) | wave 2 | ~3 h |
| 5 | People and profiles: search, results, the profile header | [parts/5-people-profile.md](parts/5-people-profile.md) | wave 2 | ~2 h |
| 6 | Rooms: the list, the live room (web and the store app), the mini player | [parts/6-rooms.md](parts/6-rooms.md) | wave 2 | ~4 h |

Each part file holds the target design with sizes, what differs on the phone and on the web, the files it owns, and the
checks its verifier runs. A builder reads this page and its own part file.

## Forks for the council (each with my pick)
1. **How a tab switch moves.** The owner asked for "a smooth slide, not a twitch". No reference slides between tabs:
   they swap instantly and keep each tab alive natively. **My pick:** on phones only, the new page slides 40 px in from
   the tapped tab's side and fades in, over 220 ms. The outline and the real page share one layout, so nothing jumps
   when the page lands. The native tab bar (smooth-app's Part D: one web view per tab) stays the fallback if store build
   5 still twitches. *Other options:* a full-width page slide (heavy, and it would slide an outline in), or Part D now
   (a day of native work, and still no slide).
2. **Where the source link goes on a phone.** The AGPL asks a network service to offer its source. **My pick:** under
   1000 px (app and browser), the menu sheet's last row says "Source code (AGPL-3.0)". The web keeps the link at the foot
   of the sidebar, and the centred public pages (sign-in, join, setup) keep their footer line. *Other option:* keep a
   footer on phones at the end of long pages only. This is a licence question, so it is the owner's call.
3. **The thread's look.** **My pick:** bubbles, as Airbnb, WhatsApp and Instagram do: mine ink on the right, theirs white
   with a hairline on the left. *Other option:* LinkedIn's flat rows (avatar, name, text).
4. **Raise hand.** **My pick:** one tap raises it and a short line confirms it ("Hand raised. The host sees it."); one tap
   lowers it. *Other option:* Clubhouse's confirm sheet first ("Got something to say?"), which adds a step.
5. **The mini player.** **My pick:** X's: a full-width 56 px bar docked right above the tab bar, with the main control
   (hand or mic) and Leave. *Other option:* Clubhouse's floating card (more decoration, same job).
6. **Bigger buttons.** Medium buttons go from 40 to 44 px and small ones from 32 to 36 px, everywhere, the admin's
   console included. **My pick: yes**, because 44 px is iOS's touch size and the owner's complaint is mismatched
   heights. The cost: pages get a little taller, and dense admin tables more so.
7. **The store app's icons and fonts.** **My pick:** add `react-native-svg` with `lucide-react-native`, and load the
   site's Newsreader and IBM Plex Sans in the app (`expo-font`). Both need store build 5, which is planned. *Other
   option:* keep the emoji and Georgia the owner saw.
8. **The phone header.** **My pick:** keep the community's bar (its mark and name) on every tab root, because members
   should always see whose app this is. Pushed screens show a back chevron with the previous screen's name instead.
   *Other option:* tab roots put their title in the bar (Linear, WhatsApp), and the community's name shows on Today only.
9. **Posting on a phone.** **My pick:** a prompt row ("Ask the community…") opens a full-screen sheet with Cancel, Post and
   one borderless box, as LinkedIn, X and Threads do. The web opens the same box in place, with Post at its bottom right.
   *Other option:* an inline box on the phone too, which keeps the keyboard and the tab bar on screen together.

## Checks every part's verifier also runs
- **Sizes:** at 390×844 inside the app (web preview) with `--sab: 34px; --sat: 47px` set on `html`, in a plain phone
  browser, and at 1280×800, nothing overlaps, is clipped or touches, and there is no sideways scroll at 390 px.
- **Small and large:** at **360×740**, and at **300×570** (how a 390 px phone feels with its text at 130%, since the app's
  text is set in px), no text is cut or overlaps, rows and buttons grow, chip rows scroll, and no label wraps inside a
  button. The real check runs on store build 5 on Android with the system font scale at 1.3 (the app doesn't fix the
  web view's text zoom, so members' own text size is kept).
- **Modes:** light and dark mode, and a bright community colour (set the accent to `#FFD400` in Set up). Primary buttons
  and dots stay readable, because they use `--fund` and its text colour.
- **Motion:** with `prefers-reduced-motion: reduce`, nothing slides, fades or pulses.
- **Heights:** every control the part touched is measured; two controls on one row have equal heights (±0 px) and radii.
- **Names:** every icon-only button the part touched has an accessible name (read the accessibility tree).
- **Tests:** `pnpm lint && pnpm typecheck && pnpm test` pass, and `pnpm tour:build` is rerun when a screen shown in the
  landing page's tour changed (`src/test/site-tour.test.ts` says which).
- **Pictures:** a before / reference / after picture per screen in the part's `reports/`, the after pictures taken by the
  verifier, who did not build the part. The data is the demo's seed as Sam (member) and Maya (admin), so outlines and
  pictures compare like with like.

## Decisions (council pass, 23 Nov 2026 — Rams, Torvalds, Watts, 3 of 3 unless noted)
1. **Tab switch: build the native tab bar NOW** (smooth-app SPEC Part D: a native tab bar, one web view per tab kept
   alive, shared sign-in cookies; native slide). In the store app the site's own tab bar is hidden. On the web, keep the
   site's tab bar (a short CSS slide is fine there). Test memory on a low-end Android in the web preview / APK notes.
2. Inbox conversations: **flat LinkedIn-style rows**, not bubbles.
3. Raise hand: **one tap + a confirmation line with Undo**, no confirm sheet.
4. Mini player: **X Spaces' docked 56 px bar** above the tab bar.
5. Button sizes 44/36 px in the **member app**; the admin console keeps its denser rows (2 of 3).
6. Store app: ship **the site's own icon SVGs and font file** (no big icon package) so the room screen matches.
7. Phone header: keep the community bar on every tab; pushed screens get a back button.
8. Posting on a phone: **full-screen composer sheet** (Cancel / Post at the top).
9. Source code link on phones: the menu's last row (Qareen's call: it stays offered to every user, as AGPL needs).
