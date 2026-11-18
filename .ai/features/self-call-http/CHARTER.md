# Charter: pages crash behind an https tunnel (self-call over https)

Approved direction: The owner's brief for the Commonhall onboarding topic (17 Nov 2026): "Crashes and small bugs first
(they need no design)." No look changes, so no alignment page beyond that brief.

- **Goal:** /admin/integrations, /perks and the visitor /jobs page stop answering 500 on a server bound to 127.0.0.1
  behind an https tunnel or proxy (the LOI demo setup).
- **Cause:** Next.js renames 127.0.0.1 to "localhost" in the proxy's URL. A rewrite to that address no longer matches
  the server's own address, so Next proxies it like another site's, over https, to a plain-http server.
- **Fix:** `skipProxyUrlNormalize: true` (the proxy sees the server's real address) and every rewrite built on
  `request.url`, never `request.nextUrl`.
- **Tests:** one new case in `src/proxy.test.ts` (red before, green after); the real server on 127.0.0.1, the default
  host and 0.0.0.0, each with and without the tunnel's `x-forwarded-proto: https` header.
