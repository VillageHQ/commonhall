# Giving up on an email

The outbox (`src/platform/email/outbox-sender.ts`) tries an email up to 6 times, waiting 1, 5, 15, 60 and 180
minutes between tries, then marks it failed and the admin sees it. When Resend refuses the email itself (400 or 422:
a bad address or field), the email fails at the first try. A wrong key or unverified domain (401, 403), a rate limit
(429) and server errors keep the usual tries.
