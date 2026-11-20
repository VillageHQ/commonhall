# Charter: Start a room starts it now and tells everyone (round 7)

**Approved:** the owner's round-7 goal (20 Nov 2026, run on autopilot by the round's orchestrator), the spec
[SPEC.md](SPEC.md) on main, and its "Decisions" section (the council, 20 Nov 2026, 3 of 3). This page holds what
the build follows; the spec holds the detail.

## Direction (the owner's words)
"Start a room" starts right away and notifies everyone by default, with no options. People control what they
receive ("don't notify me"). Picking specific people is for later. Simplicity first: when in doubt, cut.

## In
- Rooms: one "Start a room" button (full width on a phone). One tap starts the room now, titled "<first name>'s
  room", and opens it (the native room screen in the store app). The council removed the title box.
- Inside the room, the host can rename it (the council: "the host can rename it inside the room"). Nothing like
  this exists yet, so the build adds one small Rename control for the host.
- A quiet "Schedule for later" link: a title and a time; "Start now" alerts everyone the same way. Remind me stays.
- Starting alerts every active member except the host, people in the room and people who tapped Remind me (they
  get "Starting now" only); notify() drops room alerts off, quiet times, pause, a mute of the host, blocks, no device.
- Receipts (one alert per room, 5 a day) are claimed only for members the alert will really reach.
- The host's first 3 starts in 24 hours alert; a 4th starts quietly, and the room page says once: "People weren't
  alerted this time: 3 rooms a day alert everyone."
- One "Room alerts" switch on Alerts (both room kinds together) and the same switch on Rooms, with a "Quiet times"
  link; Alerts links its log where the log exists (demo mode and development).
- A profile shows "Don't notify me about <first name>'s rooms" (the existing mute) where Follow was.
- Removed: the composer's options and pickers, Tell people (web and store app), Follow, invite-list controls, and
  their routes. Installed app builds get `hasNotified: true` so they hide Tell people.
- Rooms made before the change keep their host's choice (a saved audience, invite-only narrowing).
- Notes, the voice AGENTS.md rule, the landing page tour step, the demo seed (no follows).

## Out (not in this round)
- Deleting the old notify-choice, saved-audience or follow data (owner decision needed: it deletes data). The
  code stops using them where it can and the data stays; no migration.
- Picking people, cohorts or admins-only audiences.
- Renaming from the store app's native room screen (the web room page has it; a question for the owner).

## Deciding facts
1. No schema change is needed: new scheduled rooms save the audience "everyone" in the existing column, which
   tells them apart from older rooms saved with "nobody" (null) until that column is dropped.
2. The single switch maps to the two existing kinds (`voice_room`, `voice_broadcast`); no preference migration.
3. The quiet-start line is passed to the room page once, in its address (`?quiet=1`), not stored.

## Journeys and tests
- Start a room (founder), receive a room alert (member), control what reaches you (member).
- `voice.test.ts` updated as the spec lists; the whole check `pnpm lint && pnpm typecheck && pnpm test && pnpm build`;
  the store app's `npm test`, `npm run typecheck`, `npx expo-doctor`.
- A separate verifier drives the spec's 9 acceptance checks at 390 px and 1280 px and in the store app's web preview.

## Estimate
Build 3–4 hours; tests and the driven check 1–2 hours.
