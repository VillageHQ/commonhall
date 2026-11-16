---
id: fix-network-page
status: building
waits-on: []
size: small
---
# Spec: the network page error and the LinkedIn note

**Added:** 2026-11-16 (approved scope in `CHARTER.md`; found in the real-service test on Fly, 2026-11-15)

## What & why
Every load of My network (`/me/network`) logged "We couldn't reach the server" on the server and React error #419
in the browser, although the page then worked. And the README's first steps didn't say that the admin's
**Sync network** button shows only after their LinkedIn link is saved.

## What it does now
- My network reads the member's network status from the browser only. The server sends the "Checking your network…"
  loading state (what it sent before, after the failed attempt), so the page looks and behaves the same, with no
  server error and no browser error.
- The README's "Create the group" step says the Sync network button shows only after the LinkedIn link is saved.

## Out
Anything else on the page; the Village link clash (a separate question to the owner).
