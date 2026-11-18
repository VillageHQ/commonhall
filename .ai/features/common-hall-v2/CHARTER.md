# Commonhall landing page, version 2: CHARTER (approved)

Approved by the owner on 2026-11-14 in Telegram topic 75190, on decision page wuWS4ksp23ZjVtSHgVuOqQ, with three answers:
logo **03** (the floor plan with a door gap); prices **Community free / Enterprise $10,000 a year, 7,500 credits a month,
up to 500 members, a quote above**; and, on the look, his own words instead of navy or bone:

> "I'm feeling less excited about the blue and green colors, and more about just keeping it light / paper white, and
> black. Also, I liked already the previous visual we had with the doors, like a blueprint of a house. It seems that
> whole idea was changed completely. Another idea is to have a light and dark theme so that I compare. I like the
> current background, but I'd like you to have some background animation on it, similar to how we have many
> animations on the scrolls.md landing page. The hero section specifically has a background animation on hover. I'd
> like to utilize similar to these animations. Also, have both a dark and light theme for us to compare between."

Earlier feedback (same day, same topic) that still holds: the hero visual smaller on large screens and less noisy; the
people moving around show real faces with their titles on hover; several moments where faces come together and a deal
happens with a tooltip over their pictures ("new hire", "raised $10m", "new Fortune 100 client closed", "dealing with a
difficult co-founder"); more professional typography and button styles; hero copy "Open-source founder community
portal" / "Everything your founder community needs to grow and succeed."; buttons "Set up with Claude/OpenAI" (the
Scrolls.md split-button pattern) and "Schedule call"; GitHub as its own card under the buttons; remove "Merged in
public"; add a competitor comparison and a pricing section (Community vs Enterprise).

## Direction
**In:** rebuild `site/` (index.html, assets/site.css, assets/site.js, assets) as one page with a light and a dark
theme, the blueprint house kept as the hero picture, the sections below, the logo 03 lockup and favicon, the design
notes updated. **Out:** renaming the app itself; a server for the form; publishing or deploying; buying a domain;
named customers, SOC 2, SSO or import tools (not true yet: roadmap lines).

## The page, top to bottom
1. **First screen.** Eyebrow "Open-source founder community portal". H1 "Everything your founder community needs to
   grow and succeed." Sub-line "Your own portal, under your name. Warm intros, member directory, asks, jobs and perks.
   Village runs it, or you do." Buttons: split button "Set up with Claude ▾" (caret menu: Claude / OpenAI; each opens a
   small dialog with a copyable set-up prompt and the install line) and outlined "Schedule call" (to the form). Under
   them a GitHub card: GitHub mark, `VillageHQ/commonhall`, "AGPL-3.0 · Star and fork", arrow. Right (desktop) or below
   (phone): the **blueprint house** from version 1 (walls, doors that swing, room labels and icons) at most ~520 px
   wide on desktop, with fewer lines, no sheet/revision labels, no stamps. Eight made-up people (the app's own demo
   portraits, `public/demo/faces/`) walk between rooms; hover, focus or tap shows name and title; on a cycle two of
   them meet in a room and a deal card pops over their faces ("New hire: head of sales", "Raised $10M Series A",
   "Closed a Fortune 100 client", "Found a co-founder coach"), then fades. **Background animation (hover):** a canvas
   behind the hero, like the Scrolls.md glyph field: a grid of faint blueprint marks (door arcs, plan crosses, ticks,
   small room icons) that ink in and grow near the pointer and cool down after, excluded around the buttons, off
   under reduced motion and without JavaScript.
2. **Real screens.** Six screenshots of the real portal from the demo (`~/.business-builder/runs/2026-11-13-founderhall-v2/design/v16-mock/app-shots/`):
   member directory, network search with a path through a member, an intro thread, the asks board, the admin count of
   intros, the member home. One line each. The demo banner is cropped away. Replaces the drawn room list.
3. **Compared with Getro, Cabal, Metal and Discord.** The table from the approved page (11 rows), facts from
   `review/competitors/matrix.json` read on 14 November, with the honest notes (Cabal's earlier product, Metal is a
   founder tool, Getro wins on job-board reach and data).
4. **Pricing.** Community · Free (the whole app, AGPL; your own server, one install line; your own Village key, pay as
   you go; updates from the repo; community support on GitHub). Enterprise · $10,000 a year (Village hosts and runs it
   under your domain; set-up in week one, backups, updates, support; 7,500 credits a month, one credit = one network
   search or one profile filled; up to 500 members, a quote above).
5. **Your data.** Facts only: under your name and domain; self-host anywhere, EU included; intros need both sides'
   yes; an admin audit log; sign-in by email link; "ask us about EU hosting" for the managed plan; one line on Village.
   No SOC 2, SSO or certification claims.
6. **Two ways in.** The set-up dialog (prompt + install line + self-host guide link) and the existing "Schedule a
   call" form with the site's one form contract.
Cut: "Merged in public", the sample intro counts, sheet/revision labels, stamps, the bare install block.

## Look
- **Themes:** light = paper white ground, black ink (the blueprint on paper); dark = near-black ground, paper-white
  ink (the blueprint on a blackboard). No navy, no green. One toggle in the header (sun/moon), `data-theme` on the
  root, remembered in `localStorage`, default follows `prefers-color-scheme`; `?theme=dark` or `light` in the URL
  forces one so both can be compared by link. Deal cards and tooltips: ink on paper in both themes.
- **Type:** a professional pairing, self-hosted (OFL woff2 latin subsets in `site/assets/fonts/`): Newsreader 500 for
  the H1 and section titles, IBM Plex Sans 400/500/600 for body and UI, JetBrains Mono for the install line. Buttons:
  solid ink button (paper text), outlined button, 6 px radius, 15 px/600, real hover and focus states.
- **Logo 03:** `brand/logos-r2/l3/` mark + lockup "Commonhall · BY VILLAGE"; favicon from the mark.

## Deciding facts (lead's calls, reversible)
1. Site rules unchanged: the Content Security Policy (`default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; font-src 'self'`), no third-party scripts, fonts or libraries; everything is the page's own code.
2. The form contract is unchanged (`#signup-form`, `data-endpoint`, fields name/email/community/members/plan/website).
3. Every claim is true of the app on `main`: the admin counts intros today (hires and deals are "coming"); Perks is
   Partly; WhatsApp/Telegram/Signal and chat→portal are Coming; the CSV import page exists.
4. The set-up prompt tells the assistant to clone `VillageHQ/commonhall`, run the install script, and read
   `docs/self-host-vps.md`; it sends nothing anywhere.
5. The app's own name stays; `.ai/design/DESIGN.md` gets the paper/ink themes, type and buttons.
6. Works from 320 px; reduced motion and no-JS: everything drawn and still, no canvas.

## Journeys and tests
No app journey changes. `.ai/features/one-site/reports/check-site.mjs` (320/390/1280, outside requests, console
errors, overflow, anchors; both themes) plus a form test; then an independent verifier drives the real page in both
themes, with and without motion, checks the hover field, the faces and deal cards, the dialog, the toggle, the copy
buttons, and reads every claim against the app and the research file.

## Proof and estimate
Proof at the first milestone: light and dark first-screen screenshots (phone + desktop) and a ≤10 s clip of the hover
field and a deal moment, uploaded to the topic. Build ~5 h, tests ~40 min. Roll back: a revert of the merge restores
version 1.
