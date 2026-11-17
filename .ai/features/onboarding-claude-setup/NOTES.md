# How "Set up with Claude" works

Guide: `docs/SETUP-WITH-CLAUDE.md`. Command: `pnpm setup:instance --url <app> --file <setup.json> [--demo]`
(`scripts/setup-instance.ts`, thin). Logic: `src/platform/setup-instance/` (`setup-file.ts` reads and checks the file;
`run-setup.ts` runs the steps). Tests: `run-setup.test.ts` (a fake fetch; no database).

- **Plain HTTP, no new server power.** It calls only routes the pages already use, signed in as the admin with Better
  Auth's `POST /api/auth/sign-in/email` and the session cookie it sets. Every call sends `Origin: <--url origin>`:
  member routes and Better Auth refuse any origin but `APP_URL`'s. `POST /api/setup` doesn't check the origin, so a
  wrong `--url` creates the admin and then stops at sign-in; a rerun recovers.
- **Order:** setup (201 created, 409 already done → sign in; no `SETUP_TOKEN` → skip) → sign in → logo
  (`/api/branding/logo`, raw bytes, `?backdrop=`) → look (`/api/admin/branding`) → Village keys
  (`/api/admin/village/keys`) → CSV import (`/api/admin/invites/import?invite=0&basis=…`) → `--demo` import of five
  example.com founders → waiting members (`/api/admin/members/waiting`, then `/confirm` each).
- **Why the brand card's route, not Settings' save** (`/api/admin/branding/settings`, which the spec named): that save
  writes every Settings field and treats an empty one as "not set", and there is no route to read the current values,
  so it would wipe mail and hosting settings an admin set by hand. The brand card's save writes only name, descriptor
  and colour. It needs all three, so `brand.accent` is required in the file and a missing descriptor is cleared.
- **Logo before look:** a refused logo (SVG, over 512 KB) stops the run before the look is saved.
- **What stops and what goes on:** admin, sign-in, logo, look, import and confirm failures stop the run. A refused
  Village key is marked ✗ and the run goes on; since Village connect, the keys route tries keys before saving, so a
  refused key leaves saved keys and the community's Village status alone. The route returns `appName`, printed as
  "Connected to <name>". Exit code 1 when anything is ✗.
- **Email is always off:** `invite=0` is fixed, nobody is emailed whatever the server's mail settings.
- **Secrets** come only from `SETUP_TOKEN`, `COMMONHALL_ADMIN_PASSWORD` and `VILLAGE_SECRET_KEY`. A file with a field
  named like a secret (password, secret, secretKey, token, apiKey) is refused, and the schema is strict, so an unknown
  field is refused too.
- **Confirm** skips anyone reported "not me" and prints them for a person.
- **Exit:** the script sets `process.exitCode` and lets Node finish. `process.exit()` while fetch's sockets closed
  crashed Node on Windows (`UV_HANDLE_CLOSING` assertion, exit -1073740791) and turned a success into a failure.
- **Repeat:** the same file twice changes nothing: invites already pending are skipped (each printed with the route's
  reason), the logo, look and keys are saved again as they are.
- README: a Cloudflare tunnel row (`CLIENT_IP_HEADER=cf-connecting-ip`) in the rate-limit table, and a pointer from
  "Your first 10 minutes".
- Proof: `reports/fresh-run.txt` (fresh database, timed, twice, a wrong key); the verifier's screenshots in
  `reports/verify/`.
