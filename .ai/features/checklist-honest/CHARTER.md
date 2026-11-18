# Charter: the console checklist says only what is true

Approved direction: The owner's brief for the Commonhall onboarding topic (17 Nov 2026), and the small calls on the
onboarding design page ("Your look counts as done only with a logo; after adding people without email it says
'6 added, no email sent yet'"). Found on the LOI demo walkthrough.

- **"Your fund's look"** was done as soon as the name was saved, while every page still showed initials. Now done
  only with a logo; with a name and no logo it says "<name> is saved; members still see your initials. Add your logo →".
- **"Invite your first founders"** said "6 invites sent" after an import with email off. Now it counts invites that
  were emailed: "6 added, no email sent yet. Send their links from Sign-in links →" (or "6 added, 4 emailed").
- The checklist's mail link pointed at the old /admin/email (a redirect); now /admin/mail.
- **Tests:** `src/shell/admin-home.test.ts`, red before and green after.
