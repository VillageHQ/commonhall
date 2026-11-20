# Browser checks (separate verifiers, 20 Nov 2026)

A verifier who did not write the code drove the production build on a throwaway copy with made-up people, at 390 px
(touch) and 1280 px, as a member and an admin, and in the store app's web preview. Three passes:

1. **First pass** (all parts; files without a prefix): 14 of 15 checks passed. It found that going Back within 5 s of
   a tab tap showed the left tab's outline (`bug-back-*`).
2. **Re-check after the fix** (`recheck-*`): Back fixed, but a tab tapped and then the tab already shown, before the
   first page came, left the outline over the page for good (`recheck-x-*`). The cause: the router keeps a render
   waiting for a page it dropped, and React state updates in the shell never reached the screen. The press moved to
   DOM attributes.
3. **Part A again on the new design** (`r2-*`, rebased on the latest main): all 11 checks passed (10 tabs' outlines next
   to their pages, the sidebar, Back, the stuck case at 4 timings, re-tap, slide away, the pages under the tabs, a hung
   and an aborted request, keyboard and Ctrl-click, the web preview, screen readers). One new bug: a view switch during
   a pending tap left the menu marked as pressing (`r2-bug-stale-pressing-*`); fixed and re-checked (`r3-*`): all pass.

| Check | Result | Proof |
|---|---|---|
| Part 0: `viewport-fit=cover` only for the app's user agent | PASS | `check1-viewport.txt` |
| Part 0: `html[data-app]` and `appActions` in the app, neither in a browser | PASS | `preview.json`, `plain-extra.json` |
| A: tap → tab lit ≤ 50 ms, outline with the page's heading in place, `aria-current` kept, clean after (10 tabs, 390 and 1280) | PASS | `r2-c1-*`, `r2-c2-*`, `r2-tabs-all.json` |
| A: Back, the fund mark, Back/Forward never show an outline | PASS | `r2-c3-*`, `r2-bugs-all.json` |
| A: a tab, then the tab shown, before the page comes: the page stays | PASS | `r2-c4-*`, `r3-bugb-*` |
| A: re-tap, slide away, Ctrl-click, keyboard, rapid taps | PASS | `r2-c5-*`, `r2-c6-*`, `r2-c9-*` |
| A: a room, a profile, an ask, a conversation, five admin sub-pages: no outline | PASS | `r2-c7-*`, `r2-misc-all.json` |
| A: a hung request clears at 5 s with the old page intact; an aborted one never blanks | PASS | `r2-c8-*` |
| A: a view switch during a pending tap leaves no pressed mark | PASS | `r3-phone-*`, `r3-desk-*` |
| A: hover looks only with a mouse | PASS | `c9-*` |
| A: status codes unchanged (404 for a switched-off Inbox and a member's console page; redirect for /admin) | PASS | `c10-*`, `misc.json` |
| A: hidden outlines not exposed to screen readers | PASS | `r2-misc-all.json` |
| B: one header in the app, opens on Today with no redirect | PASS | `p11-app-one-header.jpg`, `p12-documents.json` |
| B/C: This app → Reload, Open in the browser, Switch community work; no group in a browser | PASS | `p13-*`, `c14-*` |
| C: the app's top bar solid with no blur (light, dark); the browser's keeps its blur | PASS | `p15-app-*`, `c15-plain-*` |
| A in the web preview | PASS | `r2-c10-*`, `r2-preview.json` |

Not checked here (need a phone): bounce, momentum, link preview, the Android stretch glow, the status-bar area, the iOS
back swipe. They are the hand checklist in `../device-check.md` for TestFlight 4 and the Android APK. Timings in the
browser checks are desktop Chromium; the profile measurements are in `../after-*.json`.
