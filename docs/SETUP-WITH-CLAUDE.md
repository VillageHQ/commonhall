# Set up with Claude

Claude can set up a new Commonhall for an organizer in a few minutes: install it, write one setup file, and run one
command. The command uses the same pages' routes a person clicks through (signed in as the admin), so it can do
nothing a person couldn't, and it is safe to run again.

This page is written for Claude (or anyone at a terminal) helping an organizer.

## 1. Install

Pick one way from the [README](../README.md#deploy): a deploy button, `install.sh` on your own server, or locally:

```sh
cp .env.example .env          # set SETUP_TOKEN to 32+ random characters
docker compose up -d --wait
pnpm install
pnpm build && pnpm start      # or pnpm dev
```

Note the app's address (`APP_URL`) and the `SETUP_TOKEN` you chose.

## 2. Ask the organizer, in this order

Ask one thing at a time; every answer goes in the setup file except the three secrets.

1. **Who is the admin?** Their name and email. Then ask them to choose a password (12+ characters). It goes in
   `COMMONHALL_ADMIN_PASSWORD`, never in the file.
2. **The look.** The community's name, a brand colour like `#24525A` (both needed), a one-line descriptor (optional;
   left out, it is cleared), and a logo
   file (PNG, JPEG or WebP, up to 512 KB; SVG is refused). Is the logo light on a dark background?
   Then `"logoBackdrop": "dark"`.
3. **Village** (optional; it shows who knows whom). Only the organizer can do these, on Village's screens:
   create a developer account at <https://village.ai/platform> (**New developer account**), finish
   [Village's checklist](https://village.ai/platform/onboarding), then copy both keys from
   [API keys](https://village.ai/platform/settings/api-keys). The public key goes in the file; the secret key in
   `VILLAGE_SECRET_KEY`. No keys yet? Leave `village` out; they can paste them later in Set up › Village.
4. **Members.** A CSV of the founders: a header row naming the columns (at least `email`; also `name`, `company`,
   `cohort`), or no header and the columns in the order name, email, company, cohort. A bare list of emails with no
   header imports nobody: add the `email` header line.
   How did they agree to profile fill-in: Commonhall asks each one (`"basis": "ask"`), or their membership terms
   already say so (`"basis": "terms"` with `"termsDate"`, the day the terms started saying it).
5. **Anyone waiting?** On an instance already in use, members who joined but wait for an admin to confirm their
   email: confirm them all (`"confirmWaiting": true`), some (a list of emails), or none (leave it out).

## 3. Write the setup file

`setup.json` (paths are relative to this file):

```json
{
  "admin": { "name": "Robin Organizer", "email": "robin@example.com" },
  "brand": { "name": "Northwind Founders", "descriptor": "The Northwind Ventures portfolio", "accent": "#7A3E9D", "logo": "logo.png" },
  "village": { "publicKey": "pk_..." },
  "members": { "csv": "members.csv", "basis": "ask" },
  "confirmWaiting": true
}
```

Only `admin` is required. The file is refused if it holds a password, token or secret key: keep it free of secrets so
it can be shared or kept with the organizer's notes.

## 4. Run one command

```sh
SETUP_TOKEN=... COMMONHALL_ADMIN_PASSWORD=... VILLAGE_SECRET_KEY=... \
  pnpm setup:instance --url https://community.example.com --file setup.json
```

`--url` must be the app's own address (`APP_URL`): sign-in and the admin routes refuse any other origin. (Creating
 the admin doesn't check it, so a wrong address creates the admin and then stops at sign-in; run again with the right
 address.) Add `--demo` to
also invite five made-up founders (example.com addresses) to try things with.

What it does, in order, and what it prints for each (✓ done, – skipped, ✗ failed, → for a person):

1. Creates the first admin with the setup token. If an admin exists, it signs in instead (leave `SETUP_TOKEN` unset
   to skip this step).
2. Signs in as the admin, like a person.
3. Uploads the logo, then saves the name, descriptor and colour exactly as the file says (the brand card's save; mail
   and hosting settings stay as they are). A refused logo stops here and changes nothing.
4. Tries the Village keys with Village and saves them: "Connected to <your Village app's name>", or the reason
   Village gave. A refused key saves nothing (keys saved before stay as they were) and does not stop the rest.
5. Imports the CSV with **email off**: everyone gets an invite, nobody is emailed. People already invited or already
   members are skipped, and each line not imported is printed with its reason.
6. Confirms waiting members when the file says so. Anyone reported "not me" is left for a person.

It ends with what only a person can do. Running it again with the same file changes nothing: people already invited
are skipped, and the look and keys are saved again as they are.

## 5. Check, then hand over

- Open `<url>/admin`: the console checklist shows what is done. With mail off, its mail-and-network row stays open
  even when Village is connected; that is the mail part.
- Set up › Village shows "Connected" when step 4 passed.
- Set up › Sign-in links holds each member's invite link to copy, because nobody was emailed. Once mail works
  (Set up › Mail), invites can go out by email from there.
- Tell the organizer what is left for them:
  - **Their own network**: they (and each member) connect it on Village's screen from their profile; nobody can do
    it for them.
  - **Mail**, on their own server: the Resend variables in the README, then the DNS checks in Set up › Mail.
  - **A hello**: a first post, so the first founder doesn't walk into an empty room.

## If it stops

A line marked ✗ says why. The admin, sign-in, logo, look and member steps stop the run there; a refused Village key
is marked ✗ and the run goes on. Either way it ends with "Not finished" and exit code 1. A problem found before any
step runs (invalid JSON, a missing file) prints "Setup failed: …" instead, also with exit code 1. Fix it and run it
again.

- "The setup token is wrong": `SETUP_TOKEN` must match the server's. After 10 wrong tries in a minute it pauses.
- "Could not sign in … Invalid email or password": the admin exists with another password (use **Forgot your
  password?** on the sign-in page, then **I lost my admin password**), or no admin exists yet and `SETUP_TOKEN` was
  not set.
- "Too many tries for this account": five wrong passwords in a minute pause sign-in for that admin. Wait a minute.
- "Already has a pending invite" on a rerun: that person was invited before; nothing changed for them.
- "Invalid origin" or "This request came from another site": `--url` is not the address in `APP_URL`.
- Behind a Cloudflare tunnel, set `CLIENT_IP_HEADER=cf-connecting-ip` on the server (README, rate limits).
