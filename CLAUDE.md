# CLAUDE.md

The root map for agents in this repo. The root `AGENTS.md` is untracked (`next dev` writes its own); this file is the map.

## Project memory (`.ai/`)
- `.ai/roadmap.md` — the backlog; each item links its spec (lines without a spec link have none yet).
- `.ai/features/<slug>/SPEC.md` — one folder per feature (spec, charter, ledger, reports).
- `.ai/journeys/` — the main user journey + core journeys · `.ai/bugs.md` — bug log · `.ai/reports/` — repo-level reports.
- `.ai/tmp/`, `.ai/logs/` — scratch and run logs, never committed.
- `.ai/vision.md` — why the product exists · `.ai/personas.md` — who it serves · `.ai/design/DESIGN.md` — where the design system lives · `.ai/changelog/` — one card per pull request.

> ⚠ RECONSTRUCTED from code on 2026-11-10 — needs confirmation
> Sources: `package.json`, `CONTRIBUTING.md`, `docs/architecture.md`, `src/test/architecture/`.

## What this repo is
An open-source community app for a venture fund and its founders (AGPL-3.0): Today home, the weekly email, double
opt-in intros, the asks board, the partner report, and switchable modules. Next.js, TypeScript, Postgres + Drizzle,
Better Auth, Vitest, pnpm. Village is optional (network search, intro paths, profile fill-in; profile intros work without it).

