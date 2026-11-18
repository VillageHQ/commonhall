# How mentors, booking links and "Book a call" work today

## Data (`src/modules/members/schema.ts`, migration `drizzle/0038_*`)
- `member_profile.community_role`: `founder` (default), `mentor`, `expert`, `advisor`, `entrepreneur_in_residence`,
  `fund_team`. The names and labels live in `contract-community-roles.ts` (`COMMUNITY_ROLES`, `COMMUNITY_ROLE_LABELS`);
  announcements reads them by name. Not the admin role: that stays `user.role`.
- `member_profile.booking_url` (https only, checked by `parseBookingUrl` and a database check) and
  `booking_visibility` (`community` or `introduced`).
- `invite.community_role`: from the CSV's optional "community role" / "member type" column (never by position, since
  "role" alone often means a job title); copied onto the profile when the invite is accepted. An unknown word refuses
  that row with the list of roles.
- `call_request` (id, requester_id, member_id, created_at): one row per "Book a call" click. Both user links are
  `set null`; a deleted member's user row stays as "Deleted member", so past calls still count without the name.

## Who sees a link (`service-booking.ts`)
One rule for every screen and API answer (`mayViewerSee`): the owner is active and listed (not "hide me"), the viewer
isn't the owner, neither blocked the other, and the link is for the community, or the viewer was introduced to them.
"Introduced" is the intros module's test, so the shell passes it in: `shell/booking-access.ts` wraps `wereIntroduced`
from `shell/message-policy.ts` (the same test as "who can message me"). The directory read takes a `DirectoryViewer`
and fills `bookingUrl` only where the viewer may see it; the stored link never leaves the server otherwise.

## Screens
- Directory: `member-directory.tsx` has an "Everyone | Experts and mentors" switch (`?view=experts`) and, in that view
  only, a role filter (`?role=mentor|expert|advisor|entrepreneur_in_residence`; any other role reads as none). Expert
  cards (`ExpertRow`) are not one big link: the name links to the profile and "Book a call" sits beside the role. The
  "Updated" filter isn't offered there (expert cards show no "fresh as of"); switching views resets it. Every card
  names a non-founder role as a chip.
- Profile `/people/<id>`: the role chip, and "Book a call" when `readShownBooking` gives a link (never on your own).
- My profile `/me`: `booking-sheet.tsx` (link, who sees it, Remove link) saves through `/api/profile/booking`; it doesn't
  touch "fresh as of".
- `book-call-button.tsx`: a plain `<a target="_blank">` to the link, so no popup blocker stops it; its click first
  sends `/api/members/call` with `keepalive`. The route re-checks visibility and inserts one row. A second click within
  1.5 s is ignored (a double-click is one request).
- Admin: Manage member › "Community role" (`community-role-action.tsx` → `/api/admin/members/community-role`,
  `service-community-role.ts`, audited as `community_role_changed`, admins only). The Members table names non-founder
  roles. `/admin/calls` (lights Members in the console menu): total, last 30 days, per person, per week (last 12,
  Monday starts), the latest 50 and a CSV (`/api/admin/calls`). Console Home's "Calls requested" sheet reads the same
  `readCalls`, so the numbers agree; it shows once the community is launched.

## Demo
`platform/demo/people.ts` `DEMO_COMMUNITY_ROLES` and `DEMO_CALL_REQUESTS`: Grace (mentor), Oliver (advisor), Lena
(entrepreneur in residence) with links; Ines (expert) with an introduced-only link; Marcus (expert, no link); Maya and
Julia (fund team). Links are at `cal.example.com`, so a new tab opens nothing real.

## Not built
Confirmed bookings from Calendly or Cal.com (the owner chose click counts); Commonhall's own calendar.
