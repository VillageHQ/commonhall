# Notes: defaults instead of choices (how it works now)

## Part 4: an admin's first hour and daily view

- **`/setup` names the community:** `src/app/setup/setup-form.tsx` adds "Community name" (required in the form);
  `POST /api/setup` takes an optional `communityName` (trimmed, 1–60 characters; `pnpm setup:instance` leaves it
  out and names the community in its own branding step). `claimFirstAdmin` (`src/platform/auth/first-admin.ts`)
  saves it to `community_branding` (name + `saved_at`) in the same transaction as the admin.
- **The guided start** (`src/shell/guided-start.ts`, `src/app/(app)/admin/start/`): `GUIDED_STEP_ORDER` is
  Invite founders, then Your card. No Village step (`?step=village` shows step 1). The card is the last step:
  `GuidedCardForm` passes `onSaved` to the welcome's `AboutForm` (new optional props `onSaved`, `submitLabel`), so
  "Save and finish" saves the card, finishes the guided start and opens `/admin`; "Skip for now" finishes too.
- **Invites** (`src/modules/admin/components/invite-sheet.tsx`, used by the guided start and `/admin/invites`): one
  box, the cohort folded under "Add a cohort", one button ("Send invites" with mail on, "Create invite links" with it
  off). The profile fill-in question shows only when `readIsFillInOffered` (`src/modules/admin/reads-members.ts`):
  the network is on and Village's keys are saved and readable; it is preselected on "Ask each member at sign-in".
  After the links are made: one row per founder with its own "Copy link", "Open in your email" as a small link under
  the person, "Copy all links" only for two or more.
- **Sign-in links** (`/admin/links`): the line "Copy makes a new link; the one you sent before stops working." sits
  above the rows. Copy still makes a new link (only token hashes are stored; handing back the same link is the
  owner's security call, not in this round).
- **One checklist:** `src/shell/admin-setup-steps.ts` holds the steps (name, invite, card, mail). `console-launch.ts`
  words them (Home's checklist before launch); `admin-setup.ts` `readSetupProgress` counts the same list (the landing,
  Home's "Next setup step", the admin's Today card). Invite is done while an invite is open or used (a revoked one
  alone reopens it). Card is done when the first admin's profile has `card_step_done_at`. Mail is done with mail on,
  or once links were made with mail off ("Mail: you copy the links"). Village and the partner report are no setup
  steps. The older `setup-checklist.tsx` (rendered nowhere) and its copy file were removed.
- **The Set up badge** (`src/shell/navigation-badges.ts`) is the setup steps left only. Flags, members waiting for an
  OK and Village trouble show on Home's "Needs you" (`readAdminTabFacts` still reads them for Home).
- **Set up rows** (`src/shell/admin-setup-rows.ts`): in view: Mail, Weekly email ("Thu 09:00 UTC" or "off"; opens
  Announce with `?schedule=open#weekly-heading`, which opens "Change the schedule"), Features, Network search
  (Village, optional). "Your plan" under Advanced hides once Home has launched (`hasLaunched`).
- **Console Home:** `PartnerReportTile` (`src/shell/console-home-parts.tsx`) on the checklist and on the dashboard,
  so a phone reaches `/admin/report` in one tap.
- **Proof:** `reports/choice-admin/` (screenshots at 390 and 1280 px, `VERIFY.md`).
- **Tests:** `src/shell/admin-setup.test.ts`, `admin-home.test.ts` (the checklist words, the badge at 0 with an open
  flag), `admin-setup-rows.test.ts`, `guided-start.test.ts`, `src/app/api/setup/route.test.ts` (the name).
