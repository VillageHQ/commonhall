# Members

Core. Always on. Others build on it; it never imports them.

- `schema.ts`: profiles, tags, avatars, invites and `member_network`. It also holds Village columns: LinkedIn lives on it, and splitting needs a data migration.
- `service-profile.ts`, `reads-directory.ts`: the member card and the directory. Stage, sector and cohort are free text, filtered as whole values ignoring case; the cohort starts from the invite.
- `service-invites.ts`, `service-email-confirmation.ts`: issuing and accepting invites, and confirming an email.
  `service-invite-emailed.ts`: the emailed link's mark; joining from it confirms the address.
- `*-bulk-invites.ts`: inviting from a pasted list or a CSV. Parsing drops leading formula characters; a downloaded CSV goes through `toCsv`.
- `service-admin.ts`: what an admin does to one member: confirm an email, confirm or clear a LinkedIn claim.
- `service-blocks.ts`, `contract-blocks.ts`: blocks. Whoever calls `setMemberBlocked` passes the effects that run in the same transaction.
- `service-report-credit.ts`: the "credit me in reports" switch, off by default.
- Pages `/people` (with `shell/people-screen.tsx`), `/people/<id>`, `/me`, `/me/data`, `/me/email`: `.ai/features/fh-directory-profile/NOTES.md`.
- `slots.tsx`: `MemberConversationSlot`, filled by messages. The shell passes `HiringLookup`.
- `service-linkedin.ts`: LinkedIn claims, and whether a member's email is trusted.
- `*-fill-in.ts`: the fill-in's data: the admin's basis, each member's answer (`member_lookup`), the lines (`member_fill_in`). Network saves here.
- `service-onboarding.ts`: onboarding state; `src/shell/onboarding.ts` runs the two welcome steps.
- `contract-privacy.ts`, `service-privacy.ts`: `member_privacy`: hide me, who can message me, accept intro asks (null = never answered = yes). `isListedMember` keeps hidden members out of lists and asks' word helpers.
- `service-erasure.ts`: the real delete's part. The `user` row stays as a "Deleted member" placeholder; `member_removal.erased_at` marks it. `shell/account-deletion.ts` runs it all.
- `*community-role*.ts`, `service-booking.ts`: roles, booking links, Book a call: `.ai/features/mentors-calls/NOTES.md`.
- `contract-*.ts`: Zod schemas and constants, loaded outside Next too: relative imports, no `server-only`.
- `queries-*.ts`: client requests. `components/`: the UI.

Rules:

- Never store an invite token. Store its hash, and compare in constant time.
- Every admin change writes the audit log in its transaction, through `withAdminTransaction`.
- Filled-in lines never go into `member_profile`. Own words win (`readShownCard`), an uploaded photo beats the filled face, a logo shows only beside the company found (`reads-pictures.ts`).
- The fill-in gate is `isLookupAllowed`: no basis, nobody; "Don't look me up" always wins, and deletes the lines (a hidden line keeps its hide, with no words). `saveFilledProfile` checks it again under the row lock.
- A refresh never touches `hidden_at`, so a hidden line stays hidden.
- Tests sit next to the code, on real route handlers and a real database.
