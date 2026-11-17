# scripts

> ⚠ RECONSTRUCTED from code on 2026-11-10 — needs confirmation
> Sources: `package.json` scripts, the files here.

- `migrate.ts`: runs the migrations (`pnpm db:migrate`); the app also migrates on boot.
- `auth-schema-config.ts`: `pnpm db:auth-schema` regenerates `src/platform/database/auth-schema.ts` from Better
  Auth with it; no database or secret needed.
- `setup-instance.ts`: `pnpm setup:instance` (guide: `docs/SETUP-WITH-CLAUDE.md`).

All import from `src/`; keep them thin and put logic in `src/platform/`.
