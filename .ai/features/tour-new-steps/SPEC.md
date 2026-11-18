---
id: tour-new-steps
status: specced
waits-on: [landing-tour, announcements, mentors-calls, find-candidates]
size: 2 hours
touches: ["site/", "scripts/"]
---
# Spec: the tour's steps for the new features

**Approved:** 18 Nov 2026 by the owner (decision page "Commonhall: live tour + 4 new features").

## What & why
Once the tour (landing-tour) and the new features are on main, the tour gains their steps, made from their real screens
with made-up people: book a call with a mentor (directory's Experts and mentors view), find candidates for a job, the
team sends an announcement, and the admin home with intros and calls counted.

## Acceptance criteria
The same as landing-tour's for the new steps (real DOM, current look, centred, timer on phones, reduced motion, no
outside requests), and the step order follows the owner's journey: search → ask → directory → book a call → find
candidates → announcement → admin.

## Depends on / check-ins
- landing-tour · needs: how a step is declared (its NOTES.md) · owner: landing-tour · check in: before starting.
- announcements, mentors-calls, find-candidates · needs: their screens on main · owner: each part.
