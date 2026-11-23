# Part 2: the frame (tab bar, sliding tab switch, headers, menu sheet, no footer on phones, web layout, the admin's screens)

Read [../SPEC.md](../SPEC.md) first. Starts after Part 1 has merged; runs beside parts 3–6. About 3 hours.
Evidence: [BENCHMARK.md](../BENCHMARK.md) §1, 2, 8, 9. Part 1 already added the inset to the bar's height and built the
variables, the attribute rules and `Sheet`; this part restyles and moves.

## 1. The tab bar (under 1000 px; the same in the app and in a phone browser; members' and admins' bars alike)
Models: Airbnb's and Instagram's bars, with Facebook's line on the top edge.
- **Height:** `min-height: var(--tab-total)` (56 px visible plus `--sab` padding). *The contract with Part 6:* the
  visible bar is 56 px.
- **Inside the 56 px:**
  - the icon starts **9 px** under the top border;
  - icons are **24 px** (from 22), stroke 1.5;
  - then 3 px, then the label at 11 px/13 px, on one line with an ellipsis if it is too long.
  - The border stays a 1 px `--rule` hairline, and the background `--leaf`.
  - With large text the bar grows rather than clipping.
- **Active tab:**
  - the icon and label turn ink;
  - the label is 600 (500 when inactive), and the icon stroke 2 (1.5 when inactive);
  - inactive tabs are `--graphite`.
