---
id: landing-tour
status: in-review
waits-on: []
size: half a day
touches: ["site/", "scripts/", "deploy/cloudflare/"]
---
# Spec: the landing page's live product tour and grouped features

**Approved:** 18 Nov 2026 by the owner (decision page "Commonhall: live tour + 4 new features"). Charter: ./CHARTER.md

## Problem
The demo section on commonhall.ai shows 5 screenshots taken on 14 Nov, before the app moved to the Commonhall look on
17 Nov (app-kit). It does not walk a visitor through the journeys that sell the product, and when the scroll pins it, it
sits at the top of the window instead of the middle. The feature boxes carry "Built / Partly / Coming" tags the owner
does not want.

## Proposed experience
1. **A live tour replaces the screenshots.** It is made of the app's own React screens and CSS (the real design system,
   `src/app/globals.css` + `src/app/parts.css`), fed with made-up people from the demo data (`src/platform/demo/people.ts`,
   portraits in `public/demo/faces`), bundled into a static script under `site/` by one repo command. Like village.ai's
   landing demo (a scripted, auto-playing copy of the app): it plays by itself, has a Pause / Play button, clickable
   steps that jump to that step, a fake pointer that types and clicks, and on a roomy desktop window the scroll drives the
   steps (pinned stage). Phones and short windows play on a timer; reduced motion shows each step still, advanced by a tap.
2. **Centred.** When pinned, the stage sits in the vertical middle of the window (not `top: 24px`).
3. **Steps (this part):** search the network (type a need, see faces and intro paths) → ask one person for an intro, or
   post the need as a request to the whole community → browse the directory → the admin home with intros counted. The
   steps for the new features (book a call, find candidates, announcement, calls counted) are added by the follow-up part
   `tour-new-steps` once those features are on main.
4. **Feature boxes in 4 groups, no status tags** (owner: list everything, planned features too, no labels):
   - Meet and connect: network search, intros, members directory, messages, mentors and experts, book a call.
   - Raise: investor intros through community requests and people who can introduce you.
   - Grow: customer intros, job board, find candidates in the portfolio, perks.
   - Hear from the fund: announcements, feed, Slack, Discord, WhatsApp and Telegram posts, admin reports.
   The competitor comparison table keeps its honest ticks.
5. **Round 5 (19 Nov 2026, charter: ./CHARTER-round5.md).** Three more steps from the real screens, after Find
   candidates: the AI library and its leaderboard, a live voice room on stage, and Settings › Alerts with quiet hours
   (11 steps). The groups gain Voice rooms and "I'm available to talk" (Meet and connect), Phone alerts and The phone app
   (Hear from the fund: installable now, the store app follows), and a fifth group, AI across the portfolio (the
   library, upvotes and the leaderboard, kind and job, the secret check). Still no status tags.

## Scope
In: the tour (existing journeys), centring, grouped boxes, deploy notes for the tour build. Out: new app features; the
tour steps for them (part `tour-new-steps`).

## Acceptance criteria
1. The tour shows the app's current look (Newsreader titles, IBM Plex Sans, paper and ink), not a screenshot: its text is
   real DOM, and a change to the app's components shows after the one rebuild command.
2. It auto-plays when in view, pauses with the button, and a step click jumps to that step and stops auto-advance.
3. On a 1280 x 800 window, the pinned stage's vertical centre is within 40 px of the window's centre.
4. At 390 px it plays on a timer, nothing overflows sideways, and every step is readable.
5. With reduced motion nothing animates; steps change on a tap.
6. The page still loads nothing from another site and logs no console error (the CSP stays `'self'`).
7. The groups (5 since round 5) show every feature listed above; no "Built", "Partly" or "Coming" tag remains in the
   feature boxes.
8. Unwanted path: with JavaScript off, the section still shows a readable still of the first step.

## Verification contract
Real Chromium on the deployed preview (or local `site/` server) at 390 and 1280 px, both themes: screenshots of each
step, the centring measure, console and network logs, the reduced-motion and no-JS runs.

## Depends on / check-ins
- tour-new-steps · needs: this part's tour framework (how a step is declared) · owner: landing-tour · check in: write how
  to add a step in this feature's NOTES.md before merging.
- announcements, mentors-calls, find-candidates · needs: nothing now; their screens join the tour later · owner: each part.
- ai-library, voice-sessions, notifications · their screens joined the tour in round 5 (part landing-round5); a change to
  `LibraryBrowse`, `LibraryLeaderboard`, `RoomsBoard`, `LiveRoom` or the alerts components needs `pnpm tour:build`.

## Open questions
None.
