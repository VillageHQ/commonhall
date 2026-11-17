---
id: onboarding-settings-fold
status: building
---
# Fewer controls in view: Settings, Mail, Village

Approved by Absi on 17 Nov 2026 (decision page question 2: "Essentials plus mail checks").

## What it does
Each Set up page shows the essentials; everything else folds under one closed "Advanced" section, with the defaults
already chosen. Nothing is removed; every control still works under Advanced.
- **Settings:** in view: community name, logo upload, brand colour, the preview, Save. Under Advanced: Logo URL,
  short descriptor, the mail fields (from name, sending domain), Hosting & data, Plan.
- **Mail:** in view: one status line ("✓ Handled by Village — invites send from hello@<domain>" on the managed plan;
  "Mail service: connected / not set, sending from …" otherwise), **the mail checks** (the DNS checklist with "Check
  DNS now", kept in view by Absi's pick), and "Send a test to me". Under Advanced: DKIM selector, reply subdomain,
  the do-not-send list, the sending log, "Running it yourself".
- **Village:** in view: the Connection part (owned by onboarding-village-connect) and the usage meter. Under
  Advanced: Limits and switches, Profile fill-in, What Village sees.
- Words: each page's lede says what it does for the organizer in one line, not how it works.

## Depends on / check-ins
- **Village connect** owns the Connection part of the Village page; this part only moves what is around it. Whichever
  of the two merges second merges main first and keeps both changes.
