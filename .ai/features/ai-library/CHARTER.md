# Charter: Commonhall round 5 — AI library, alerts and phone app, voice rooms

Approved by the owner on 19 Nov 2026 (decision page "Commonhall: AI library, phone app, voice rooms" and the chat message
before it). Built as a graph of bounded parts (graph-orchestrator), each part through autobuild.

## The owner's words, condensed
- AI library: share AI skills, agents, prompts and tool connections across the portfolio; categorize it; everyone
  contributes; a leaderboard.
- A mobile app for the whole portal with push alerts and full Clubhouse-like features: "preferable full app"; the browser
  app should also install and receive alerts.
- Voice sessions: open source, on the same host as the app and backend, almost an exact replica of Clubhouse / X Spaces; a
  member taps a button to broadcast that they are available; members set when not to get broadcasts.

## The owner's answers
- Leaderboard: by upvotes.
- Voice rooms are never recorded.
- Phone: a full store app; the browser app installs and gets alerts too.

## Qareen's small calls (on the page)
- Library categories: kind (Skill, Agent, Prompt, Tool connection, Automation, Playbook) × job (Sales, Marketing,
  Engineering, Product, Hiring, Finance and legal, Support and ops, Fundraising, Founder's own work).
- Uploads are checked for secrets; items are visible to the whole portfolio by default; the author can narrow it.
- At most 3 "I'm available" broadcasts per member per day; quiet hours, days, per-person mutes, all-off.
- The store app is Expo (buildable from Windows); nothing is uploaded to a store until the owner picks the account.
- Each fund's own server sends its alerts.

## Parts
ai-library · notifications · voice-sessions (rooms first, broadcast after notifications merges) · then mobile-app ·
then the landing page and tour. Specs on main are the truth (PR #90).
