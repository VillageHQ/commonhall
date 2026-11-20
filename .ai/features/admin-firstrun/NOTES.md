# First-run admin landing: how it works

- `src/shell/landing.ts` `readLandingPath` (pure, tested) picks the landing from three facts: welcome steps done,
  admin, setup complete. `src/app/(app)/start/page.tsx` reads them (setup progress only for an admin who is past the
  welcome steps) and redirects.
- The welcome page's "done" redirect and the welcome's "Not now" / "Continue" finish (`not-now-action.tsx`) go to
  `ROUTES.landing`, so the landing decides; for a member that is still the feed.
- The stuck-intros wording lives in `src/shell/admin-home.ts` `readAdminHomeItems`.

## Round 7 (less-choice, Part 4)
"Setup complete" is the one checklist (name, invite, card, mail; `src/shell/admin-setup-steps.ts`), the same list as
Home's launch checklist. See `.ai/features/less-choice/NOTES.md`.
