# Charter: notify-schedule (part 4 of Commonhall round 6, the alerts schedule)

Approved by: the round-6 lead, 20 Nov 2026, on the owner's ask ("members can set when they do NOT receive portfolio
notifications, e.g. working hours"). The plan is the approved [SPEC.md](SPEC.md) with the round's
[simplify-round6 SPEC](../simplify-round6/SPEC.md) (Part 4, the shared rules, the text rule, the council's
decisions). No separate alignment page: the round's plan went through a council pass before the build.

## The lead's brief, in short
- Build Part 4 of simplify-round6: [notify-schedule](SPEC.md), with the "Muted people" words.
- Own only the part's files: `src/platform/notifications/**` (part 0's log lines excepted), `src/components/alerts/**`,
  `src/app/(app)/me/alerts/**`, the bell's one line in `src/app/(app)/rooms/page.tsx`, the alert lines of
  `tour/src/data.ts`. Anything else goes to the lead as a question.
- Done when every acceptance criterion passes, checked by a separate verifier in a real browser at 390px and 1280px
  on a throwaway copy with made-up people, with `study/capture.mjs` word counts and proof screenshots; CI green;
  rebased on main; `pnpm db:generate` and `pnpm tour:build` last; a pull request open, not merged (the lead merges
  in order).

## Small calls taken in the build (each reversible)
- Every change on the Alerts page saves at once (no Save button); the custom quiet time has its own Save. With
  `?from=rooms` the back link goes to Rooms, so "returns to Rooms" is one tap.
- `PUT /api/notifications/preferences` is the contract; `POST` stays as the same handler for the app's own form.
- A pause body may carry the browser's `timeZone`, used only for a member who never saved (the spec's "first save").
- Files touched outside the list, logged in the progress file for the lead: the alerts API routes (the spec's
  contract), one helper in `src/modules/voice/voice.test.ts` (the old quiet-hours shape), and the tour's Alerts
  screen and step (`tour/src/screens.tsx`, `tour/src/steps.ts`), which show the screen this part changed.
