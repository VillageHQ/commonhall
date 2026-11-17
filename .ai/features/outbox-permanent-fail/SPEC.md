# Giving up on an email

The outbox (`src/platform/email/outbox-sender.ts`) tries an email up to 6 times, waiting 1, 5, 15, 60 and 180
minutes between tries, then marks it failed and the admin sees it. When Resend refuses the email itself (422: a bad
address or field), the email fails at the first try. A malformed or wrong key (400, 401), an unverified domain
(403), a rate limit (429) and server errors keep the usual tries. The error keeps Resend's reason, and "Send a test
to me" says the test was refused instead of "tried again in a minute".
