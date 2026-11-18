# Charter: Sign-in links in an order the admin can follow

Approved direction: The owner's brief for the Commonhall onboarding topic (17 Nov 2026): "Crashes and small bugs first."
Reported on the LOI demo: the rows re-ordered after each Copy, so copying several in a row grabbed the wrong person.

- **Found:** the re-order did not reproduce on a test copy (copies and reloads keep the order). But an import makes
  all its invites in one moment, so those rows were ordered by random ids: an order that looks shuffled.
- **Fix:** newest batch first, then A–Z by email inside a batch.
- **Tests:** `src/modules/members/import.test.ts` "lists one import's links A–Z, and copying one moves no row".
