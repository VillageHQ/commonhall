# How commonhall.ai works today

- Village's Cloudflare account holds the domain (registered 18 Nov 2026 until 18 Nov 2028) and the Worker
  `commonhall-site` (`deploy/cloudflare/`): www → 301 to the apex, `POST /api/signup`, everything else from `site/`.
- `site/_headers` sets nosniff, frame-ancestors and the referrer policy, and `no-transform` on the page so Cloudflare
  does not inject its analytics script (the CSP would block it and log an error).
- Mail: commonhall.ai is a user alias domain of village.ai in Google Workspace (MX smtp.google.com, SPF includes
  Google), so support@commonhall.ai is the support@village.ai group. The Worker sends through Cloudflare Email Sending
  (records on `cf-bounce.commonhall.ai`, DMARC p=reject on the apex).
- Proof: `reports/` (the live page at 390 px and the form's confirmation). The verifier's request reached the group.
