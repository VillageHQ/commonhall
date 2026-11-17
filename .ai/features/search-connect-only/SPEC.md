---
id: search-connect-only
status: building
---
# Network search needs your own connected Village

Supersedes [search-first](../search-first/SPEC.md): live Village refuses a user who never synced, so the app's shared
search identity could not search for members who hadn't connected (real-service test, 2026-11-16).

- **Before a member connects:** Search finds member profiles only ("N people in member profiles") and shows a prompt:
  "Connect your network to search who members know", with a link to My network. No "In our network | Everywhere"
  switch and no "Paths come from…" line. Village is never called for them and no lookup is counted. Paths and the
  guided ask's "best way in" ask them to connect; an ask from paths they already looked up still works.
- **After connecting:** searches and paths run as the member, their own contacts included, as before.
- **Everywhere:** the paths for a page of results come in one bulk call. Village takes only bare slugs there
  (`^[a-z0-9-]{3,100}$`), so people whose LinkedIn name doesn't fit (accents, very short) are left out of that call and
  can be looked up alone. If Village fails the page's paths anyway, each person says "Couldn’t load intro paths to …
  right now. Search again in a minute." and the page isn't cached.
- **The sharing count:** "Paths come from N members who share their network so far" counts the viewer when they share.
- **Unchanged:** no path ever names a member who hasn't agreed to share; the service email stays for the profile
  fill-in and the Village check.
