---
id: commonhall-ai-live
status: shipped
touches: ["site/", "deploy/cloudflare/"]
---
# Spec: the public site on commonhall.ai

## What it does now
- https://commonhall.ai serves the landing page in `site/`; www.commonhall.ai redirects there.
- The "Schedule a call" form saves each request and emails it to support@commonhall.ai. The visitor sees "We saved
  your request and will write to <email>". The form itself is specified in [site-signup](../site-signup/SPEC.md).
- The managed plan shows $50k+ a year.
- Link previews show the page's picture (absolute og:image, og:url, canonical).

## Open
- A reply email to the visitor. A 404 page. See `.ai/bugs.md` for the floor-plan overlap.
