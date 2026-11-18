---
id: announcements
status: specced
waits-on: []
size: half a day
touches: ["src/modules/admin/", "src/modules/feed/", "src/platform/email/", "src/shell/", "drizzle/"]
---
# Spec: announcements from the fund's team

**Approved:** 18 Nov 2026 by the owner (decision page "Commonhall: live tour + 4 new features"). Charter: ./CHARTER.md

## Problem
The fund's team has no way to tell the whole community something (a new event, a perk, a demo day) from Commonhall. Today
they copy emails into a mail-merge tool outside the app.

## Core user journey
1. An admin opens Announcements in the admin console and writes a subject and a message, with fill-in fields
   (`{first name}`, `{full name}`, `{company}`, `{community}`).
2. They pick who gets it: everyone, founders, mentors and experts (by community role), or one cohort.
3. They preview it as one chosen member (fields filled), and send a test to themselves.
4. They send it: one email per member through the outbox, and one pinned post in the feed from the team.
5. The announcements list shows each one with its audience, when it went out, and how many emails were sent. **Goal.**

## Scope
In: compose, audience, preview, test, send by email + feed post, history. Out: scheduling for later, open/click tracking,
Slack/Discord posting (later).

## Acceptance criteria
1. Fill-in fields are replaced per member; an unknown or empty field never shows a raw `{...}` (it falls back to a
   sensible word, e.g. "there" for a missing first name).
2. Only members who have not unsubscribed from announcements get the email; each email has a one-click unsubscribe for
   announcements (a new email kind), and the count shown says how many were queued.
3. Every email goes through the outbox in the send's transaction, and is sent once (a repeated click never sends twice).
4. Only admins can open the page or send; a member gets 404/403.
5. The feed shows the announcement as a pinned post from the team.
6. Unwanted path: an audience with nobody in it cannot be sent; the page says why.
7. The admin action is written to the audit log.

## Verification contract
Integration tests on the outbox and the fill-in function; a separate agent sends a real announcement in a test copy to
made-up members (example.com, the fake mail server) and reads every email and the feed.

## Depends on / check-ins
- mentors-calls · needs: the member's community role (column and its values) for the "mentors and experts" audience ·
  owner: mentors-calls · check in: build everyone + cohort first; add the role audience after mentors-calls merges (read
  its spec on main for the field name).
- landing-tour / tour-new-steps · needs: a screen that renders with made-up data for the tour · owner: tour-new-steps.

## Open questions
None.
