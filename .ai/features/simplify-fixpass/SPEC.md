---
id: simplify-fixpass
status: built
waits-on: []
size: S
touches: ["src/platform/notifications/", "src/modules/voice/", "src/shell/", "src/app/(app)/", "src/components/alerts/", "src/modules/intros/", "site/", "tour/", "docs/"]
---
# Spec: round 6's fix pass and re-study

Part of [simplify-round6](../simplify-round6/SPEC.md); the approved brief is [CHARTER.md](CHARTER.md).

## What it does
- **The fix list from the round-6 parts:**
  - "Until tomorrow" ends at the next 08:00 on the member's clock.
  - Room times render the same on the server and while the page hydrates, then switch to the browser's own zone and
    language.
  - The live-room reads rank every live room busiest first (the newest on a tie), so Today and Rooms show the same
    pick. The viewer's own face is left out, and Today and Rooms use one "who is in" label (`describeRoomPeople`
    in `src/modules/voice/contract.ts`). In demo mode the seeded people count as in.
  - My profile has an Alerts row. The alert log says "Allowed", not "Sent".
  - Mail shows only the checks that need the admin, with every check under Advanced.
  - The console's page tabs wrap on a phone, and the intro log's long states wrap instead of being cut.
  - Member screens say "People", not "the directory".
  - The landing page and the tour no longer offer "I'm available to talk".
  - `ROOMS_ON_BY_DEFAULT` is documented.
- **The re-study:** the same 12 personas walked the new build. The results are in
  [RESTUDY.md](../simplify-round6/RESTUDY.md). Its six small repairs:
  - quiet-time presets with their hours;
  - Follow words on room cards, and "Start or schedule a room";
  - a Messages heading in Inbox;
  - "Your ask" on Today;
  - the intro's "I don't know them well" hint;
  - the demo's admin Home opening on This week.

## Acceptance (checked by separate verifiers in a real browser)
[reports/VERIFY.md](reports/VERIFY.md): 15 of 15 fixes pass, and 7 of 7 re-study repairs pass.
