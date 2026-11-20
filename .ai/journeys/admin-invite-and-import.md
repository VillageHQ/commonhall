# Journey: the admin invites founders, one by one or from a list

> ⚠ RECONSTRUCTED from code on 2026-11-10 — needs confirmation
> Sources: `.ai/features/email-signin/SPEC.md` (bulk invites), `src/app/(app)/admin/members/`,
> `src/modules/admin/components/invite-manager.tsx`, `src/app/invite/`, `src/app/(app)/welcome/`.

Who: the fund's platform lead (admin) and portfolio founders.

A new admin first meets this as step 4 of the guided start (`/admin/start`, after /setup): the same paste and CSV
forms, with the email switch.

1. The admin opens Admin › Members (`/admin/members`) → "Invite someone" (one email), or "Invite many people":
   paste a list (up to 500) or upload a CSV with name, email, optional company and cohort (up to 20,000 rows).
2. Each person gets a single-use invite for 14 days; members and pending invites are skipped and every skipped or
   bad line is named. With email off, the admin downloads the links as a CSV to send themselves.
3. The founder opens `/invite?token=` (old `/join/<token>` links redirect) → "Join <community>", "You were invited
   as <email>" → "Accept and sign in": a passwordless account, signed in, email still unconfirmed (the confirmation
   email does that).
4. Welcome, Commonhall's two steps: `/welcome` (name, what they work on, who they could help, role, company, city)
   → `/welcome/privacy` (directory visibility, intro asks, profile fill-in) → the directory with "You’re in. This
   is the directory." Sharing their network waits on the network page.
5. The admin sees them as a member in Admin › Members, with the Manage menu (admin role, remove, and more).

Tests: `src/modules/members/bulk-invites.test.ts`, `src/modules/members/invites.test.ts`,
`src/modules/members/accept-invite.test.ts`, `src/modules/members/onboarding.test.ts`.
Known gap (roadmap, open): the single invite form has no cohort field.

## Round 7 (less-choice, Part 4)
The guided start now opens on the invites (step 1 of 2, right after /setup, which also names the community): one
box and one button, "Create invite links" with mail off ("Send invites" with it on); the cohort is folded and the
profile fill-in question shows only while Village is connected. Each founder gets a "Copy link" right after. From
/setup to a copyable link: 2 screens, 0 decisions (proof: `.ai/features/less-choice/reports/choice-admin/`).
