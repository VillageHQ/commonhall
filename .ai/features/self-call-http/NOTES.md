# How it works today: rewrites behind an https tunnel

`src/proxy.ts` answers some pages with a rewrite (a switched-off module's page, the visitor's /jobs). Next.js runs a
rewrite inside the server only when its address matches the server's own (`initURL`: the forwarded scheme + the bound
host + port). Two rules keep that true on every host setting:
- `next.config.mjs` sets `skipProxyUrlNormalize: true`, so `request.url` carries the bound host as is (127.0.0.1 stays 127.0.0.1).
- Rewrites are built on `request.url`. `request.nextUrl` renames 127.0.0.1 and [::1] to "localhost"; a rewrite built
  on it is proxied to https://localhost:<port> and fails with "wrong version number" (a 500).
Proof: `reports/proof-matrix.txt` (server on 127.0.0.1, default, 0.0.0.0; with and without `x-forwarded-proto: https`).
