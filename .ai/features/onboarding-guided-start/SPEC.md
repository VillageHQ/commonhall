---
id: onboarding-guided-start
status: building
---
# The guided start for a new organizer

Approved by the owner on 17 Nov 2026 (decision page question 1: "4 guided steps").

## What it does
- **Signed in at once:** creating the admin on /setup signs the organizer in and opens the guided start (today they
  type the password again on /signin).
- **The setup token hint:** /setup says where the setup token comes from (whoever installed the app chose it; it is
  SETUP_TOKEN in the server's settings) and links the README section.
- **Four steps, one screen each, at /admin/start**, each with one line on what it does for the organizer, "Next" and
  "Skip for now":
  1. **Your look**: community name, logo upload, brand colour (the same saves as Settings).
  2. **Connect Village**: the `VillageConnect` screen (onboarding-village-connect); "Next" turns on when connected.
     Left out when the network module is off.
  3. **Your card**: the organizer is a member too: their own profile card (name, role, company, photo), with the
     member welcome they never get today.
  4. **Invite founders**: paste emails or upload the CSV (the existing invite and import forms), with the email
     switch, and the line "links wait on Sign-in links" when mail is off.
- A new admin lands on the guided start until it is finished or skipped; then on the console Home with its checklist
  (the "what is left" list). /admin/start stays reachable from the checklist.
- Mail is not a step: on the managed plan Village handles it; on an own server without mail, step 4 says so in one line.

## Depends on / check-ins
- Needs `VillageConnect` from onboarding-village-connect on main before building step 2.
