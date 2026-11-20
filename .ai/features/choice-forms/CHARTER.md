# Charter: sharing and posting forms (round 7, less-choice Part 5)

Approved as Part 5 of [less-choice/SPEC.md](../less-choice/SPEC.md) (council pass, 20 Nov 2026, 3 of 3). This page only
records how the part is built; the spec decides what.

## Direction
The owner, 20 Nov: less choice everywhere, simplicity first. Part 5: the library's share form, adding a job, and the
hiring request from a job. Out: everything the spec lists for Parts 1–4 and "NOT in this round".

## What changes
- **Library, share (`/library/new`):** Title, one box "Paste it, link it or attach a file" (with Attach), the guessed
  Kind shown as one line with "Change", then Share. Under "More options": a one-line pitch (the first line of the
  paste when empty), Role (optional), how to install, a link next to pasted text, and who can see it ("Whole
  portfolio" by default). A box holding one link becomes the item's link. The secret scan reads every pasted text
  (the box, the pitch, the install steps, the link), not only files.
- **Jobs, add (`/me` › Our jobs):** "Add a job" first: title, location, an apply link or email (optional). It goes on
  the company's existing card (a linked board's card too: a pull never touches jobs added by hand), or makes the one
  card. With no link, Apply on the members' board messages the founder. "Already on Greenhouse, Lever…? Paste your
  careers link" is the second line (the 15-option tool list goes: the link names its tool). Linking a board for a
  company that has jobs added by hand moves them onto the board's card, so no second card.
- **Hiring request:** the request made from a job carries the job; the server checks the member may hire for it, and
  then it doesn't use a weekly ask (stored on the ask, so a crafted category can't skip the allowance). The button
  says so.

## Deciding facts (assumed)
1. Kind and Role stay as data (browse filters use them): Kind is always set (guessed), Role may be empty.
2. A job's apply email shows as a mailto link (the founder chose to post it), on every board.
3. A migration: `library_item.job` may be empty; `ask.hiring_job_id` (no foreign key: modules can't name each other's tables).

## Checks (spec)
A hiring request from a job leaves "asks left" unchanged; sharing a pasted prompt takes 1 title + 1 paste + 1 tap
(before: 7 decisions); a pasted made-up key pattern is caught; a job with no link posts and its Apply opens a message;
`src/modules/library/` and `src/modules/job-board/` tests green. Driven by a separate verifier at 390 px and 1280 px.
