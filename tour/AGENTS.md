# tour

The landing page's live tour (commonhall.ai, `#demo`): the app's own React screens and CSS on made-up demo people,
played by a scripted pointer. `pnpm tour:build` bundles it into `site/tour/` and writes the tabs, captions and a still
of step 1 into `site/index.html` between the tour markers; commit both. `pnpm tour:check` (and
`src/test/site-tour.test.ts`) fails when the built files are stale. Full notes: `.ai/features/landing-tour/NOTES.md`.

- `build.mjs`: esbuild (browser script + a Node copy for the still), Tailwind on `src/app/globals.css` scoped to the
  tour's box (`:root`/`html`/`body` → `.tour-app`, window-width `@media` → `@container`, `vh` → `cqh`), the app's
  accent CSS, fonts and `@property` rules in `page.css` (they only work at the page level), only the pictures shown.
- `src/steps.ts`: the steps. `src/screens.tsx`: the pages by address (`/search`, `/search/ask`, `/asks`,
  `/directory`, `/jobs`, `/search/candidates`, `/library`, `/library/leaderboard`, `/rooms`, the live room, `/me/alerts`,
  `/admin/announcements`, `/admin`) around the app's real components, and the seeded query cache. `src/data.ts`: the made-up
  data (from `src/platform/demo/`). `src/player.ts`: point, click, tap, type, submit, fill, show, wait. `src/main.tsx`: the
  page controller (modes, tabs, Pause/Play, scaling, theme).
- `src/shims/`: stand-ins for `next/link`, `next/navigation` (an in-memory address), `next/image`, `server-only`,
  the requests (never sent), sign-out, the module registry, `useIsInBrowser`, `livekit-client` (a made-up live room),
  the voice requests (joining answers at once) and the alerts' browser side (never asks the visitor's browser).

## Add a step
1. If it needs a new page, add it to `PAGES` in `src/screens.tsx` (copy the app page's few lines of layout; use the
   app's client components) and its answers to `seedTourData` (made-up data in `src/data.ts`).
2. Add `{ id, label, caption, start, still, settle?, play }` to `TOUR_STEPS` in `src/steps.ts`, where you want it.
   `play` scripts the pointer with selectors from the app's own markup; it must never send anything (`tap`, not
   `click`, on a submit button).
3. `pnpm tour:build`, then `node .ai/features/landing-tour/reports/check-tour.mjs` (it expects the step count).

Rules: made-up people only; nothing leaves the page (no request, no address change); no `style=` in the still (the
build turns them into classes; the CSP allows none).
