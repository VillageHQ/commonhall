# Commonhall by Village: landing page

The public page for the app in this repo, under the name Commonhall by Village. One page in a light and a dark theme
(paper and ink): a first screen with a blueprint house and eight made-up members, the ten rooms with their status, five real
screens of the demo on tabs that advance as the page scrolls, a comparison, pricing, a data section and two ways in (a "Schedule a call" form and the self-host install). Plain HTML,
CSS and JavaScript, no framework, no script library, no build step. It loads nothing from third parties: the fonts are
files in this folder.

## Preview

```sh
cd site
python3 -m http.server 8080
```

Then open http://127.0.0.1:8080 (`?theme=dark` or `?theme=light` forces a theme). Any static file server works. Opened
straight from disk the page runs, but the browser blocks the font preload there and logs an error, so check it over http.

## Host it

Point any static host at this repo with **root directory `site`**. There's no build command, and the publish
directory is `site` itself.

## Before you publish

- The page is live at https://commonhall.ai (a Cloudflare Worker in Village's account; deploy and read the requests
  with `deploy/cloudflare/README.md`). `og:image`, `og:url` and the canonical link point there.
- The form ("Schedule a call") posts to `/api/signup` on the same site (`data-endpoint`; the CSP allows
  `connect-src 'self'`). The Worker takes the JSON (`name`, `email`, `community`, `members`, `plan` = `"managed"`,
  `website` as a robot trap), keeps it and emails support@commonhall.ai, and answers 201 `{ ok, emailSent }`,
  400 `{ errors: { field: message } }` or `{ error }`. With `data-endpoint` empty (another static host), the page says
  nothing was sent.
- "Schedule call" leads to that form. No calendar is linked: Village answers by email with a time.
- The prices are Village's offer: Community free (self-host); Enterprise $50k+ a year, 7,500 Village credits a
  month, up to 500 members, a quote above.
- The page says "ask us about EU hosting" for the managed plan until Village confirms where it can host.
- The GitHub links, the install line and the set-up prompt point at `VillageHQ/commonhall`. Change them if the
  repository is renamed.
- The page says "Commonhall"; the app, the root README and the docs still use the old names (a roadmap line).

## Keeping it in step with the app

- Every product claim must be true of the app on `main`. Today: Perks is Partly, the admin home counts intros only
  (hires and deals are "coming"), Chat posts to Slack and Discord, there is no mentor network.
- The comparison (the tick table and the long table under "Read the details") comes from the research file read on 14 November 2026; re-read the four products before changing a cell. The tick table says ✓ only where the long table says Yes, Partly where it names a part, a dash where nothing was found.
- The screenshots are of the demo (made-up people and companies); the demo banner is cropped off.
- The install line matches the root `README.md` exactly; the guide link goes to `docs/self-host-vps.md`.

## How it is built

- `index.html` is markup only: no `style=` attributes, no inline scripts, no `<style>`. The plan is inline SVG.
- `assets/site.css` holds every style. `assets/boot.js` runs in the head and sets the theme (`?theme=`, then the saved
  choice, then the system) before paint. `assets/site.js` holds every behaviour. How it works:
  `.ai/features/common-hall-v2/NOTES.md`.
- Without JavaScript the page still reads: faces sit in their rooms, doors are drawn open, one example card shows, the
  theme follows the system, and the form's place says it needs JavaScript. Reduced motion does the same with script on.

## How it stays out of the app

- `eslint.config.mjs` ignores `site/**`.
- `@source not "../../site"` in `src/app/globals.css` stops Tailwind from scanning this folder.
- `tsc` and Vitest only look at TypeScript files and `src/`. Vercel and DigitalOcean build from the repo root with
  `next build`, which never reads this folder.

## Check it

`node .ai/features/one-site/reports/check-site.mjs` (needs `playwright-core`) serves this folder, opens it at 320, 390
and 1280 px in both themes, moves the pointer, scrolls, and fails on outside requests, console errors, horizontal
overflow, a missing anchor or text under 4.5:1 contrast. It saves full-page shots under
`.ai/features/common-hall-v2/reports/`. The form: `node .ai/features/common-hall-site/reports/form-test.mjs`.

## Third-party assets

- Newsreader (500 and 500 italic) and IBM Plex Sans (400, 500, 600), latin subsets from `@fontsource/newsreader` and
  `@fontsource/ibm-plex-sans`, and JetBrains Mono (latin, variable), under the SIL Open Font License: the `OFL-*.txt`
  files in `assets/fonts/`.
- The eight portraits in `assets/faces/` are the app's made-up demo people (generated, no real person), credited in
  `public/demo/CREDITS.md`.
- The screenshots in `assets/screens/` are of the app's demo (five are on the page; the member-home crop stays for later).
- The GitHub mark in the GitHub card is GitHub's logo, used to link to the repository.
- `assets/og.png` (1200 × 630) is rendered from the page's own first screen; `assets/favicon.svg` is the logo mark.
