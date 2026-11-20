# Charter: choice-settings (round 7, Part 3 of less-choice)

**Approved by:** the owner's round-7 spec on main, `.ai/features/less-choice/SPEC.md` (spec commit 89980e40), with the
council decisions of 20 Nov 2026 (Rams, Torvalds, Watts, 3 of 3). This build is Part 3 of that spec, one part of an
orchestrated round; the orchestrator owns the other parts. Evidence: `less-choice/AUDIT.md`, `less-choice/study/p06-settings.md`.

## Direction
Member settings in one place. Simplicity first: when in doubt, cut.

## In
- **One Settings list,** the same in the avatar menu and at the foot of My profile: My card, Privacy, Alerts, Email,
  Booking link, Your network, Our jobs, Your data, Password (Your network and Our jobs while their feature is on).
- **"Members can ask me for intros" is switched in one place,** Privacy. Pages that repeat it link there. My network
  keeps its own consent (sharing the network), in words that no longer repeat Privacy's sentence; not merged.
- **"Who can see my profile: Nobody"** says in one line what it does: "Members won't find you in People or be pointed
  to you on asks." Hidden members leave the asks' word matching (`readWordHelpers`); intro asks through an existing
  path are unchanged.
- **Quiet means quiet for new members:** "Let through messages and intro asks" starts off for members who join after
  the change. A migration first writes Let through on for every existing member with no saved row, marked as not
  chosen by them (so their alert time zone still comes from the browser until they save), then the default flips.
- **My card:** one "Edit card" opens every field with one Save; a Correct link opens it at that field.
- **"Who can message me":** two choices, "Anyone in <community>" and "Only people I've been introduced to".

## Out
- Anything on the Alerts page (`me/alerts/page.tsx`, `alert-settings-form.tsx`, its log link): room-start-instant
  owns it and adds the Room alerts switch there. Part 3's Let-through change is a server default only.
- The tab bar, `loading.tsx` files (smooth-app); asks composer and intros (Part 1); Today and People (Part 2).
- NOT in this round (council): merging My network's consent with Privacy's intro switch; invite-link changes.
- One Notifications page for Alerts and Email (a roadmap line).

## Small calls (mine, reversible)
- "Jobs" is listed as **Our jobs**: the avatar menu's More already has "Jobs" (the board), and two "Jobs" in one menu
  would read as one.
- "Who can message me" shows the two choices whatever the community's default is (the spec drops the third when it
  equals Anyone; when the default is "introduced" the third would equally repeat a choice). A member who never chose
  keeps following the community's default until they pick the other one.
- On My profile, the list's "My card" row opens the card's editor in place.

## Checks (driven at 390 px and 1280 px by a separate verifier, on a throwaway copy)
1. Both entry points list the same 9 items.
2. The intro switch exists once across the rendered settings pages.
3. Editing 3 card fields takes 5 taps (before: 9).
4. A member who joins after the change has Let through off; an existing member who never saved keeps it on.
5. A "Nobody" member is not a word-matched helper on an ask.
6. Tests in `src/platform/notifications/`, `src/modules/members/` and `src/modules/asks/` green.
