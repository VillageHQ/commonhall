# Part 7: the store app's own tab bar (smooth-app Part D)

Read [../SPEC.md](../SPEC.md) first, especially decision 1 of the council (23 Nov 2026): build the native tab bar now.
Runs beside parts 2–6. About 4 hours. Evidence: [BENCHMARK.md](../BENCHMARK.md) §1 (every reference keeps each tab's
screen alive natively). The plan it builds: [smooth-app SPEC, Part D](../../smooth-app/SPEC.md).

## What it does
- **In the store app, the tab bar is native.** It shows the site's member tabs (Rooms · Today · Asks · People · Inbox, or
  fewer where a module is off), with the site's own icons, labels, badges and colours, drawn to Part 2's sizes: 56 px
  over the home indicator's inset, a hairline on top, 24 px icons 9 px under it (stroke 2 on the open tab, 1.5 on the
  others), an 11 px label (600 open, 500 others), a 3×28 px line on the top edge that slides to a tapped tab over 220 ms,
  and the badge and the live dot at one place (6 px from the top, 7 px right of the middle, a 2 px ring).
- **One web view per tab, kept alive.** A tab loads on its first visit (a small spinner until its page answers) and then
  stays: its scroll and typed text are there when the member comes back. All web views share the app's cookie store, so
  one sign-in signs in every tab. Signing out in one tab closes the others.
- **The switch slides.** The tab coming in slides 40 px in from its side of the bar and fades in over 220 ms
  (`--ease-out`); the old one is replaced, not animated out. No slide on a tab's first visit or with reduced motion.
- **Tapping the open tab** scrolls it to the top, or goes back to the tab's own page from a page under it.
- **The right tab opens:** a link in a page to another tab's own page (Today's "All asks") opens that tab; an alert or a
  `commonhall://` link opens the tab its page belongs to (`/inbox/…` in Inbox, `/rooms/…` in Rooms); a page of no tab
  (settings) opens in the tab that is open. Android's back button steps back in the open tab, then goes to Today.
- **The bar hides** where the site's own bar would: a pushed screen (`data-pushed-screen`), a takeover, a signed-out page,
  the admin's console (which keeps its own tabs in the page), and also while a sheet, a menu or a dialog of the page is
  open (the avatar menu reaches the bottom edge) or the keyboard is up.
- **Dark mode follows across tabs:** switching it in one tab switches every tab that is alive (the cookie is shared, so a
  tab loaded later reads it).
- **The slot above the bar** holds the room's mini bar (Part 6 owns what is in it). It sits right on the bar's top edge,
  or on the home indicator where the bar is hidden.

## The contract with the page (no site change needed)
The app runs a script in every page beside the bridge's bootstrap (`mobile/src/lib/tabs.ts`):
- It marks `html[data-native-tabs]` and hides the site's **member** bar (`[data-slot="tab-bar"]` without `/admin` links)
  with `visibility: hidden`, so the bar keeps its place in the layout and the site's own rules that remove it
  (`display: none`) still tell the app when to hide the native bar. `html[data-app]` alone never hides it: store build 4
  sets it too and has no native bar.
- **page → app** `tabs.state`: the site's bar as it would show now (its links' `href`, label, inline SVG icon, badge count
  or live dot, and their computed colours), the path, whether a sheet, menu or dialog is open (`html[data-sheet-open]`,
  or Radix's `[role=menu|dialog|alertdialog|listbox][data-state=open]`) and the site's dark mode. Sent when it changes.
- **app → page** `__commonhallTabs.dark(isDark)`: the other tabs follow a dark-mode switch (the site's hook watches the
  `dark` class).
- **page → app** `tabs.open`: a tap on a link to another tab's own page, caught before the page moves.
- **app → page** `window.__commonhallTabs.frame({ tab, mini, bottomInset? })`: sets `--tab-h` (the native bar's measured
  height; 0 while the keyboard is up), `--mini` and `html[data-mini-player]` (the slot's height), and on Android `--sab`.
  Part 1's sums (`--tab-total`, `--bottom-stack`) then lay the page out around the native bar as around the site's.

## Notes for the other parts
- **Part 2:** the site needs no rule of its own to hide its bar in the app. If it adds one, key it on
  `html[data-native-tabs]`, never on `html[data-app]` (store build 4 would lose its only tab bar). The native bar copies
  the site bar's computed colours, so the active colour Part 2 picks shows in the app too.
- **Part 6:** `PortalScreen.tsx` renders `PortalTabs` instead of one `PortalView`, and passes the mini bar as its
  `bottomSlot`. The slot is placed by `PortalTabs` and sets `--mini` on every tab's page, so the "frame" message and the
  absolute positioning in Part 6's §4 aren't needed with the native bar. The mini bar hides while a sheet is open or the
  keyboard is up (`PortalTabs` does it).

## Files
`mobile/src/components/PortalTabs.tsx` (new), `NativeTabBar.tsx` (new), `PortalView.native.tsx`, `PortalView.tsx`,
`portal-types.ts`; `mobile/src/lib/tabs.ts` (new, with `tabs.test.ts`), `links.ts` (the signed-out pages);
`mobile/src/screens/PortalScreen.tsx` (the swap only); `mobile/package.json` (`react-native-svg`, Expo's pinned version).

## Checks (the verifier drives these in the store app's web preview, insets 0)
1. **Bar:** as Sam at 390×844, the native bar is 56 px, at the bottom, with Rooms · Today · Asks · People · Inbox; every
   icon is 24 px and 9 px (±1) under the top border; the open tab is `aria-selected`; the indicator is 3×28, centred on
   it (±1); the Inbox count and the Rooms live dot match the site's. The site's own bar is not visible in any tab.
2. **Kept alive:** scroll Today, open People, come back: Today's scroll is the same, and no page loaded again.
3. **Slide:** People → Today slides in from the left, Today → People from the right, 200–250 ms; none with reduced
   motion; none on a first visit.
4. **Open tab:** tapping it scrolls to the top; from a page under it, it goes back to the tab's page.
5. **Links and alerts:** Today's "All asks" opens the Asks tab. A message from Maya to Sam sends an alert; tapping the
   preview's banner opens that thread in the Inbox tab (also when another tab is open).
6. **Hides:** a page with `data-pushed-screen` (Part 3's thread) has no native bar; it comes back on the list. A sheet
   (`html[data-sheet-open]`, which every `Sheet` sets) hides it and the slot. The keyboard's part runs on store build 5
   (the web preview has no keyboard events). Maya's console (`/admin`) shows the site's own console tabs and no native bar.
7. **Sign-out and in:** signing out in one tab leaves one web view on the sign-in page and no bar; signing in again shows
   the bar, and the other tabs load fresh, signed in.
8. **Mini player slot:** join a room, minimise: the mini bar's bottom edge meets the tab bar's top edge (±1 px), and every
   tab's page has `--mini` set (its last item stays above the mini bar).
9. **Small and modes:** at 360×740 and 300×570 no label is cut or overlaps; in the site's dark mode the native bar takes
   the site's dark colours.
10. **Memory:** the JS heap and DOM nodes with one tab and with all five (preview), written down; the real numbers on
    Android come from store build 5 (Android Studio's profiler).
11. **Tests:** `npm run typecheck`, `npm test`, `npx expo-doctor` in `mobile/`; `pnpm lint && pnpm typecheck && pnpm test`.
