# Part 8: the round's fix pass

Read [../SPEC.md](../SPEC.md) first. Runs after parts 1–7 merged (PRs #122–#129). About 3 hours. No new features: each
line below fixes what a part's verifier, or the owner's round walk, found. The approval is the round's: the owner's
goal for round 8 ([../CHARTER.md](../CHARTER.md)), and this fix list, written by the round's orchestrator from the
verifiers' reports on 23 Nov 2026.

## The fixes (grouped by cause)
1. **Sizes and sheets.** The intro-ask card on Today and the profile fill-in card ("Fill in your card from public
   profiles?") use 36 px buttons, as every action inside a card does. A sheet opened over another sheet (the composer's
   "Discard this ask?") dims the sheet under it. The root `CLAUDE.md` map names `ui-polish/NOTES.md` once.
2. **The store app's tabs** (store build 6): the other tabs load in the background once the first is idle, except on
   Android phones with under 3 GB of memory; the slide starts at 30% opacity instead of 0; a tab's first load shows a
   placeholder of the community's bar instead of bare paper; an alert for a tab that is alive moves inside it, without
   reloading it.
3. **The web frame:** the sidebar's foot rests on the window's bottom after the demo band scrolls away (1280 px); the back
   button comes first in the keyboard order on a pushed screen; the Rooms, Today and Asks outlines land where the page
   does.
4. **Today:** the intro row for a member's yes lines up with the other waiting rows (inside `.td-rows`). In the store
   app's demo, a thread's header sits right under the demo band (the rule Part 6 added for the room's header).
5. **The profile's More sheet:** the "Their rooms won't alert you." line shows above the dimmed backdrop; the switch's
   off colour is a token. `/admin/settings` renders without a hydration warning.
6. **Rooms:** the dead `.vr-bar` rule leaves `globals.css`. A listener's room has no More button (it held only "Never
   recorded."); that line moves under the room's title, for everyone, on the web and in the store app.
7. **Proof size:** the round's report folders total under 10 MB (pictures shrunk; one before and one after per screen
   kept where a folder held more).

## Checks
A separate verifier, at 390 and 1280 px and in the store app's web preview, on a throwaway copy with the demo's made-up
people: every line above, measured; `pnpm lint && pnpm typecheck && pnpm test`; `mobile/`: `npm run typecheck`,
`npm test`; `pnpm tour:build` last.
