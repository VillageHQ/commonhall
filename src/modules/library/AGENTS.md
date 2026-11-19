# Library

Members share AI skills, agents, prompts, tool connections, automations and playbooks across the portfolio, upvote what
worked and write one-line reviews; a leaderboard ranks people and companies by upvotes received. Toggleable, on where no
admin chose, no Village needed. How it works today: `.ai/features/ai-library/NOTES.md`.

- `manifest.ts`: identity, the nav entry, owned paths (`/library`, `/api/library`). `integration.ts`: the removal hook.
- `contract.ts`: kinds, jobs, visibilities, limits (10 MB), allowed file types, paths, Zod schemas. Client-safe.
- `schema.ts`: `library_item`, `library_item_company`, `library_version`, `library_file` (bytes in Postgres), `library_vote`, `library_review`.
- `rules-secrets.ts`: the secret scan (plain patterns). `rules-zip.ts`: reads a zip's files for it. `rules-uploads.ts`: type, size and scan checks, in that order.
- `reads.ts`: the visibility rule (`isItemVisibleTo`), browse, one item, files, the leaderboard (SQL), Today's new items.
- `service.ts`: publish and new versions, vote, review, feature, remove, a download's count, the removal hook. Admin's report queue calls `removeLibraryItemWithin`.
- `rules-page.ts`: the pages' address params. `components/`: the screens; `components/shared/`: the Today card.

Rules:

- Every read and action goes through `isItemVisibleTo`: the author and admins always; then the whole portfolio, the fund
  team (community role `fund_team`), or members whose company on show matches a chosen company (without case). Anyone
  else gets 404, from pages, routes and file downloads alike.
- An upload passes `checkUploads` before the transaction starts, so a refused upload stores nothing. Zips are read and
  scanned inside; a zip that can't be read (locked, odd packing, over 50 MB unpacked) is refused.
- Files are always served as downloads (`attachment`, `nosniff`, a sandbox policy), never inline.
- One upvote per member per item (the primary key); never on your own item. The leaderboard counts votes in SQL; a
  removed item's votes go with it.
- Removing a member without keeping content deletes their items, votes and reviews (audited). With content kept, their
  items stay, as the feed's posts do.
- This module can't import feed or asks: the feed post on publish is `src/shell/library-publish.ts`; "Ask the community"
  uses `toAskDraftHref` from the platform.
