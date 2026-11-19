# The landing page's live tour and feature groups: how it works today

Approved page: [CHARTER.md](CHARTER.md). What it does: [SPEC.md](SPEC.md). The code map: `tour/AGENTS.md`.

## What the visitor sees (`#demo` on commonhall.ai)
Eleven tabs (Search · Ask for an intro · Ask everyone · Directory · Book a call · Find candidates · AI library · Voice
rooms · Alerts · Announce · Intros and calls; Book a call, Find candidates, Announce and Intros and calls:
`.ai/features/tour-new-steps/NOTES.md`; the round-5 three: "The round-5 steps" below), a
Pause / Play button, the app's own screens in a frame, and one caption under it. The screens are real DOM: the app's
React components and its CSS (`src/app/globals.css` + `parts.css`, so Newsreader, IBM Plex Sans, paper and ink), fed
with the demo's made-up people (`src/platform/demo/people.ts`, portraits and logos from `public/demo`). A fake pointer
types into the real fields and clicks the real links.

- **Scroll mode** (motion allowed, window at least 1000 × 700): `#demo-root` gets `is-scroll` (`1 + steps × 0.6` window-heights tall, from `--tour-steps`);
  `.demo-stage` is `position: sticky` with `top` set by script to `(window height − stage height) / 2`, so it pins in the
  middle (measured off by 0 px at 1280 × 800). Progress through the track picks the step; each step plays once when
  reached, and only while the frame is in view: at page load step 1 waits (`isWaitingForView`) until the visitor
  arrives, and a step left mid-run plays again on return. When a step has played out the button says Play (plays it
  again). A tab click scrolls to the middle of that step's band (and holds the scroll sync for 0.9 s).
- **Timer mode** (phones, short windows): plays step after step, looping, while the frame is at least 35% in view
  (IntersectionObserver); it stops when scrolled away. A tab click plays that step and stops the auto-advance; the
  button then says Play, which carries on from the next step.
- **Still mode** (reduced motion): `is-still`; no pointer, no typing, no button; each step shows its end state; a tab
  changes it.
- **No JavaScript:** the build wrote a still of step 1 into the page as a declarative shadow root, so the real search
  screen with its results shows; the tabs and button are hidden.
- **Pause** is the visitor's: a resize or a mode change keeps it; while paused, scrolling to another step shows its
  still. A tab click plays again.
- **Theme:** follows the page (`html[data-theme]`, watched by a MutationObserver) by putting `.dark` on `.tour-app`.

## How it is put together
- **Shadow root.** `div#tour-screen` holds `<template shadowrootmode="open">` with `<link href="tour/tour.css">` and
  `div.tour-app[inert] > div.tour-mount`; the script wraps the mount in `div.tour-scroll`, the box that scrolls (with the
  pointer inside it), so the app's fixed phone tab bar stays at the bottom of `.tour-app`. The app's CSS cannot leak into the page or the page's into the app. `inert`
  keeps visitors' clicks, focus and screen readers out of the scripted screen; the captions say what it shows.
- **Scaling.** From a 700 px wide frame up, the app is laid out at 1200 px (its desktop layout with the sidebar) and
  scaled down with `transform: scale()`; below, it is laid out at the frame's width (phone layout, scale 1).
