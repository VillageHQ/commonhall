---
id: onboarding-claude-setup
status: building
---
# Claude sets up an instance: the guide and one command

From Absi's brief (17 Nov 2026): Claude sets up an instance faster than a person clicking through, and onboards the
organizer with the least friction. The design page listed it as a small call; Absi did not object.

## What it does
- `docs/SETUP-WITH-CLAUDE.md`: install → one command → the short script Claude follows with the organizer (what to
  ask, in order, and what only a person can do, such as connecting their own network on Village's screen) → checks.
- `pnpm setup:instance --url <app url> --file <setup.json>` (`scripts/setup-instance.ts`): plain HTTP to the app, the
  same routes the pages use, no new server power:
  1. create the first admin with the setup token (`POST /api/setup`; skipped when an admin exists and the password
     signs in);
  2. sign in like a person (Better Auth email sign-in) and keep the session cookie;
  3. set the logo, then the name, descriptor and colour (`/api/branding/logo`, then the brand card's
     `/api/admin/branding`: the Settings save `/api/admin/branding/settings` would clear the mail and hosting fields it
     isn't given, and nothing reads them back);
  4. paste the Village keys (`/api/admin/village/keys`) and print "Connected" or the reason;
  5. import members from a CSV with email **off** (`/api/admin/invites/import`): nobody is emailed;
  6. confirm waiting members when the file says so (`/api/admin/members/confirm`);
  7. `--demo`: add made-up founders (example.com, email off).
  It prints what was set and what waits on a person. Secrets (the setup token, the Village secret key, the admin
  password) come from environment variables, never the file.
- README: a Cloudflare tunnel row for `CLIENT_IP_HEADER=cf-connecting-ip`.
- Proven on a fresh test copy, timed end to end, never on the LOI demo, emailing nobody.

## Depends on / check-ins
- Uses only routes on main today. If the guided start or Village connect changes a route it calls, that part says so
  in its own spec.
