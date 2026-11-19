---
id: voice-sessions
status: built
waits-on: []
size: one day
touches: ["src/modules/voice/", "src/app/", "docker-compose.yml", "deploy/", "install.sh", "drizzle/"]
---
# Spec: Voice rooms, like Clubhouse and X Spaces

**Approved:** 19 Nov 2026 by the owner (decision page "Commonhall: AI library, phone app, voice rooms"): almost an exact
replica of Clubhouse / X Spaces, open source, on the same host as the app; a member broadcasts that they are available;
members set when not to get broadcasts; rooms are **never recorded**.

## Core user journey
1. A member opens Rooms: live rooms now (title, host faces, listener count) and scheduled rooms (time, host, "Remind me").
2. They join a live room as a listener: the stage (host and speakers with talking rings), the audience grid, mute state.
3. They raise a hand; the host invites them up; they speak; the host can move people back to the audience, make another
   speaker a co-host, or end the room. Listeners can leave quietly.
4. A member starts a room now or schedules one (title, time, open to the whole community or invite only).
5. Anywhere in the app (the Rooms page and chat), a member taps **"I'm available to talk"**: a room opens with them as host
   and everyone gets an alert ("Maya is available to talk — join"), except members in quiet hours or who muted Maya. At most
   3 broadcasts per member per day. **Goal.**

## Scope
In: a switchable module `voice`; LiveKit server (Apache 2.0) added to docker-compose and the VPS installer on the same host,
with its keys in settings (LiveKit Cloud keys accepted as an option); server-side tokens with roles (host, co-host, speaker,
listener); rooms, schedules, reminders through `notify()` (part notifications); the broadcast button and its limit; the web
UI in the Commonhall look on phone and computer; reactions (a few emoji) and a room chat. Out: recording (never), AI
summaries, video.

## Acceptance criteria
1. Two browsers (host + listener) hear each other once the listener is invited to speak; a listener cannot publish audio.
2. Raise hand, invite up, move down, make co-host, end room all work and show live to everyone in the room.
3. The broadcast reaches every member's devices except those in quiet hours or who muted the sender (via notify());
   a 4th broadcast in a day is refused with a plain message.
4. Room tokens are short-lived and only issued to signed-in members of the community; an invite-only room refuses others.
5. No recording or egress is possible from the app (no recording control, no egress API configured).
6. The installer sets up LiveKit with its ports and keys; the README says which ports a fund must open.
7. Unwanted path: when the host leaves, a co-host takes over, or the room ends after 2 minutes with nobody on stage.

## Verification contract
Integration tests for tokens and roles; a separate agent runs two headless browsers with fake audio devices against a test
copy with a local LiveKit, checks every control, the broadcast through a fake push endpoint, and the 4th-broadcast limit.

## Depends on / check-ins
- notifications · needs: `notify()` with kinds `voice_room`, `voice_broadcast`, quiet hours, mutes · owner: notifications ·
  check in: build rooms first; add broadcast and reminders after notifications merges (merge origin/main then).
- mobile-app · needs: room join flow and token API usable from the store app · owner: voice-sessions · check in: document
  the token API in NOTES.md.

## Open questions
None.
