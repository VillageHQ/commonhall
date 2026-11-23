# Village SDK 0.2: how Commonhall talks to Village

Read with `src/modules/network/AGENTS.md`. Village's docs: https://docs.village.ai/build/pay-for-your-users.md
(Commonhall pays for its members), the reference, errors, and https://api.village.ai/v2/docs/openapi.json.

## Every place Commonhall talks to Village
- Client: `src/platform/village/client.ts`. One `createVillageAdmin` per secret key (cached, 10 at most), with a fetch
  that refuses non-JSON answers (`VillageGatewayError`: a proxy's 404 must not read as "nobody") and an `onRequest`
  hook that records Village's health and logs failures. Tried keys (`isTrial`) never record health.
- Member calls: `admin.as({ id, email })` per member (the SDK mints the token on the first call and again after a
  401). Search, paths, groups (create, join, list, leave), the member's status.
- Fill-in: `as({ id: "community-profile-fill-in", email, grant: "public" })`, the service email. Enrich by LinkedIn
  (SDK) and by email (`sendVillageApi`).
- App details: `admin.app.get()` with the secret key alone (no token, no Village user). Saving keys and the Village
  check read `payer`/`capabilities.has_server_access` (refused: each user pays), `needs_card` and `mode` (test keys).
- Sync step: `components/village-sync.ts`, in the browser: `createVillage({ token, appUrl, apiUrl })` then
  `connect()`. The token comes from `/api/network/sync-token`. Test keys connect Village's made-up user at once.
- No SDK call yet (`sendVillageApi`, through the member's typed client): `POST /v2/people/paths/bulk`,
  `POST /v2/people/enrich/by-email`, `POST /v2/user/cancel`. `village.api` skips the SDK's `onRequest` and error
  mapping, so `sendVillageApi` reports to the same hook and maps Village's error type first (409
  `network_not_synced` -> `not_synced`, 402 -> `out_of_credits` with `topupUrl`), then the status.
- Leaving the group: `groups.leave` outcomes; a 400 (`admin_blocked`) isn't logged as a failure (`isLeaveOutcome`).
- Erasure: leave the group, then `user/cancel`. A new token no longer brings a cancelled user back (Village's spec).

## Credits
- Prices (`platform/village/contract.ts` `VILLAGE_PRICES`, from each endpoint's Cost note): search 2 per started 10
  results; paths 2 per person with paths (one or a page); fill-in 1 per person found.
- `withCreditCall(spender, kind, call, charge)`: reserves `charge.mostCredits` against the month (and a lookup
  against the member's day), then keeps `charge.readCredits(answer)`. An answer that cost nothing gives everything
  back. Search sends `limit: 25`, so its most is 6; a page's bulk paths reserve 2 per id sent.
- An empty search counts as 2: the search's Cost note says 0, but Village's credits page says an empty search still
  bills its AI work. "Opened in the last 30 days" is free at Village but counted here, so the count is never below
  the bill. Village's usage page is the bill.

## Errors
- Health (`health.ts`): `unauthorized`, `user_required`, `test_mode_unsupported`, `site_disabled` are "keys
  rejected"; `server`, `timeout`, `network`, `invalid_response`, `token_failed` are "down".
- Members (`route-errors.ts`): the same key codes read "Village rejected this community's keys".

## Fakes
- `src/test/fake-village-server.ts` and `src/test/village-recorded-responses.ts`. Shapes marked "From Village's
  OpenAPI" follow the spec (2026-11-22) and haven't been seen live: `/v2/app`'s new fields, user cancel, bulk paths.
  `state.app` sets who pays, `needsCard` and `mode`. `GET /v2/app` answers the secret key alone.
- Demo answers (`src/platform/demo/village-answers.ts`) answer `GET /v2/app` with the secret key too.
