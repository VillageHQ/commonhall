---
id: mentors-calls
status: in-review
waits-on: []
size: half a day
touches: ["src/modules/members/", "src/modules/admin/", "src/shell/", "drizzle/"]
---
# Spec: mentors and experts, and "Book a call"

**Approved:** 18 Nov 2026 by the owner (decision page "Commonhall: live tour + 4 new features"). Charter: ./CHARTER.md

## Problem
A fund's community is more than its founders: mentors, experts, advisors and entrepreneurs in residence (founders the
fund hosts while they start their next company) are the people founders most want to talk to. Commonhall has only
"admin" and "member", and no way to book time with anyone.

## Core user journey
1. An admin gives a member a community role: Founder (default), Mentor, Expert, Advisor, Entrepreneur in residence, or
   Fund team (in the members list, and as an optional column in the CSV import).
2. Any member adds a booking link to their profile (Calendly, Cal.com, a Google appointment page, any https link) and
   chooses who sees it: everyone in the community, or only people whose intro they accepted.
3. A founder opens the directory's "Experts and mentors" view: people with those roles, their role and what they can help
   with, and "Book a call" where the link is visible to them.
4. "Book a call" opens the person's booking page in a new tab, and Commonhall records a call request (who, whom, when).
5. The admin sees calls requested: a count on the console home, and per person and per week (with a CSV). **Goal.**

## Scope
In: role field + admin edit + import column, booking link + visibility, directory view and filter, Book a call button
on profiles and directory cards, call-request records, admin counts. Out: confirmed bookings from Calendly/Cal.com
(owner chose click counts), Commonhall's own calendar.

## Acceptance criteria
1. Only https links are accepted; anything else is refused with a plain message.
2. A link set to "only people whose intro I accepted" is never shown (or sent in any API answer) to other members.
3. "Book a call" records exactly one call request per click and then opens the link; it never shows on your own profile.
4. The directory view lists only members with a non-founder, non-team role ("Mentor", "Expert", "Advisor",
   "Entrepreneur in residence"), filterable by role, and respects "hide me".
5. The admin counts match the call-request rows; admins see who booked whom (the owner's rule: admins see who asked whom).
6. The role change is written to the audit log; only admins can change roles.
7. Unwanted path: removing a member removes their booking link from every view, and their past call requests stay counted
   without their name if they deleted their data (follow `your-data`).

## Verification contract
Unit and integration tests for visibility and recording; a separate agent uses a test copy with made-up members:
sets roles, adds links, books from the directory, checks the admin counts and the hidden-link case.

## Names other parts use
- The role field: `member_profile.community_role`, values `founder` (default), `mentor`, `expert`, `advisor`,
  `entrepreneur_in_residence`, `fund_team`; labels and helpers in `src/modules/members/contract-community-roles.ts`
  (`COMMUNITY_ROLES`, `COMMUNITY_ROLE_LABELS`, `EXPERT_ROLES`).
- The directory view: `/directory?view=experts` (role filter `&role=mentor` etc.); the button carries
  `data-testid="book-call"`, an expert card `data-testid="expert-card"`; demo people with roles and links are in
  `src/platform/demo/people.ts` (`DEMO_COMMUNITY_ROLES`).

## Depends on / check-ins
- announcements · needs: this part's role field name and values · owner: mentors-calls · check in: keep the names in this
  spec; tell the orchestrator if they change.
- tour-new-steps · needs: the directory view and the Book a call button render with made-up data · owner: tour-new-steps.

## Open questions
None.
