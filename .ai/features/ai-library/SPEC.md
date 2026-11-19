---
id: ai-library
status: in-review
waits-on: []
size: half a day
touches: ["src/modules/library/", "src/shell/", "src/app/", "drizzle/"]
---
# Spec: Portfolio AI library

**Approved:** 19 Nov 2026 by the owner (decision page "Commonhall: AI library, phone app, voice rooms"). Leaderboard by
upvotes (the owner's answer).

## Problem
Portfolio founders each rebuild the same AI skills, agents, prompts and tool connections. Funds spread AI know-how at
one-off events and none of it lands somewhere searchable. Tools share inside one company or with everyone; nothing shares
across a portfolio (companies that partly trust each other). Public skill hubs are often unsafe.

## Core user journey
1. A founder opens Library from the menu and browses by kind and job, or searches.
2. They open an item: what it does, who made it (face, company, warm path), files to download or a link, how to install,
   upvotes, reviews.
3. They upvote it and write a short review ("worked for us": one line).
4. A member publishes their own item in one form: title, one-line pitch, kind, job, description, files (zip, .md, .json)
   or a link, install steps, who can see it.
5. The leaderboard shows the top contributors and companies by upvotes received, this month and all time. **Goal.**

## Categories
- **Kind:** Skill, Agent, Prompt, Tool connection (MCP setup), Automation, Playbook.
- **Job:** Sales, Marketing, Engineering, Product, Hiring, Finance and legal, Support and ops, Fundraising, Founder's own work.

## Scope
In: a new switchable module `library` (off/on like other modules, on by default), items with versions (a new upload is a new
version), visibility (whole portfolio by default; fund team only; chosen companies), file upload with a secret scan,
upvotes (one per member per item, can be undone), reviews, featured items (admin), remove/report (existing report queue),
leaderboard (people and companies; this month and all time), a feed post when an item is published, a Today card
"New in the library", demo data with made-up items. Out: AI answering from the library, usage tracking beyond upvotes and
downloads, paid items.

## Acceptance criteria
1. Browsing filters by kind and job and searches title and pitch; an empty result offers "Ask the community".
2. A published item is visible only to the audience it names; an API call from a member outside it gets 404.
3. An upload containing a likely secret (API key patterns, private keys, `.env` lines with a value) is refused with a plain
   message naming the file and line; nothing is stored.
4. Upvoting twice does not add twice; undoing removes the vote; your own item cannot be upvoted by you.
5. The leaderboard counts upvotes received on items, by person and by company, for this month and all time, and matches
   the votes in the database; removed items do not count.
6. Files over 10 MB are refused; allowed types only (zip, md, txt, json, yaml, py, js, ts).
7. Admins can feature and remove items; removal is in the audit log.
8. Unwanted path: a member who leaves the community keeps no visible items unless the admin keeps them (follow `your-data`).

## Verification contract
Unit tests for the secret scan and leaderboard counting; integration tests for visibility and votes; a separate agent uses a
test copy in demo mode with made-up members: browses, publishes, tries a secret, upvotes, checks the board, at 390 and
1280 px.

## Depends on / check-ins
- notifications · needs: nothing now; "new item in your job" alerts can use notify() later · owner: notifications.
- landing (later) · needs: Library screens that render with made-up data for the tour · owner: the landing part.

## Open questions
None.
