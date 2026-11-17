# scripts

> ⚠ RECONSTRUCTED from code on 2026-11-10 — needs confirmation
> Sources: `package.json` scripts, the files here.

- `migrate.ts`: runs the database migrations (`pnpm db:migrate`). The app also migrates on boot.
- `auth-schema-config.ts`: the config `pnpm db:auth-schema` uses to regenerate
  `src/platform/database/auth-schema.ts` from Better Auth. It needs no real database or secret.
- `setup-instance.ts`: `pnpm setup:instance --url <app> --file <setup.json> [--demo]` sets up an instance over
  HTTP through the pages' own routes (`src/platform/setup-instance/`, guide: `docs/SETUP-WITH-CLAUDE.md`). Secrets
  come from environment variables only; member import always runs with email off.

All import from `src/`; keep them thin and put logic in `src/platform/`.
