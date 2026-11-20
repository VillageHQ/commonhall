# Part 5 (admin console): the build plan

Approved scope: the round-6 SPEC's Part 5 and its Decisions (the lead's brief, 20 Nov 2026). This file is the plan
that follows from it; nothing here goes beyond the SPEC.

1. **Areas as tabs.** One row of tabs under each merged area's title, across the pages' own addresses:
   Members (Members, Invites, Import, Sign-in links, Calls) · Asks & intros (Asks, Intro log) · Announce
   (Announcements, Weekly email). A tab whose module is off is hidden (each manifest's `adminTabs`). Set up's
   engineer pages get a "Set up" back link.
2. **Home.** The launch checklist until setup is done (shorter). After it: "This week" with 4 numbers (founders
   active in 7 days, open asks with no help, intros waiting over 3 days, room joins from `countRoomJoins`, hidden
   while Rooms is off) and up to 5 items that need the admin, each a link.
3. **Asks & intros.** Asks with no help first; the figures, digest and allowance leave the page. The Intro log loses
   its two settings cards (they move to Set up).
4. **Announce.** The announcement form, the sent list, and the weekly email's schedule (its form) and preview on
   one page. The full preview page (`/admin/digest`) stays as the Weekly email tab.
5. **Set up.** `/admin/settings` is the one page: branding, Mail and Features in view; the asks allowance and the
   outcome question; everything for an engineer under Advanced (Rooms server, Village, Mail log, Audit log, Flagged
   asks, Perks, Job board, Slack and Discord, Guided start, version). `/admin/setup` redirects there. The guided
   start drops its branding step, so the branding form lives on one page.
6. **Features.** Names with a one-line hint, Rooms first ("needs a voice server" while none is set up), Feed's
   line says it sits under More.
7. **Report.** The verdict line and 3 numbers first; all-zero rows and tables hidden.
8. **Word cuts** on every admin page to the SPEC's table, measured with `study/capture.mjs` at 390px.
9. **Feed off by default for new communities.** A migration stores Feed's current "on" for every community that
   already has members, then Feed's default flips to off.
