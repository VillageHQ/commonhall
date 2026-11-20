# How the AI library works today

A switchable module, `library` (`src/modules/library/`, its `AGENTS.md` lists every file). On where no admin chose;
Admin › Features turns it off, and then its pages and API answer 404 while the data is kept.

## Data (`schema.ts`, migration `drizzle/0041_library.sql`)
- `library_item`: title (≤120), pitch (≤160, one line), kind, job, description, install steps, link (http/https only),
  visibility (`portfolio` default, `fund_team`, `companies`), `version_count`, `download_count`, `featured_at`,
  `feed_post_id` (the post that announced it; no foreign key, as the module can't name the feed's table).
- `library_item_company`: the chosen companies of a `companies` item, by name without case or extra spaces.
- `library_version` (number per item) and `library_file` (bytes in Postgres, as avatars and logos; ≤10 MB per file and
  per upload). Words change in place; new files make a new version. The item page shows the latest version's files;
  older versions' files still download by id.
- `library_vote` (item, voter: the primary key makes it one per member) and `library_review` (one line ≤200, one per
  member per item; posting again replaces it).

## Who sees what (`reads.ts`, `isItemVisibleTo`)
One rule for every page, route, download, Today card and leaderboard: admins and the author always; otherwise the whole
portfolio, or the fund team (community role `fund_team`), or members whose company on show matches a chosen company.
The author must be active (or removed with content kept) and neither may have blocked the other. Anything else is 404.

## Uploads (`rules-uploads.ts`, `rules-secrets.ts`, `rules-zip.ts`)
Publishing is one multipart request (`/api/library/publish`: the fields as JSON in `item`, up to 10 files in `files`).
Before any write: the extension (zip, md, txt, json, yaml/yml, py, js, ts), the 10 MB cap, then the secret scan, which
also reads inside zips (stored or deflated; locked, oddly packed or over 50 MB unpacked is refused). The scan is plain
patterns: private key blocks, AWS, GitHub, Slack (tokens and webhooks), Stripe live, AI-provider `sk-…`, Google,
SendGrid and Twilio keys, passwords inside links, secret-named settings with a value (`OPENAI_API_KEY=…`), and any
line with a value in a `.env` file (`.env.example` and friends get the ordinary rules). Placeholders (`your-key`,
`${VAR}`, `process.env…`, `xxxx`, one repeated letter) pass. A hit refuses with "“file” line N looks like …".
Files download only as attachments, with `nosniff` and a sandbox policy.

## Votes, leaderboard, featured, reports
- Upvote toggles; never on your own item (422). Counts come from `library_vote`.
- The "Top" sort (`/library?sort=top`, round 6): items by upvotes alone (featured items don't lead), and the month's
  top 5 sharers above them. `/library/leaderboard` redirects there (`next.config.mjs`). `readLeaderboard` still counts
  people and companies, "This month" (votes since the 1st, UTC) or "All time", in SQL and only over items the viewer
  may see; companies group by the author's company on show, without case.
- Browse (round 6): a search with Kind and Role (the address keeps `?job=`) behind "Filter"; All / Top / Yours chips.
  Cards show the kind (not the role) and the author's name (not the company).
- Admins feature (featured items lead the browse order) and remove; both go in the audit log. Authors remove their own
  (not audited). A removal deletes the item's feed post too (the route passes `deleteLibraryFeedPost` from
  `src/shell/library-publish.ts`; the report queue deletes it in `admin/service-reports.ts`).
- Report sends the item to the admin's report queue (`content_report.target_type = library_item`).

## Around the app
- A new whole-portfolio item makes a plain feed post from its author while the feed is on
  (`src/shell/library-publish.ts`); fund-team and company items never do.
- Today shows "New in the library": up to three items from the last 14 days the member may see, not their own.
- "Ask the community" on an empty result opens the asks board with a drafted ask (while Asks is on).
- The menu lists Library after Perks; no phone tab (like Jobs and Perks).
- Removing a member without keeping content deletes their items, votes and reviews (audited); with content kept, their
  items stay. Deleting an account removes everything through the user row's cascade.
- Demo: `src/shell/demo-library.ts` seeds ten made-up items by the demo people (one featured, one fund-team only, one
  for Paperplane and Ledgerline) with old and new votes and reviews.

## Not built
AI answering from the library, usage tracking beyond upvotes and downloads, paid items, "new item in your job" alerts
(can use the notifications part's `notify()` later). The author's "warm path" is reached through their profile.
