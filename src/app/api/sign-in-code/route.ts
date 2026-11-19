import { z } from "zod";

import { getAuth } from "@/platform/auth/auth";
import { signInWithServerLink } from "@/platform/auth/server-link-sign-in";
import { redeemSignInCode } from "@/platform/auth/sign-in-code";
import { getDatabase } from "@/platform/database/client";
import { readResendConfig } from "@/platform/email/resend";
import { MAXIMUM_JSON_BODY_BYTES, withBodyLimit } from "@/platform/http/body-limit";
import { readTrustedClientIp } from "@/platform/http/client-ip";
import { hasTrustedOrigin } from "@/platform/http/member-route";
import { readJsonBody } from "@/platform/http/read-json-body";
import { platformRoutes } from "@/platform/modules/platform-routes";
import { recordFailedAttempt, releaseAttempt } from "@/platform/rate-limit/attempt-rate-limit";
import { pruneExpiredRateLimits } from "@/platform/rate-limit/rate-limit-pruning";

const FORBIDDEN_STATUS = 403;
const NOT_FOUND_STATUS = 404;
const UNPROCESSABLE_STATUS = 422;
const TOO_MANY_REQUESTS_STATUS = 429;
const MAXIMUM_EMAIL_LENGTH = 320;
const RATE_LIMIT_KEY_PREFIX = "sign-in-code";
const WRONG_CODE_MESSAGE = "That code didn't work. Check the newest email, or ask for a new one.";

const bodySchema = z.object({ email: z.string().trim().min(3).max(MAXIMUM_EMAIL_LENGTH), code: z.string().trim().max(12) });

function respond(message: string, status: number) {
  return Response.json({ message }, { status });
}

// The 6-digit code from the sign-in email, typed on the "Check your email" page (the phone app's way in, since an
// emailed link opens the browser). One answer for a wrong code, an expired one and an unknown address.
export const POST = platformRoutes.open(
  "sign-in-code",
  withBodyLimit(MAXIMUM_JSON_BODY_BYTES, async (request) => {
    if (!hasTrustedOrigin(request)) return respond("This request came from another site.", FORBIDDEN_STATUS);
    if (!readResendConfig(process.env)) return respond("Sign-in codes are off here.", NOT_FOUND_STATUS);

    const database = getDatabase();
    await pruneExpiredRateLimits(database);
    // Per IP when the host names a trusted IP header, as for links; each code also dies after 5 misses and each
    // address takes 10 a day (sign-in-code.ts), whoever sends them.
    const clientIp = readTrustedClientIp(request, process.env);
    const rateLimitKey = clientIp ? `${RATE_LIMIT_KEY_PREFIX}|${clientIp}` : null;
    if (rateLimitKey && (await recordFailedAttempt(database, rateLimitKey)).isLimited) {
      return respond("Too many tries. Wait a minute and try again.", TOO_MANY_REQUESTS_STATUS);
    }

    const body = bodySchema.safeParse(await readJsonBody(request));
    if (!body.success) return respond(WRONG_CODE_MESSAGE, UNPROCESSABLE_STATUS);
    const code = body.data.code.replace(/\s/g, "");
    if (!(await redeemSignInCode(database, process.env, body.data.email, code))) return respond(WRONG_CODE_MESSAGE, UNPROCESSABLE_STATUS);

    const result = await signInWithServerLink(database, await getAuth(), request, body.data.email.toLowerCase());
    if (!result.isSignedIn) return respond(WRONG_CODE_MESSAGE, UNPROCESSABLE_STATUS);
    if (rateLimitKey) await releaseAttempt(database, rateLimitKey);

    const headers = new Headers({ "Cache-Control": "no-store" });
    for (const cookie of result.setCookies) headers.append("Set-Cookie", cookie);
    return Response.json({ isPasswordRemoved: result.isPasswordRemoved }, { headers });
  }),
);
