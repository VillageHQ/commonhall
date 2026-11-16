---
status: building
---
# Common Hall landing page, version 2

What it does now (replaces the drawing-set page in [common-hall-site](../common-hall-site/SPEC.md)). Plan: [CHARTER](CHARTER.md).

- `site/` is still one static page (`index.html`, `assets/site.css`, `assets/boot.js`, `assets/site.js`), no framework,
  no build step, no cookies, no analytics, same Content Security Policy (plus `img-src data:`): only its own files load.
- **Two themes:** light (paper white, black ink) and dark (near-black, paper-white ink). A sun/moon button in the header
  switches and remembers the choice; the default follows the system; `?theme=light` or `?theme=dark` forces one.
- **First screen:** "Open-source founder community portal", the headline "Everything your founder community needs to
  grow and succeed.", a split button **Set up with Claude/OpenAI** (caret menu, each opens a dialog with a copyable
  set-up prompt and the install line), an outlined **Schedule call**, a **GitHub** card, and the blueprint house
  (ten rooms, doors that swing) with eight made-up members from the app's demo portraits. Hover, focus or tap shows a
  name and role. Every so often two meet and an "Example moment" card pops over them (new hire, raised $10M Series A,
  Fortune 100 client, co-founder coach). Behind the first screen a faint grid of plan-view doors opens in circular waves from the pointer and closes again (see the door-field spec).
- **The ten rooms** (round 3, [landing-v3](../landing-v3/NOTES.md)): the list of the ten modules, each a small floor-plan key, its name, a Built / Partly / Coming tag and one line.
- **Five screens** (round 3): directory, network search, intro thread, asks, admin home on tabs; the stage pins and the tabs advance as the page scrolls; a tap works; plain tabs under reduced motion; all five stacked without JavaScript.
- **What you get** (round 3): eight title cards and a tick table for Common Hall, Getro, Cabal, Metal and Discord; the 11-row comparison (read on 14 November 2026, with its notes) folds under "Read the details".
- **Pricing:** Community free; Enterprise $10,000 a year, 7,500 credits a month, up to 500 members, a quote above. Three short lines per plan (round 3).
- **Your data:** six short facts only (no SOC 2, SSO or certification claims).
- **Two ways in:** the "Schedule a call" form (contract unchanged: `#signup-form`, `data-endpoint`, fields name, email,
  community, members, plan, website; its price line reads "$10,000 a year, 7,500 credits a month" up to 500 members and
  "Village quotes a plan with you" above) and the self-host card (install line, Copy, guide link, set-up dialog).
- Reduced motion: the door field is drawn once, closed and still; faces still in their rooms, the plan's doors drawn open, one deal card shown statically. No JavaScript: no canvas, the same still page.
- Not built (roadmap): named customers, SOC 2 and SSO, import tools, hires and deals in the admin home, an EU hosting statement.
