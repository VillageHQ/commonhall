# Journey: a member talks live in a voice room

Who: any member, and the member hosting the room. Needs Rooms on (Set up › Features) and LiveKit set up (the
installer does it; or LiveKit Cloud keys in Set up › Rooms). How it works: `.ai/features/voice-sessions/NOTES.md`.

1. The member opens Rooms (`/rooms`): live rooms now (title, the faces on stage, how many are in) and rooms coming up
   (time, host, "Remind me").
2. They tap a live room and join as a listener: the stage (host, co-hosts, speakers, with talking rings and muted
   marks) and the audience below. Nothing is recorded.
3. They raise a hand; the host sees it under "Raised hands" and taps "Invite to speak". The member is on stage,
   muted, and unmutes to talk. The host can move people back to the audience, make a speaker a co-host, or end the
   room. Reactions and the room chat reach everyone, and are never saved. "Leave quietly" leaves.
4. A member starts a room now or schedules one: a title, Now or Later, everyone or invite only (with people picked by
   name).
5. "I'm available to talk" opens a room with them as host and (once notifications lands) alerts the community, at
   most 3 times a day.
6. If the host leaves, a co-host takes over; a room with nobody on stage ends after 2 minutes.

Tests: `src/modules/voice/voice.test.ts`; the two-browser check with fake microphones in
`.ai/features/voice-sessions/NOTES.md` (Tests).
