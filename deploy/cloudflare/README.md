# commonhall.ai on Cloudflare

The public landing page (`site/`) and its call form, as one Worker (`commonhall-site`) in Village's Cloudflare account.

- `worker.js` redirects www to commonhall.ai, takes `POST /api/signup` and serves `site/` for everything else.
- Each call request is kept in the D1 database `commonhall-signups` (table `signups`) and emailed to
  `support@commonhall.ai` (Cloudflare Email Sending, from `noreply@commonhall.ai`; reply goes to the visitor).
- At most 5 requests per visitor an hour (the IP address is kept only as a hash). A filled hidden `website` field is
  answered like a success and kept nowhere.

## Deploy

Needs a Village Cloudflare API token with Workers Scripts, D1, Workers Routes and DNS rights on commonhall.ai.

```sh
cd deploy/cloudflare
export CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ACCOUNT_ID=…
npx wrangler d1 migrations apply commonhall-signups --remote   # only when migrations/ changed
npx wrangler deploy
```

Roll back: `npx wrangler rollback` (the previous version), or deploy an older commit.

## Read the requests

```sh
npx wrangler d1 execute commonhall-signups --remote --command "SELECT created_at, name, email, community, members, notified FROM signups ORDER BY id DESC"
```

Add `--json` and convert for a CSV. A row with `notified = 0` never reached the support inbox.