- **The indicator:** a **3 px line, 28 px wide, centred on the tab, on the bar's top edge** (Facebook's). It is one
  element for the whole bar, and on a press it **slides** to the tapped tab over `--dur-move` with `--ease-out`. It works
  for any number of tabs (members have 5; an admin's bar has its own set, and `data-count="8"` exists).
- **Badges:** one position for all. The count pill (16 px) and the live dot (8 px) both sit at **top 6 px, left 50% +
  7 px**, with a 2 px `--leaf` ring.

## 2. The tab switch: a short slide, no jump (fork 1 in SPEC.md)
- **On a tab tap (under 1000 px):**
  - the outline of the next page appears at once, as today;
  - it **slides in 40 px from the tapped tab's side while fading from 0 to 1, over 220 ms**;
  - "Side" follows the bar's order on screen (`orderTabs()` in `navigation-links.tsx`): a tab to the right of the current
    one comes in from the right;
  - the tab bar and the top bar don't move. The old page is replaced, not animated out.
- **When the real page lands:** it replaces the outline **without motion and without a jump**: within 8 px for the
  heading, the first row's top, and the row pitch. Each part fixes its own tab's outline function in `tab-outlines.tsx`
  (Inbox 3, Asks and Today 4, People 5, Rooms 6). **This part owns the admin tabs' outlines**: Home, Members, Announce,
  Set up, and the console's Asks. It also owns the imports at the top of the file.
- If the page arrives before the slide ends, the slide finishes on the real page (no restart, no flash).
- Tapping the current tab scrolls it to the top smoothly and doesn't reload it.
- **The web (1000 px and up):** no slide. `prefers-reduced-motion: reduce`: no slide or fade, and the indicator jumps.
- How to build it is the builder's choice. A CSS animation on the content container, keyed on the tab's index, is
  enough. The View Transitions API is fine where it is supported, with a plain fallback.

## 3. The header (under 1000 px) (fork 8)
- **Tab roots** keep today's 56 px community bar: the mark, the name and the avatar. The avatar's drawn size stays
  28 px, and its tap target becomes 44×44. The page's h1 sits **16 px** under the bar (from 20).
- **Pushed screens:** a page that calls `BackLink` (`src/components/page-header.tsx`) gets it in the bar.
  - On the left sits a 44 px-tall **back button: a 24 px `ChevronLeft` and the label the page already passes** ("People",
    "Inbox", "Settings"), at 17 px, as iOS's back button.
  - The community's name doesn't show on these screens. The page keeps its own h1, now at 24 px.
  - The pages keep calling `BackLink` unchanged. On the web, and on pages with no top bar (`public/board`), it stays
    where it is in the page.
- **Pages with `data-own-header`** (Part 3's thread) draw their own header. There `BackLink` renders nothing, and the
  page's own header has the back button.
- The demo banner (`src/app/layout.tsx`) moves **under** the top bar on phones, so in the app it never sits under the
  status bar. It also moves under the bar on pages without one.
- The founder-view strip sticks at `--topbar-h` (Part 1's variable), so it follows the bar when the bar hides.

## 4. No footer on phones (fork 2)
- Under 1000 px, in the app and in a phone browser, no app page shows a footer: neither the members' "Source code
  (AGPL-3.0)" line nor the console's product credit.
- The menu sheet ends with a **"Source code (AGPL-3.0)"** row that opens `SOURCE_CODE_URL`.
- The web keeps both, at the foot of the sidebar, as today. The centred public pages (sign-in, join, setup) keep their
  footer line on every width.

## 5. The avatar menu becomes a sheet on phones
Models: an iOS sheet and Airbnb's Profile list.
- Under 1000 px the avatar opens Part 1's **`Sheet`**.
  - Its top shows the member's 48 px avatar and name (17 px/600). This is a heading, not a new link.
  - Then **every item of today's menu, in today's order and groups**, admin items included ("Admin console", "See it as
    a founder"). Each group has a `SectionLabel`; rows are **48 px** with a 20 px icon, 16 px text and a chevron.
  - Then Dark mode and Sign out, then the source link.
  - Nothing is added or removed: the menu's own clean-up is a separate roadmap line.
- The web keeps the dropdown, but it never grows past the window: at most `calc(100vh - 80px)`, scrolling inside.

## 6. The web layout (1000 px and up)
- One content width for every member tab: **max 960 px**, with the same left edge. Today and Asks move from 720 to 960.
  Inbox's two panes (Part 3) use the full 960.
- The sidebar fills the window below the demo banner, so its last row and the console's credit line are never cut off.

## Files this part owns
- In `src/shell/`: `navigation-links.tsx`, `pressed-tab.tsx`, `app-shell.tsx`, `shell-chrome.tsx`, `user-menu.tsx`,
  `app-actions-group.tsx`, and a new `frame.css`.
- In `src/components/`: `page-header.tsx` and `source-code-link.tsx`.
- `src/app/in-app.css`, `src/app/layout.tsx`, and the demo banner's component.
- The admin tabs' functions and the imports in `src/shell/tab-outlines.tsx`, and the `loading.tsx` files of the admin
  pages.

## Checks (the verifier drives these)
1. **Tab bar:** in the app's web preview at 390×844 with `--sab: 34px` on `html`, the bar is 90 px tall. Every icon's
   top is 9 px (±1) under the top border, and the badge and dot sit at the same offset over no icon (screenshot). With no
   inset, the bar is 56 px. The same holds for Maya's admin bar.
2. **Active state:** the label is 600 and ink. The indicator is 3×28 px, centred on the tab (±1 px), on Sam's bar and on
   Maya's.
3. **Slide:** tap Today → People. Take screenshots at about 0, 110 and 300 ms, or read `getAnimations()` on the content
   container: a 200–250 ms transform animation starting at `translateX(40px)`. People → Today comes in from the left.
   The indicator's position animates over 200–250 ms. Repeat on Maya's bar, from Home to Members.
4. **No jump:** for the admin tabs, the h1's top and the first block's top differ by at most 8 px between the outline
   and the page. At the end of the wave, the verifier runs this on all ten tabs (members' and admin's).
5. **Reduced motion:** no animation runs on a tab switch.
6. **Back:** on a profile at 390 px, the bar shows "‹ People" as one 44 px-tall button and no community name; tapping it
   goes back. At 1280 the page shows "‹ People" as today. The public board shows its link in the page.
7. **No footer:** on the 5 tabs, a profile and a thread at 390 px (in the app and in a phone browser), and on Maya's
   console home, neither "Source code" nor the product credit is on the page. The menu sheet's last row is "Source code
   (AGPL-3.0)", linking to `SOURCE_CODE_URL`. At 1280 both show at the foot of the sidebar. Sign-in keeps its footer line.
8. **Menu sheet:** at 390×844 it is at most 718 px tall. It holds every item the dropdown held, in the same order: compare
   the two lists as Sam and as Maya. The backdrop, Escape and a drag down close it. At 1280 the dropdown fits the window.
9. **The web:** at 1280×800 in demo mode, the sidebar's last row and Maya's credit line are fully visible. Today, Asks,
   People, Inbox and Rooms share one content width and left edge (±0 px).
10. **Demo banner in the app:** with `--sat: 47px`, the banner sits under the top bar and nothing overlaps.
11. **Founder view:** as Maya viewing as a founder, the strip sticks right under the bar at 390 px.
12. **Small screens:** at 360 and 300 px wide (SPEC's small and large check), the tab bar's labels don't overlap and the
    bar grows rather than clipping.