## How to run / test
- Run: `cp .env.example .env`, `docker compose up -d --wait`, `pnpm install`, `pnpm dev`; set `SETUP_TOKEN`, open `/setup`.
- Test: a database only the tests use in `TEST_DATABASE_URL` (the tests wipe it), then
  `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. Fake Village, Resend and chat servers, no keys.
- Architecture tests: `pnpm test src/test/architecture`.
- Migrations: `pnpm db:generate` after a schema change; the app migrates on boot (or `pnpm db:migrate`).
- Landing page tour: after changing a screen it shows, `pnpm tour:build` and commit `site/` (`src/test/site-tour.test.ts` checks).

## Regressions worth guarding
- Module boundaries and 404-when-off (`src/test/architecture/`).
- Public repo hygiene: no real people, keys or community data (`src/test/public-repo.test.ts`).
- Admins see who asked whom (the owner's decision, 2026-11-11), never an intro's note or reason; members never see each other's email addresses.
- Every email goes through the outbox in its change's transaction, and is sent once.

## Where the notes are
- `src/AGENTS.md` (the code map) and one per module: `src/modules/admin/`, `src/modules/asks/`, `src/modules/chat/`, `src/modules/feed/`, `src/modules/intros/`, `src/modules/job-board/`, `src/modules/library/`, `src/modules/members/`, `src/modules/messages/`, `src/modules/network/`, `src/modules/perks/`, `src/modules/voice/`.
- `scripts/AGENTS.md`.
- How features work today: `.ai/features/chat-perks/NOTES.md`, `.ai/features/fix-intros/NOTES.md`,
  `.ai/features/fix-small/NOTES.md`, `.ai/features/hosting-data-settings/NOTES.md`, `.ai/features/partner-report/NOTES.md`, `.ai/features/small-gaps/NOTES.md`,
  `.ai/features/today-weekly/NOTES.md`, `.ai/features/two-sided-intros/NOTES.md`, `.ai/features/your-data/NOTES.md`,
  `.ai/features/admin-home/NOTES.md`, `.ai/features/admin-firstrun/NOTES.md`, `.ai/features/faces-logos/NOTES.md`, `.ai/features/demo-jobs-perks/NOTES.md`, `.ai/features/village-check/NOTES.md`,
  `.ai/features/reply-by-email/NOTES.md`,
  `.ai/features/jobs-on-cards/NOTES.md`,
  `.ai/features/asks-tools/NOTES.md`, `.ai/features/search-first/NOTES.md` (superseded), `.ai/features/search-connect-only/NOTES.md` (search needs your own Village), `.ai/features/intros-no-village/NOTES.md`, `.ai/features/demo-portraits/SPEC.md` (spec: how to add a portrait),
  `.ai/features/fh-foundation/NOTES.md` (look, parts, shell), `.ai/features/fh-dark/NOTES.md` (dark mode), `.ai/features/fh-public-signin/NOTES.md` (sign-in), `.ai/features/fh-setup-plumbing/NOTES.md` (Set up pages), `.ai/features/fh-inbox-jobs-perks/NOTES.md`, `.ai/features/fh-intros/NOTES.md` (intro screens, links, emails),
  `.ai/features/fh-today-asks/NOTES.md` (Today, Asks & updates),
  `.ai/features/announcements/NOTES.md` (audiences by community role too),
  `.ai/features/commonhall-ai-live/NOTES.md` (commonhall.ai: the Worker, the call form, mail),
  `.ai/features/fh-search-ask/NOTES.md` (search, asks),
  `.ai/features/fh-console/NOTES.md` (the admin console screens),
  `.ai/features/less-choice/NOTES.md` (round 7: defaults instead of choices; Part 4, the admin's first hour: one setup checklist, the Set up badge),
  `.ai/features/fh-directory-profile/NOTES.md` (Directory, profiles, My profile, Your data),
  `.ai/features/fh-final-pass/NOTES.md` (round 4: 404, 410, intro email, print),
  `.ai/features/fh-followup/NOTES.md` (emailed invite link confirms, job board on by default, "copied" words),
  `.ai/features/fix-accounts-privacy/NOTES.md`, `.ai/features/fix-feed-digest-site/NOTES.md`,
  `.ai/features/fix-intros-reports/NOTES.md`, `.ai/features/fix-host-findings/NOTES.md`,
  `.ai/features/fix-cleanup/NOTES.md`, `.ai/features/common-hall-site/NOTES.md` (superseded), `.ai/features/common-hall-v2/NOTES.md` (the landing page: themes, hover field, faces, dialog), `.ai/features/landing-v3/NOTES.md` (the landing page round 3: the rooms list, the scroll demo, the comparison cards), `.ai/features/landing-tour/NOTES.md` (the landing page's live tour: `tour/`, `pnpm tour:build`, how to add a step; the feature groups; round 5: library, voice room and alerts steps, the AI group), `.ai/features/tour-new-steps/NOTES.md` (the tour's eight steps: book a call, find candidates, announcement, admin), `.ai/features/app-kit/NOTES.md` (the app on the Commonhall look: where the colours, fonts and icon live),
  `.ai/features/onboarding-settings-fold/NOTES.md` (Set up pages: essentials in view, the rest under Advanced),
  `.ai/features/onboarding-village-connect/NOTES.md`, `.ai/features/onboarding-guided-start/NOTES.md`,
  `.ai/features/mentors-calls/NOTES.md` (community roles, booking links, Book a call, calls counted),
  `.ai/features/find-candidates/NOTES.md` (Find candidates on a job: the button, the search, the hiring request),
  `.ai/features/notifications/NOTES.md` (alerts: notify(), devices, quiet hours, the manifest and service worker),
  `.ai/features/mobile-app/NOTES.md` (store app: bridge, code, alerts, rooms),
  `.ai/features/room-join-notify/NOTES.md` (superseded), `.ai/features/room-start-instant/NOTES.md` (one-tap rooms, Room alerts),
  `.ai/features/voice-sessions/NOTES.md` (Rooms: voice rooms on LiveKit, roles, the token API, ports, reminder alerts; never recorded),
  `.ai/features/ai-library/NOTES.md` (the portfolio AI library: visibility, the secret scan, votes, the leaderboard),
  `.ai/features/fix-installer/NOTES.md` (install.sh: build failures, swap, first install, DNS), `.ai/features/onboarding-claude-setup/NOTES.md` (setup:instance), `.ai/features/fix-network-page/NOTES.md`, `.ai/features/self-call-http/NOTES.md` (rewrites behind an https tunnel).
- `tour/AGENTS.md` (the landing page's live tour, built into `site/tour/`).
- `mobile/AGENTS.md` (the store app, its own npm project).
- No notes: `.do/`, `.github/`, `deploy/` (`deploy/cloudflare/README.md` runs commonhall.ai), `docs/` (guides), `drizzle/` (generated), `site/` (own README), `public/` (demo pictures),
  `vercel.json` (the daily Vercel Cron Job). Every deploy setup runs the job runner;
  `src/test/deploy-setups.test.ts` guards it.
