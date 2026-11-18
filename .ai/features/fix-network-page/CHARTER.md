# Charter: fix the network page error and the LinkedIn note (approved 2026-11-16)

Approved by the owner on the decision page "Community real test: finish Village and a small fix" (page GN5_M-XaUs2spTJ_WaErfw):
"Qareen fixes both in one pull request and merges it after checks".

## Direction
- In: (1) the "connect your network" page (`/me/network`) logs a server error ("We couldn't reach the server") and
  the browser reports React error #419 on every load, although the page then works. Found in the real-service test on
  Fly, 2026-11-15. (2) The README's setup guide does not say that the admin must save a LinkedIn link before the
  "Sync network" button shows.
- Out: anything else on the page; the Village link clash (a separate question to the owner).

## Deciding facts
- Likely cause: the network status query runs during the server render, where its browser-style fetch cannot reach
  the API. The fix keeps the page's look and behaviour the same.
- Proof: the page loads with no server error and no browser error, and works as before.
- Tests: one test that fails before the fix and passes after; lint, typecheck, the full suite.
- Estimate: build 20–30 minutes, tests about 10 minutes. A revert undoes the merge.
