---
id: less-choice
status: planned
waits-on: []
size: about a day (5 parts side by side, then the re-study)
touches: ["src/modules/asks/", "src/modules/intros/", "src/shell/", "src/app/(app)/me/", "src/components/alerts/install-card.tsx", "src/platform/notifications/contract.ts", "drizzle/", "src/app/setup/", "src/app/(app)/admin/", "src/modules/admin/", "src/modules/members/", "src/modules/library/", "src/modules/job-board/"]
---
# Spec: defaults instead of choices (round 7)

**Direction:** the owner, 20 Nov 2026: find the complexity and analysis paralysis left after round 6 and fix it;
simplicity first. The evidence: [AUDIT.md](AUDIT.md) (12 AI-played personas on the current build). Room starting
is its own spec ([room-start-instant](../room-start-instant/SPEC.md)); the app's smoothness too
([smooth-app](../smooth-app/SPEC.md)).

## Depends on / check-ins
- Runs beside room-start-instant and smooth-app. Fences:
  - room-start-instant owns the Alerts page (`me/alerts/page.tsx`, `alert-settings-form.tsx`, the log link) and
    the profile's Follow spot; Part 3 changes no file there (its Let-through change is a server default).
  - smooth-app owns the tab bar and the `loading.tsx` files; Part 2 doesn't touch them.
  - `src/shell/user-menu.tsx` is shared with smooth-app Part C, which adds one line (`<AppActionsGroup />`) while
    Part 3 rebuilds the settings list; whichever merges second rebases.
- Inside this spec: Part 2 owns `src/components/alerts/install-card.tsx`; Part 5 owns the job board (the hiring
  request included); Part 1 owns asks and intros. Each part rebases on main before its pull request.

## The rule every part follows
A choice stays only if a reasonable default would be wrong for many people. Otherwise: pick the default, say it in a
few words, and let people change it afterwards. A field that changes the result is never labelled optional. A control
that does nothing goes.

## Part 1: Asks and intros, decided in one tap
- **Ask matching reads the ask itself too:** helpers come from the ask's own words and the target's, together
  (`routeAskToHelpers` uses either one today). The target box stays folded, without "(optional)" in its name: "Name
  who you're trying to reach".
- **The composer starts as an ask.** No Ask/Update switch above the box; "Post a win instead" is a small link under
  Post. Today's "Post an ask" opens the composer focused, with a box that shows the whole sentence on a phone.
- **An intro ask** (`/intros/<id>`): the asker and their note first, then two buttons, "Introduce" and "No thanks"
  (the two kinds of no become one; the asker sees the same kind decline as today). Introduce shows the link with
  "Copy link" as the main action; "Email it to <name>" is a second, optional action with the email field inside it,
  shown only when the community sends email.
