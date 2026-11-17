# Verify: search-connect-only (2026-11-17)

**Verdict: FAIL.** All three claims hold in the running app. One new problem comes with the change: the guided ask (/ask) tells a member who hasn't connected that nobody has a path. No network search was run for them, and the page doesn't ask them to connect.

Setup: production build on http://localhost:3611, DEMO_MODE, Northwind Founders. I signed in with the demo buttons (Sam = member, Maya = admin) and changed the database `community_verify` with SQL. Every screen was checked at 390 px and 1280 px wide. Screenshots are in this folder.

## 1. Members without their own Village: PASS

What I did: set Sam's `sharing_consented_at`, `group_joined_at` and `village_linked_at` to NULL, then signed in as Sam.

- /search shows a note: "Connect your network to search who members know. … Until then, this searches member profiles." It links to `/me/network`, and the link goes there. Back returns to /search. There is no "In our network | Everywhere" switch, no "Paths come from…" line and no error. (`1-sam-unconnected-390/1280`)
- `/search?q=hospital%20procurement&scope=global` shows the same note, no switch and no error. It ends on the empty-state card "Ask the community". (`1-sam-global-390/1280`)
- `/search?q=climate` lists "4 people in member profiles" (Ada, Amara, Diego, Julia) with profile links. (`1-sam-profiles-390/1280`)
- APIs, sent with a same-origin header:
  - `POST /api/network/search` returns 200 with `isProfilesOnly: true`.
  - `POST /api/network/paths` returns 409 `network_connect_needed` ("Connect your network to see who can introduce you…"), a friendly message.
  - `POST /api/network/status` returns `needs_consent` with `canSearch: false`.
- /ask (the guided ask) runs without an error and spends nothing, but its wording is wrong. See finding F1. (`1-sam-ask-*`, `1-sam-ask-step2-*`)
- Today has no search box in this build, only "Ask for an intro". (`1-sam-today-390/1280`)
- Spending: after every step above, `member_daily_usage`, `member_path_result` and `village_credit_call` were still empty. No Village lookup was counted.
- Restore: I set consent back and opened My network. The demo finished the sync, which set `group_joined_at` and `village_linked_at`. Search "hospital procurement" then showed the switch, "Paths come from 13 members…", Alex and Dana ("You already know…") and Rosa via Marcus with "Ask Marcus for an intro". (`1-sam-restored-390/1280`)

## 2. "Everywhere" keeps its intro paths: PASS

- As Sam (connected), I searched Everywhere for "hospital procurement" and "seed investors climate". The second shows Tom Becker via Ada (Knows) and Jonas Lind via Ada (Met), each with "Ask Ada for an intro". (`2-everywhere-a-*`, `2-everywhere-b-*`)
- Making the bulk paths read fail: the month had used 42 credits. A search is estimated at 11 credits and the bulk paths read at 3, so I set `instance_settings.monthly_credit_cap = 53` and searched for new words, "climate seed investors please" (Everywhere).
  - The search went through but the paths read was refused. Both people read "Couldn’t load intro paths to Tom right now. Search again in a minute." (and the same for Jonas). Neither said "Nobody … knows". (`2-paths-fail-390/1280`)
- Reloading the same search ran it again rather than serving the cache, as claimed. That search then hit the cap and showed the friendly cap message, not a raw error. (`2-repeat-at-cap-390`)
- I removed the cap row afterwards (back to the default).

## 3. The sharing count counts the viewer: PASS

- SQL: 13 members have `group_joined_at` set, Maya included. As Maya, /search reads "Paths come from 13 members who share their network so far." (`3-maya-count13-390/1280`)
- With `group_joined_at` set to NULL for the other 12 members, it reads "Paths come from 1 member who shares their network so far." (`3-maya-only-390/1280`)
- Restored from a backup table, which I then dropped.

## Break attempts and findings

**F1 (FAIL, new with this change): the guided ask misleads members who haven't connected.**
Steps: make Sam unconnected (step 1), then /ask → "A customer" → "Head of procurement at a US hospital" → Find the best way in.
- It shows "Nobody in Northwind Founders knows them yet. No member who shares their network has a path to Head of procurement at a US hospital."
- In fact only member profiles were searched (`searchMemberNetwork` returns `isProfilesOnly`). `src/shell/guided-ask.tsx` (around lines 259–266) only special-cases `result === null`.
- There is no prompt to connect. Before this change the same member got a pooled network search here.
- Screenshot: `1-sam-ask-step2-390/1280`.

