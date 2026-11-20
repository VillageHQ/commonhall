# How Today and Asks & updates work today (Commonhall's screens)

Area 1 of the Commonhall transplant: Today, Asks & updates and one ask's page, in Commonhall's structure, parts and
words, on Community's engine. Commonhall's markup is ported 1:1 with the `fh-` classes from `src/app/parts.css`.

## Where things are
- **Today** — `/today` (`src/app/(app)/today/page.tsx`). `/` sends members there permanently, keeping the query.
  The screen is `src/shell/today-list.tsx` (`TodayPage`); actions are `src/shell/today-actions.tsx` ("Not this week",
  Right / Hide it / Fix it). Data: `src/shell/today.ts` (`readTodayItems`, shared with the weekly email).
  Round 6 (simplify part 2), one column: the full-width "Live now" card (`readLiveRooms`, only while a room is live)
  → Waiting on you (intros for your yes, intros to make, answers to your open asks; 3 at most) → You could help (2
  at most) → Is this right? (only in a member's first 14 days) → next steps → one "More for you" row (Jobs, Perks,
  Library, each while on). "Post an ask" opens `/asks?compose=1`. The reply-by-email line shows only with a reply
  domain. Your own asks live on Asks › Yours.
- **Asks** — `/asks` (`src/app/(app)/asks/page.tsx`), round 6: the "What do you need?" box first (Ask | Update, one
  line, "Who are you trying to reach?" folded; the allowance once, under it). `?compose=1` (`ASKS_COMPOSE_PAGE`) and
  `#compose` focus it. Then archive search, chips Open (asks and updates) · For you (sent to you) · Yours (`?tab=`);
  `?tab=answered` still lists answered ones, `?tab=updates` opens Open. "How asks work" is a closed fold at the foot.
  Components: `asks-board.tsx`, `asks-composer.tsx`, `post-parts.tsx`. Reads: `reads-board.ts`.
  `/asks?view=yours|answered|closed` redirects permanently to the matching tab.
- **One ask** — `/asks/[askId]` (`ask-detail.tsx`, `ask-detail-forms.tsx`): one way to respond: "I can help" with an
  optional note. The kind is picked for the helper: routed through a person they know offers that person, anyone else
  offers "I've done this". The author, updates, closed asks and people who already helped get the reply box. Helpers
  with paths show to the author only. Mark answered, Reopen, admin Pin / Close / Remove (`/api/asks/status`,
  `service-status.ts`). Community-only and kept: Report this ask/answer (quiet link, confirm in place), Renew near 30 days.
- **Flash** — `?m=<key>` on the page you land on; words in `ASK_FLASHES` (contract.ts).
- **Feed** — Community-only, off by default: its own page `/feed`, a menu item only while on.

## Rules
- An ask is one line (≤500) plus optional `target_text` (≤160) and `target_company` (≤120). No category is asked:
  with a target it's an intro, else advice (the partner report counts by it). The old LinkedIn target still works.
- Path check: the target words are searched in the author's network (`findAskPaths`, `src/shell/ask-helpers.ts`),
  the first non-member found is looked up for paths; members who share only. Helpers keep `person_name`,
  `person_title`, `warmth`, so "Why you" reads like Commonhall. Profile helpers quote the helper's "can help with".
- Today and the weekly email show only asks the member was routed to (Commonhall's rule).
- "I can help" leaves a public line (`ask_answer.kind` know_someone / done_myself), keeps a private `ask_offer`, and
  emails the asker (`ask_help_offered`). Answers: many per member; the same words within a minute post once.
- "Is this right?": filled-in Role / Company / City not replaced by own words, not hidden, not confirmed
  (`member_fill_in.confirmed_at`; a refresh that changes the words clears it). Fix writes the member's own words.
- Emails are Commonhall's plain text (`renderPlainTextHtml`). A text with `[[unsubscribe-url]]` gets the member's
  unsubscribe link there instead of the usual footer (`outbox-sender.ts`).
- The post allowance error uses Commonhall's words (`assertPostAllowance`); intro asks keep Community's.

## Known gaps (follow-ups)
- "Ask for an intro" opens the network search until area 2 adds Commonhall's guided ask at `/ask` (`GUIDED_ASK_PAGE`).
- Digest: RIGHT / HIDE / FIX reply codes don't exist yet; fact lines link to Today instead.
- "Message" on a helper links `/messages/new?to=` (area 5 adds that page).
