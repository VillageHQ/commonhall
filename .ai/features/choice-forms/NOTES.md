# Notes: sharing and posting forms (round 7, less-choice Part 5)

How it works today. Charter: [CHARTER.md](CHARTER.md). Spec: [less-choice SPEC](../less-choice/SPEC.md) Part 5.

## Library, share (`/library/new`, `publish-form.tsx`)
- One box: `splitShareBox` (`src/modules/library/rules-share.ts`) makes a box holding one link the item's link; anything
  else is the item's text. Attach sits under the box.
- Kind is always stored (browse filters use it): `guessLibraryKind` reads the title's words, then the files, then the
  box (a lone link is a tool connection, a paste a prompt). Shown as "Kind: Prompt · Change"; Change opens the select.
- Role (`library_item.job`) may be empty (migration `0049_choice_forms`). The pitch, when empty, is the paste's first
  line with words (`derivePitch`), else the link, the files' names or the title.
- The secret scan: `scanPastedText` runs the file scan's patterns (`rules-secrets.ts`) over the title, box, pitch,
  install steps and link, on the server, before anything is saved.

## Jobs, add (`/me` › Our jobs)
- "Add a job" (`manual-jobs.tsx` → `POST /api/job-board/jobs/add`) puts the job on the member's one card for that
  company (`readOrMakeCompanyCard`, a linked board's card too), or makes the card. A pull never touches jobs added by
  hand. The old "start a by-hand company" route is gone.
- The link is optional: a web address, or an email shown as a mailto link on every board. With neither, the members'
  board's Apply opens a message to the founder (`applyByMessageHref`); public views show no Apply.
- Adding to a hidden card says so (hidden by the founder: how to show it; by an admin: an admin shows it again).
- Our jobs lists every job added by hand (each with Remove); only pulled jobs are cut at 8.
- "Already on Greenhouse, Lever…?" (`link-source-form.tsx`) takes only the link; the link names its tool. Linking a
  board for a company with jobs added by hand puts the board on that same card.

## Hiring request from a job
- Find candidates' "Post a hiring request" carries the job (`toAskDraftHref(…, { jobId })`) only while the job's free
  request is unused this week (`isHiringRequestFree` in `src/modules/asks/reads.ts`); the button and the composer say
  "uses no weekly ask" only then.
- `POST /api/asks/create` checks the job (`readCheckedHiringJobId`: listed, and one the member may find candidates
  for); a job that fails is a 404. `createAsk` stores `ask.hiring_job_id` only on the free request, and the allowance
  (`readPostedAskTimes`) skips asks with a job. So a repost or other words for the same job count like any ask, and a
  crafted category alone never skips the allowance. Test: `src/shell/hiring-request.test.ts`.

## Not here
- Apply on a no-link job opens an empty message (no job named); a profile's jobs card shows no Apply for a no-link job.
  Follow-ups.
