# Announcements: how it works today

Admin console › **Announcements** (its own sidebar item, Megaphone; on a phone the page lights the Home tab). Page
`/admin/announcements`, only for admins: a member gets a real 404, and both APIs answer 403.

## The page
- **Compose:** a subject (one line, at most 100 characters: it becomes the feed post's heading) and a message (at
  most 2,800). Chips add a fill-in field at the cursor: `{first name}`, `{full name}`, `{company}`, `{community}`.
- **Fields** (`src/modules/admin/rules-announcement-fields.ts`, pure, used by the page and the server): matched in any
  case and spacing, doubled braces count as one. A missing name reads "there" in an email and "everyone" in the feed
  post; a missing company reads "your company". Anything else in braces is not a field: the page warns, and it is left
  out. A member never sees a raw `{...}`.
- **Who gets it:** Everyone, Founders, Mentors and experts, or One cohort. Founders and "mentors and experts" go by
  the community role (`member_profile.community_role`, from mentors-calls): founders are role `founder` (a member with
  no profile row counts as one, like the console's member list); mentors and experts are `mentor`, `expert`,
  `advisor` and `entrepreneur_in_residence` (`EXPERT_ROLES`, the directory's view); the fund team is in neither. A
  cohort is one members have, matched as a whole value ignoring case, like the directory's filter. One function,
  `isInAudience` in `contract-announcements.ts`, decides who is in for the page (count, preview) and the send. The
  line under it counts who will get the email and how many turned announcements off. On a phone the four buttons
  wrap to two rows.
- **Preview as:** any member in the audience (the admin first); the email exactly as they get it.
- **Send a test to me:** the email filled in as the previewed member, to the admin's own address, at once, subject
  `[Test] …` (kind `email_test`, so it arrives even when the admin turned announcements off).
- **Send:** a second click confirms ("Yes, send to N members"). The note under the button says how many emails were
  queued and whether it was pinned. The **Sent** list shows subject, audience, time, who sent it and the email count.

## The send (`src/modules/admin/service-announcements.ts`)
One transaction (`withAdminTransaction`): the `announcement` row, one outbox email per member who wants it (kind
`announcement`, topic `announcements`, dedupe key `announcement:<id>:<member>`), the feed post, the audit entry
`announcement_sent`. Any failure undoes all of it.
- **Sent once:** the page makes a `send_key` when the form opens; it is unique on `announcement`, so a second click,
  a retry or six requests at once find the first send (`isRepeat`) and queue nothing more.
- **Who:** active members (not banned or removed, not a deleted account), whose address never bounced or complained,
  and who did not turn announcements off (`email_opt_out` topic `announcements`). The outbox checks the switch again
  when it sends.
- **Refused (422) with the reason:** nobody in the audience, everyone in it turned announcements off, or the fields
  make the feed post longer than the feed's 3,000 characters. Email off on the site: 409.
- **Unsubscribe:** the email's own line "Stop announcement emails: <link>" (the outbox puts the member's unsubscribe
  page where `[[unsubscribe-url]]` is) and the one-click `List-Unsubscribe` headers, like every topic email. Members
  also have "Announcements from the team" in Email settings (`/me/email`).
- **Feed post:** only for Everyone, and only while the feed is on (founders, mentors-and-experts and cohort sends are email only: the feed is shared).
  Type `announcement` (members can't choose it, or turn a post into one), pinned at once and shown with "From the
  team". With three posts pinned, the oldest pin makes room. `createAnnouncementPostWithin` in `feed/service.ts`.

## Data
`announcement` (in `admin/schema.ts`): subject and body as written (fields unfilled), audience, cohort, queued count,
post id, sender id and name, sent time. Migration `0038`; `0040` lets the audience be `founders` or `experts`.

## Not yet
- Scheduling, open or click tracking, Slack or Discord posting (out of scope in the spec).

## Tests
`src/modules/admin/announcements.test.ts` (fields, opt-outs, sent once, cohort, founders and mentors-and-experts, empty audience, too long, admin only,
one-click headers through a fake Resend); `src/shell/navigation*.test.ts` (the menu item).