**F2 (pre-existing, not a regression): /search/ask returns a 500 page for a member with a pending Village email.**
Steps: set `pending_village_email` for Sam, then open `/search/ask?target=rosa-lindqvist-demo&via=906a1c3c-3109-480d-8986-4e57fef666be`.
- The result is HTTP 500, "This page didn’t load".
- `readAskableConnectors` throws `linkMismatchError`, and the page doesn't catch it. The old code threw the same way. (`B-sam-pending-searchask-390`)
- Without a pending email, an unconnected Sam is quietly sent back to /search, which is acceptable. (`B-sam-searchask-390`)

**F3 (minor, wording): the empty state on a profiles-only search overclaims.**
- An unconnected member who searches with no profile match reads "Nobody in Northwind Founders knows a former CFO yet". Only profiles were searched.
- The connect note directly above softens this. The same wording already existed for communities without Village. (`B-maya-unconnected-390/1280`, `1-sam-global-390`)

**F4 (pre-existing, outside the diff): the credit tiles on Admin › Village don't add up.**
- The tiles show Search 44 and Paths 0, but the month total is 53. The 9 credits spent on "Paths for a page of results" fall under no tile.

**Other checks that passed:**
- A member with a pending Village email gets the same connect note on /search, with no error. (`B-sam-pending-email-390`)
- A member who consented but hasn't synced gets the connect note. (`B-sam-consented-unsynced-390`)
- An admin who hasn't connected (Maya) gets the connect note, no switch and no count. (`B-maya-unconnected-*`)
- Changing the scope by hand in the URL does nothing for an unconnected member.
- The Admin › Village wording for "Service email" and "Only paths through members who agreed to share" was updated, with no leftover mention of the shared search identity. (`B-admin-village-*`)
- My network wording is fine. (`B-sam-mynetwork-*`)
- I could not reach the consent step in /welcome because Sam's onboarding is already done. I checked its wording in the diff only.
- Nothing overflowed at 390 px.

## Database

Restored to how I found it:
- Sam's and Maya's three timestamps are back to their seeded values, and Sam's pending email is cleared.
- The other members' `group_joined_at` is back.
- The cap row is removed.
- The rows I created in `member_path_result`, `village_credit_call`, `member_daily_usage` and `village_monthly_usage` are deleted. All four were empty at the start.

The app's in-memory 10-minute search cache may still hold my test searches until it expires.

## Re-check after repair (commit 94e81a5, fresh demo database)

**Verdict: PASS.** F1 and F3 are fixed, and connected members see the same results as before.

- **F1: PASS.** Steps: Sam unconnected (the three columns set to NULL), then /ask → A customer → "Head of procurement at a US hospital" → Find the best way in.
  - The page shows the heading "Connect your network to find the best way in". The "My network" link in the text goes to `/me/network`. The "Post it as an ask" card is there, and "Nobody … knows them yet" no longer appears.
  - No lookup was spent: `member_daily_usage` and `village_credit_call` stayed empty.
  - Screenshots: `2-f1-unconnected-ask-390/1280`.
  - Connected again, with new words ("procurement head at a US hospital"), Sam gets the normal result: "You already know Alex/Dana", then "Marcus can introduce you to Rosa Lindqvist" with "Write the note". Screenshots: `2-f1-connected-ask-390/1280`.
- **F3: PASS.**
  - Unconnected Sam searching "a former CFO" reads "No member profile matches “a former CFO”" under the connect note, with "Ask the community". Screenshots: `2-f3-unconnected-empty-390/1280`.
  - Connected Sam searching "underwater basket weaving champion" still reads "Nobody in Northwind Founders knows an underwater basket weaving champion yet", with "Ask the community" and "Search everywhere". Screenshots: `2-f3-connected-empty-390/1280`.
- **Small wording note, not blocking:** the guided ask's lede says "two ways on", but `NoPath` shows only one, "Post it as an ask". The old "Nobody…" lede had the same sentence; the repair repeats it.
- **Database:** Sam's three timestamps are back to their seeded values. The usage and path rows my connected searches created are deleted, so those tables are empty again as on the fresh database.
