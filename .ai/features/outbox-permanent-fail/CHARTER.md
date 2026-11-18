# Charter: an email Resend refuses is given up at once

Approved direction: The owner's brief for the Commonhall onboarding topic (17 Nov 2026): "Crashes and small bugs first
(they need no design)." Found on the LOI demo: Resend answered 422 for example.com addresses and the rows stayed
"pending" through 6 tries over about 4 hours.

- **Fix:** a 422 from Resend (the email itself is refused) fails the email at once, and the admin's "given up"
  notice shows it. 400 (Resend also uses it for a malformed API key), 401, 403 (wrong key, unverified domain), 429 (rate limit) and 5xx keep the usual retries, because
  the admin or time can fix them. (The TODO said "every 4xx but 429"; Qareen kept 401/403 retrying so a key fix
  within the retry window still sends the queued email.)
- **Tests:** `src/platform/email/reliable-email.test.ts`, 5 new cases, red before and green after.
