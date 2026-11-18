---
id: find-candidates
status: specced
waits-on: []
size: half a day
touches: ["src/modules/job-board/", "src/modules/network/", "src/modules/asks/", "src/shell/"]
---
# Spec: find candidates for a portfolio job

**Approved:** 18 Nov 2026 by the owner (decision page "Commonhall: live tour + 4 new features"). Charter: ./CHARTER.md

## Problem
Portfolio founders hire all the time. Commonhall already reads their job boards (12 hiring tools, hourly), but nothing
helps a founder find a candidate through the fund's community and its network.

## Core user journey
1. A founder (a member at the company that posted the job) or an admin opens a job on the job board and taps "Find
   candidates".
2. Commonhall searches the network for the role (the job's title, and its location when it has one), with faces and intro
   paths, the same results screen as network search.
3. The founder asks a connector for an intro to a candidate, or posts a hiring request to the community, filled in with
   the job's title and link. **Goal.**

## Scope
In: the button and who sees it, the search built from the job, results with intro paths, the prefilled hiring request.
Out: ranking candidates by skills, outreach sequences, an applicant tracker.

## Acceptance criteria
1. "Find candidates" shows only to members linked to the job's company and to admins.
2. The search uses the job's title (and location) and shows the normal results with faces and intro paths.
3. Without the member's own Village connection it says how to connect (as network search does) and still offers the
   hiring request.
4. The hiring request opens prefilled (category "hire", the job's title and link) and posts only after the member sends it.
5. Unwanted path: a job with an empty or odd title (only symbols) never sends an empty search; it asks the founder to
   type the role.

## Verification contract
Tests on the query builder and the access rule; a separate agent uses a test copy in demo mode (canned Village answers,
made-up people) and walks the journey with screenshots.

## Depends on / check-ins
- tour-new-steps · needs: the results screen fed by made-up data · owner: tour-new-steps.

## Open questions
None.