- **The prefilled intro note** is built from the person asked for (name, role, company) and the asker, never from an
  earlier need (a bug: today it carries an unrelated ask's words).
- **"I can help"** commits on the first tap from Today. Its note is **private to the asker** ("A note only <name>
  sees"); the public line is the fixed sentence ("Sam can help"). See Fork 1.
- **"Not for me"** on a For you ask hides it there and on Today.
- **Checks (driven, 390 px, `study/walk.mjs` look counts):**
  1. The same ask text finds at least the helpers with the target box empty as with it filled (the persona's procurement
     ask: before, "Nobody has a path yet" empty and "1 member can help" filled).
  2. Answering an intro ask yes from Today: 2 taps to a copyable link, 0 fields required.
  3. The composer shows 1 box and 1 button before typing (before: 7 elements).
  4. A note left with I can help is visible to the asker and not to a third member (signed in as Maya).
  5. `src/modules/asks/*.test.ts`, `src/modules/intros/*.test.ts` updated and green.

## Part 2: Today and People lead with what waits
- **Today:** "Waiting on you" first; the heading's count equals the items shown. The "add to home screen" card shows
  once (dismissed for good on its close or after the first visit) and never inside the store app. "Fill in your card
  from public profiles?" doesn't show once the card was filled in.
- **People:** the three "Who are you looking for?" chips that only change the placeholder go; "An expert" stays as a
  "Mentors and experts" link. Member search matches any word, best matches first ("fintech investor" finds the 4
  fintech members and the 3 investors, those with both first). When no member matches and the member can search
  networks, the empty state offers it in one tap, with the words already in: "Search their networks for “…”".
- **Checks:** Today's first block is the waiting item (p02's account); "fintech investor" lists members (before: 0);
  the empty state's one tap starts the network search; controls above People's list: at most 3 (before: 7);
  `src/shell/today-list.test.ts` and People's tests green.

## Part 3: Member settings in one place
- **One Settings list,** the same in the avatar menu and at the foot of My profile: My card, Privacy, Alerts, Email,
  Booking link, Your network, Jobs, Your data, Password. The alert log is linked from Alerts.
- **"Members can ask me for intros" is switched in one place,** Privacy (the `acceptsIntroAsks` setting); other pages
  that repeat it link there. My network keeps its own, different consent (sharing the network before connecting it),
  in words that no longer repeat Privacy's sentence; the two are not merged (a consent, see Fork 6).
- **"Who can see my profile: Nobody"** says what it does in one line, and the code makes it true: "Members won't find
  you in People or be pointed to you on asks." Hidden members leave the asks' word matching (`readWordHelpers` in
  `src/modules/asks/reads.ts` doesn't exclude them today); intro asks through an existing path are unchanged.
- **Quiet means quiet for new members:** "Let through messages and intro asks" starts off for members who join after
  the change. Members who never saved alert choices read the default today, so a migration first writes their current
  choice (Let through on) for every existing member without a saved row; then the default flips. See Fork 3.
- **My card:** one "Edit card" opening every field with one Save (before: an Edit and a Save per field, 13 fields).
- **"Who can message me":** two choices, "Anyone in the community" and "Only people I've been introduced to" (the
  "community default" option goes when it equals Anyone).
- **Checks:** both entry points list the same 9 items; the intro switch exists once (search the rendered settings
  pages); editing 3 card fields takes 5 taps (before: 9); a member who joins after the change has Let through off and
  an existing member who never saved keeps it on; a "Nobody" member is not a word-matched helper; tests in
  `src/platform/notifications/`, `src/modules/members/` and `src/modules/asks/` green.

## Part 4: An admin's first hour and daily view
- **`/setup` asks the community's name** (one field, with the admin's own). Invitees never see "Your community".
- **The guided start drops "Connect Village"** as a step: Village becomes an optional Set up row ("Network search:
  connect Village"). The guided start is the card and the invites.
- **Invites:** one box, then "Create invite links" (mail off) or "Send invites" (mail on). The profile fill-in consent
  question shows only when profile fill-in is on, preselected on "Ask each member at sign-in". Each invited founder
  gets a Copy button right after the invite is made. Later copies (Sign-in links) still make a new link, as tokens are
  stored only as hashes, and now say so: "This makes a new link; the one you sent before stops working." (Handing back
  the same link is a security change: Fork 4.)
- **One checklist:** the second "Four steps to launch" list merges into the guided start's; "Mail" counts as done when
  the admin chose copy-the-link. The Set up badge counts unfinished setup steps only; flags and waiting members show on
  Home.
- **Set up shows "Weekly email · <day> <time>"** as a row opening its schedule; "Your plan" hides after launch.
- **Console Home keeps a "Partner report" tile always** (the phone has no Report tab).
- **Checks (driven on an empty copy, laptop and phone):** from `/setup` to a copyable invite link in at most 3
  screens and 1 decision (before: 4 screens, 9 decisions); invitees see the community's name; the report opens from
  Home on a phone in 1 tap; the Set up badge is 0 on a finished setup with an open flag; tests in
  `src/modules/admin/` and `src/modules/members/` green.

## Part 5: Sharing and posting forms
- **Library, share:** a title and one box, "Paste it, link it or attach a file"; Kind and Role optional (Kind guessed
  from what was pasted or attached, shown for a one-tap fix); visibility "Whole portfolio" with the other two under
  "More options". The secret scan checks pasted text too, not only files.
- **A hiring request made from a job doesn't spend a weekly ask**; the button says so.
- **Jobs, add:** "Add a job" (title, location, an apply link or email, optional) comes first; with no link, Apply
  messages the founder. "Already on Greenhouse, Lever…? Paste your careers link" is a second line. Adding a job by hand
  never makes a second card for the member's own company.
- **Checks:** a hiring request from a job leaves the "asks left" count unchanged; sharing a pasted prompt takes 1
  title + 1 paste + 1 tap (before: 7 decisions); a pasted made-up key
  pattern is caught; posting a job with no link works and its Apply opens a message; tests in `src/modules/library/`
  and `src/modules/job-board/` green.

## After the parts: the re-study
The same 12 personas walk the same journeys on the merged build (as round 6 did). **Pass:** no harm-5 finding, harm-4
rows at most half of the AUDIT's, and the decisions-before-value count of every journey in the study reports (`study/p01…p12`) at or
below today's. Anything that fails goes back to its part once; after that it becomes a roadmap line.

## Forks for the council
1. **The "I can help" note private** (Part 1). My pick: private to the asker, because people write it as a note to one
   person. The other way: keep it public and label it "Everyone sees this".
2. **Network search on Enter** (Part 2). My pick: no, it spends Village searches (the reason it became a separate step,
   search-connect-only); offer it in one tap when no member matches.
3. **"Let through" off for new members** (Part 3). My pick: off, so a quiet time is quiet; existing members keep theirs.
4. **Security choices left to the owner, not in this spec:** trusting founders who joined from an admin's invite link
   without a second "Yes, this is them" (p01), and Copy handing back the same invite link (it would mean storing the
   token, not only its hash).
5. **One Notifications page for Alerts and Email** (p06, p12): large, and not in this spec; a roadmap line.
6. **Merging My network's sharing consent with Privacy's intro switch:** not done (a consent); the owner may decide
   later.

## Situations the plan was tested on
- **A fund with Village and mail both off:** no Village step in the guided start, invites end on "Create invite
  links" with a Copy per founder, "Email it to <name>" is hidden on intro asks, network search isn't offered.
- **A member who set "Nobody" last month:** keeps it; the new line tells them what it does, and they stop being
  pointed to on asks.
- **An admin on a phone only:** the guided start, invites and the report tile all work at 390 px (Part 4's checks run
  on a phone too).
