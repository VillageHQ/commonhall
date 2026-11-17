# Notes: the guided start (how it works now)

- **Signed in at once:** `src/app/setup/setup-form.tsx` posts `/api/setup`, then signs in with the same email and
  password through Better Auth's client (`authClient.signIn.email`, as /signin does) and opens `/start`. If that
  sign-in fails it falls back to `/signin?adminCreated=true`. No new server power: the route is unchanged.
- **The token hint:** the Setup token field's hint says whoever installed the app chose it (SETUP_TOKEN in the
  server's settings) and links the README's "Setup token" section. `FormField`'s `hint` takes a ReactNode for it.
- **Who lands there:** `claimFirstAdmin` (`src/platform/auth/first-admin.ts`) writes the `guided_start` setting as
  `pending` in the same transaction as the admin. `src/shell/guided-start.ts` reads it (`isGuidedStartPending`) and
  `finishGuidedStart` writes `done` (`POST /api/admin/guided-start`, admin only). `readLandingPath`
  (`src/shell/landing.ts`): welcome steps first; an admin with the guided start pending → `/admin/start`; an admin
  with setup unfinished → `/admin` (the console's Home and its launch checklist; it used to be `/admin/setup`);
  everyone else → the feed. Installs made before this have no value, so their admins never land there.
  The flag is one per install, not per admin: a second admin made before the first finishes would land there too.
- **The page:** `src/app/(app)/admin/start/page.tsx` (`?step=look|village|card|invite`; an unknown or switched-off
  step shows the first). Steps come from `readGuidedSteps(isNetworkOn)`: Connect Village is left out while the network
  module is off, so the count reads "of 3". Client parts: `guided-parts.tsx`.
  1. **Your look:** `SettingsForm` with `guided` (no Advanced, "Next" saves with the same `/api/admin/branding/settings`
     save, then moves on). Its failures show as a line under Next, not the page flash: every step has the same
     address, so a flash would stay on the later steps.
  2. **Connect Village:** `VillageConnect`; "Next" is enabled when it starts connected or `onConnected` fires.
  3. **Your card:** "Welcome to <community>", `AvatarField` and the welcome's `AboutForm` (`nextHref`, `secondary`).
     It posts `/api/onboarding/welcome`; `saveProfile` creates the admin's profile with the welcome marked done.
  4. **Invite founders:** a line when mail is off ("links wait on Sign-in links"), `InviteSheet` (paste), and
     "Or upload a CSV, with the email switch" (`ImportMembersForm isCompact`: one column, no columns sheet).
     "Finish" and "Skip for now" both end it. "Skip the guided start" (top right) ends it from any step.
- **Back to it:** the launch checklist's foot links "guided start" (`src/shell/console-launch-view.tsx`).
- **Not changed:** `src/shell/setup-checklist.tsx` (the older setup checklist with `KeysForm`) is rendered nowhere.
- **Tests:** `src/shell/guided-start.test.ts` (steps, network off, step fallback), `src/shell/landing.test.ts`,
  `src/app/api/setup/route.test.ts` (pending after setup, done after finishing). Proof:
  `reports/` (desktop and phone from /setup to the console Home, `desktop-flow.mp4`).
