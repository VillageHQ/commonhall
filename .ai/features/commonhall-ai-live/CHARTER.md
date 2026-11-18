# Charter: the landing page live on commonhall.ai, with a working call form

Approved by the owner on 18 Nov 2026 (decision page in the owner's chat).

## Direction
- The static landing page (`site/`) runs on commonhall.ai as a Cloudflare Worker with static assets in Village's
  Cloudflare account. www.commonhall.ai redirects to commonhall.ai.
- The "Schedule a call" form posts to `/api/signup` on the same site. The Worker checks the fields, keeps each request in
  a Cloudflare D1 table and emails it to **support@commonhall.ai** (commonhall.ai is a user alias domain of village.ai in
  Google Workspace, so it reaches the support@village.ai group). No reply email to the visitor.
- Robots: the hidden `website` field drops the request silently; at most 5 requests per visitor an hour.
- The managed plan shows **$50k+ a year** (owner's answer), in the price card, both comparison tables and the form line.
- Link previews: absolute `og:image` and `og:url`, and a canonical link.
- The site config sits in the repo, so one command deploys the page.

## Out
- A reply email to the visitor. A CSV export screen (the D1 table can be exported with one command).