- **The CSS** (`tour/build.mjs`, `scopeToBox`): Tailwind runs on `tour/src/tour.css` (which imports `globals.css`; base
  `src/`, plus `tour/src`). Then `:root`, `html`, `body` → `.tour-app`; every `@media` on a width → `@container` (the
  box is `container-type: size`), so the app picks its layout from the box, not the window; `vh`/`vw` → `cqh`/`cqw`;
  `@property` rules move to `page.css` (they only register at the page level). `.tour-app` sets `min-height: 0` (the
  app's `body` rule asks for `100dvh`, which a box with no container above measures on the window) and
  `contain: layout paint style`, so the app's `position: fixed` tab bar stays inside the frame, also at scale 1 and
  without JavaScript. The app's accent CSS
  (`renderAccentCss`, normally written by `src/app/layout.tsx`) is appended.

- **Fonts.** `page.css` declares the app's own variable fonts (from `src/app/_fonts`) as "Tour Plex Sans" and "Tour
  Newsreader" at the page level (a font declared in a shadow root is ignored); `.tour-app` points `--font-plex-sans` and
  `--font-newsreader` at them.
- **The screens** (`tour/src/screens.tsx`): `PAGES` maps an address to a page: `/search` (`SearchScreen`), `/search/ask`
  (the intro ask page's layout around `OneStepAskForm`), `/asks` (`AsksBoard`), `/directory` (`MemberDirectory`),
  `/admin` (`AdminHomeView`), and since round 5 `/library`, `/library/leaderboard`, `/rooms`, the live room
  `/rooms/<ROOM_ID>` and `/me/alerts`. Each sits in the real `AppShell` with the real menu (`buildShellNavigation`;
  the registry stand-in lists Library and Rooms too). The app's
  pages read the database on a server, so each tour page is that page's few lines of layout, copied, around the same
  client components.
- **No server.** `seedTourData` puts every answer in the React Query cache first (staleTime and gcTime infinite, and
  again at every step start). Stand-ins (`tour/src/shims/`, swapped in by the build's esbuild plugin): `next/link` and
  `next/navigation` move an in-memory address (the landing page's own address never changes), `postRequest` never
  resolves (nothing is sent), sign-out does nothing, `server-only` is empty, the module registry lists only manifests,
  and `useIsInBrowser` is always true (so the still renders the results). zod's non-English messages are dropped.
  Round 5 added three: `livekit-client` (a made-up live room: `Room` with the people of `ROOM_PEOPLE`, no network; who
  speaks moves every 2.6 s while motion is allowed, the host keeps it under reduced motion), the voice requests
  (`src/modules/voice/queries`: joining answers at once with `ROOM_JOIN`, the rest are the app's and never leave), and
  the alerts' browser side (`src/components/alerts/push-client`: this device reads "on"; the visitor's browser is never
  asked for permission or a service worker). Component stylesheets (`voice.css`) load empty in the bundle;
  `tour/src/tour.css` imports `voice.css` beside `globals.css`.
- **The still** has no `style=` attributes (the page's CSP has no `'unsafe-inline'`): the build turns each into a
  `tour-sN` class in `tour.css`.
- **Pictures.** The build renders every step's start and still in Node, collects the `tour/faces/…` and
  `tour/logos/…` addresses, and copies only those from `public/demo`. The live room fills in only after it "connects",
  so `listPictures` (`tour/src/still.tsx`) adds `ROOM_PICTURES` itself.
- **Size:** `tour.js` about 740 KB minified (React DOM is a third), `tour.css` about 117 KB; deferred, after `site.js`.

## How to add a tour step (the follow-up part `tour-new-steps` relies on this)
1. **A page.** If the step needs a screen the tour doesn't have, add it to `PAGES` in `tour/src/screens.tsx`: copy the
   app page's layout lines (`src/app/(app)/<page>/page.tsx`) and render the app's client component with props from
   `tour/src/data.ts`. Set `isAdmin: true` for a console page (the shell shows the admin, Maya Ortiz). If the
   component reads React Query (`useSuspenseQuery`/`useQuery`), add its answer to `seedTourData` with the app's own
   query options (`someQuery(...).queryKey`), or it waits forever. Server-only imports fail the build: use the
   component that takes props, or add a stand-in in `tour/src/shims/` and to `FILE_SHIMS` in `tour/build.mjs`.
2. **Made-up data** in `tour/src/data.ts`, built from `src/platform/demo/` (people, outsiders). Use `faceUrl(name)` and
   `logoUrl(company)` only for names that have a file in `public/demo/faces` or `public/demo/logos` (the build fails on
   a missing picture). Type it with the app's own types, no casts.
3. **The step** in `TOUR_STEPS` (`tour/src/steps.ts`), at its place in the order:
   ```ts
   {
     id: "book-call",                 // unique
     label: "Book a call",            // the tab (keep it short: five or six tabs must fit at 1080 px)
     caption: "One line under the screen.",
     start: "/directory",             // the address the step opens on
     still: "/people/demo-sam.lee",   // its end state: reduced motion, and the no-JS still if it is step 1
     async settle(hands) { await hands.fill("#field", "words"); },   // optional: fill fields for the still;
                                      // hands.show(selector) scrolls it to the top at once (the visitor can't scroll)
     async play(hands) {              // the scripted run; ends on the still
       await hands.point(".fh-mcard");          // move the pointer (scrolls the screen if needed)
       await hands.click("a.fh-book");          // a real click: links and buttons that only change the screen
       await hands.type("#note", "Hello");      // types through React's own change handler
       await hands.tap("button[type=submit]");  // a press that runs nothing: use it on anything that would send
       await hands.go("/people/x?tab=calls");   // jump the address, as a link would
       await hands.wait(1800);                  // hold, counting only playing time (Pause stops it)
     },
   },
   ```
   Selectors come from the app's own markup (class names in `parts.css`, ids, `data-testid`). `hands.submit(selector)`
   submits the field's form (the app's handler runs: only for forms that change the screen, like search).
4. **Build and check:** `pnpm tour:build`, then `node .ai/features/landing-tour/reports/check-tour.mjs` (it reads the
   number of tabs; at 1280 px the scroll track grows with the steps), and look at the screenshots. Commit `site/`.
   A step whose `play` throws (a selector the screen no longer has) logs a warning and shows its still instead.

## The round-5 steps (19 Nov 2026)
- **AI library** (`/library` → `/library/leaderboard`): `LibraryBrowse` with six made-up items (`LIBRARY_ITEMS`, the
  first featured; Sam Lee's own shows its count without a button), a press on the second card's upvote (`tap`: an upvote
  is a request), then the header's Leaderboard link and the people and companies boards (`LIBRARY_BOARD`, this month).
- **Voice rooms** (`/rooms` → the live room): `RoomsBoard` (two live rooms, one coming up, 3 of 3 broadcasts left), a
  press on "I'm available to talk" (`tap`), a click on the live card, then `LiveRoom` on the stand-in LiveKit: Oliver
  Grant hosts, Priya Shah co-hosts, Grace Kim speaks (muted), nine listen (Sam Lee is "You", Marcus Webb's hand is up).
  The pointer opens Reactions and sends 👏 (shown on the page only), then presses the hand (`tap`). The still waits for
  the people, then shows the stage at the top (`hands.show`).
- **Alerts** (`/me/alerts` → `?quiet=1`): the page's three cards (this device on; the kinds with "Voice rooms opening"
  off; Noah Berg muted). The pointer clicks the quiet-hours switch for real (it only changes the screen), points at the
  days and presses Save (`tap`). `?quiet=1` renders the form with quiet hours on (the form is keyed by it); the still
  scrolls to "Quiet hours".

## The feature groups (`#rooms`)
`div.groups` of five `section.fgroup` cards (Meet and connect · Raise · Grow · Hear from the fund · AI across the
portfolio), each an `h3` and a list of features (name and one line). From 761 px the groups flow in two CSS columns
(`columns: 2`, `break-inside: avoid`), so Meet and Raise stack on the left and Grow and Hear on the right at about the
same height; the fifth, `.fgroup.wide`, spans both (`column-span: all`) with its list in two columns. One column below.
Round 5 added Voice rooms and "I'm available to talk" to Meet and connect, Phone alerts and The phone app (installable
from the browser now; "the App Store and Google Play app follows") to Hear from the fund. No status tags (the
owner, 18 Nov 2026: list everything, planned too, no labels). The old rooms list, its key plans and the `.stp` tags are
gone; the nav says Features and Tour. The comparison table keeps its ✓ / Partly / dash.

## Checking it
- `node .ai/features/landing-tour/reports/check-tour.mjs [out dir]`: 1280 × 800 in both themes (each step by scroll,
  the stage's centre, Pause, a tab click), 390 px in both themes (the timer shows every step, a tab click stops it, no
  overflow), reduced motion, JavaScript off; fails on console errors or warnings, failed or outside requests. About 9
  minutes for 11 steps. The no-JS check reads the first 400 characters of the still (the menu grew in round 5).
- `node .ai/features/one-site/reports/check-site.mjs`: the whole page at 320, 390, 1280 px.
- `src/test/site-tour.test.ts` (`pnpm tour:check`): the committed build matches its sources.

## Known limits
- The tour scripts end at "Send": nothing is sent, so no "sent" screen shows.
- `site/assets/screens/` (the old screenshots) are no longer on the page; they stay in the repo.
- The phone layout below a 700 px frame shows the app's top bar and tab bar at full size; between 700 and about 900 px
  the scaled desktop layout gets small (scale ≈ 0.6).
- With 11 steps each step has a thinner scroll band; changing the window's height in scroll mode can land on the next
  or previous step (it did with 8 too).
- The live room's control bar is the app's real sticky bar: on a phone still it covers the lower audience rows (the
  raised hand is under it). At the end of the moving Voice rooms step the room's title is half cut at the top.
- The time fields in Alerts show in the visitor's own clock format (10:00 PM or 22:00).
