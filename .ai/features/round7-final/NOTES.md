# Round 7's last fixes: how they work today

The fixes the round-7 checks found, before TestFlight 4. Charter: [CHARTER.md](CHARTER.md).

## Invites and first setup
- A pasted list skips only a first line made of column names with an email one ("name, email"); any other line without
  an address is named (`contract-bulk-invites.ts`, `isHeaderLine`).
- `/setup` gives every typed value back after a refusal, the token included, and focuses the field the server names
  (`api/setup` answers `field`).
- The invite email says "can introduce you" only once Village's keys are saved, else "can help you"
  (`readInviteBranding`, `readInviteWords({ isNetworkSearchOn })`). The admin's confirm notes say "turns on network
  search" only then too (`readIsFillInOffered`).
- On a phone the invite's send-it-yourself rows drop the mail mark and say "Copy", so the address isn't cut.

## Rooms
- A host has one live room: Start (no time) while theirs is live returns it (`findHostedLiveRoom`). Scheduling still
  makes a new room.
- The store app's room screen has Rename for the host (`/api/voice/rename`; the page under it reloads) and shows the
  page's quiet-start line, sent with `openRoom(..., { notice })` on the first opening only.

## What's done stops asking
- Today's "Read" line shows only while the ask has an answer from someone else newer than `ask.answers_seen_at`; the
  ask page sets it for its author (`POST /api/asks/seen { askId }`, `MarkAnswersRead`).
- The connector's answered intro shows its status pill once, beside the title.
- The connector's first answer moves only from `requested` (`transitionIntro(..., { onlyFrom })`): a stale tab's No
  thanks after a yes gets 409 and the page redraws. "I can't make this intro after all" stays the way to undo a yes.
- Wins and updates neither count toward nor are refused by the 5 open asks (`readOpenAskCount` counts asks only).
- The connector's email and link page offer Yes and No thanks, as the app; `dont_know` is still accepted.

## Settings on a phone
- The avatar menu's last group (admin switch, Dark mode, Sign out) is pinned to its foot while the lists scroll.
- The sign-in settings row is "How you sign in", as its page. My profile's settings list has a "Settings" heading.
- My network's consent points to Privacy for intro asks (it keeps its own consent).

## Jobs with no link
- Apply opens `/messages/new?to=<founder>&draft=I'd like to apply for <job> at <company>.` on the board and on the
  founder's profile (`shell/job-apply-message.ts`). `draft` fills the reply box, also in an existing conversation.
