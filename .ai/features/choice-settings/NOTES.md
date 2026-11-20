# Notes: member settings in one place (round 7, less-choice Part 3)

How it works today. Charter: [CHARTER.md](CHARTER.md). Spec: [less-choice SPEC](../less-choice/SPEC.md) Part 3.

## The Settings list
- One list, `src/shell/settings-links.ts` (`readSettingsLinks(enabledIds)`): My card, Privacy, Alerts, Email, Booking
  link, Your network (while Network is on), Our jobs (while the job board is on), Your data, Password.
- The avatar menu shows it as its "Settings" group (`buildShellNavigation` → `navigation.settings`, icons in
  `shell/navigation.ts`); My profile (`/me`) shows it at the foot, each row with where it stands. Add a settings page
  there and both places get it. On `/me` the "My card" row opens the card's editor (`EDIT_CARD_HREF`).
- "Our jobs", not "Jobs": the menu's More already holds the job board as "Jobs".

## Intro asks: switched on Privacy only
- `acceptsIntroAsks` is switched on `/me/privacy` only (and asked once in the welcome steps). My network keeps its own
  consent, sharing the network ("Share whom I know with …"), not merged (a consent; the owner's call) and points to
  Privacy. Your data's consent record names it, linking to Privacy. Alerts and Email only hold alert/email kinds.

## "Nobody" (hidden from People)
- Says "Members won’t find you in People or be pointed to you on asks." A hidden member leaves People, their profile
  page and the asks' word matching (`readWordHelpers` filters with `isListedMember`). Intro asks through a shared
  network path are unchanged.

## Who can message me
- Two choices, Anyone or Only people I've been introduced to. A member who never chose sees the community's default
  picked and keeps following it until they pick the other one (only a change is saved).

## My card
- `OwnWordsSheet`: "Edit card" opens every field as one form with one Save; only changed fields are sent to
  `POST /api/profile`. `?edit=<field>` (a Correct link) opens it focused on that field; `?edit=card` on the first.
  A field filled in from public profiles shows that value as the empty input's placeholder.

## Let through, off for new members
- `DEFAULT_PREFERENCES.letDirectThrough` and the column default are false: a new member's quiet times hold back
  messages and intro asks too until they switch Let through on.
- Migration `0048_alerts_quiet_for_new_members` wrote Let through on for every member who existed then and had no
  saved row, with `is_saved_by_member = false`: `readPreferenceSaved` and `pauseAlerts` still treat their time zone as
  the browser's until they save or pause. Saving or pausing sets it true.
- Test: `src/platform/notifications/quiet-times-migration.test.ts` (the second describe).

## Not here
- The Alerts page itself (room-start-instant owns it, including its log link and the Room alerts switch).
- One Notifications page for Alerts and Email (roadmap line).
