import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

import { and, eq, gt, like, sql } from "drizzle-orm";

import { verification } from "../database/auth-schema.ts";
import type { Database } from "../database/client.ts";
import type { Environment } from "../environment.ts";
import { resolveAuthSecret } from "./auth-secret.ts";

// The 6-digit code in the sign-in email: the same sign-in as the link, typed instead of opened, so a phone app
// never has to leave for the browser. One live code per address; using the code or the link uses up both.
export const SIGN_IN_CODE_LENGTH = 6;
export const SIGN_IN_CODE_PATTERN = /^\d{6}$/;
const CODE_IDENTIFIER_PREFIX = "sign-in-code:";
const MISSES_IDENTIFIER_PREFIX = "sign-in-code-misses:";
// Better Auth's magic-link rows (see sign-in-link.ts); repeated here so this file has no import cycle.
const LINK_IDENTIFIER_PREFIX = "magic-link:";
const CODE_SPACE = 10 ** SIGN_IN_CODE_LENGTH;
// A wrong guess counts against the code (it dies at 5) and against the address for a day (no code works after 10),
// so asking for fresh emails never buys more than 10 guesses in a million a day.
const MAXIMUM_MISSES_PER_CODE = 5;
const MAXIMUM_MISSES_PER_DAY = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

type CodeRow = { hash: string; misses: number };

function toCodeIdentifier(email: string) {
  return `${CODE_IDENTIFIER_PREFIX}${email.trim().toLowerCase()}`;
}

function toMissesIdentifier(email: string) {
  return `${MISSES_IDENTIFIER_PREFIX}${email.trim().toLowerCase()}`;
}

async function hashCode(database: Database, environment: Environment, email: string, code: string) {
  const secret = await resolveAuthSecret(database, environment);
  return createHmac("sha256", secret).update(`${email.trim().toLowerCase()}:${code}`).digest("base64url");
}

function readCodeRow(value: string): CodeRow | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (parsed && typeof parsed === "object" && "hash" in parsed && "misses" in parsed && typeof parsed.hash === "string" && typeof parsed.misses === "number") {
      return { hash: parsed.hash, misses: parsed.misses };
    }
  } catch {}
  return null;
}

function isSameHash(first: string, second: string) {
  const firstBytes = Buffer.from(first);
  const secondBytes = Buffer.from(second);
  return firstBytes.length === secondBytes.length && timingSafeEqual(firstBytes, secondBytes);
}

// A fresh code for an address, replacing any earlier one. Only the hash is stored.
export async function createSignInCode(database: Database, environment: Environment, email: string, lifetimeSeconds: number) {
  const code = String(randomInt(0, CODE_SPACE)).padStart(SIGN_IN_CODE_LENGTH, "0");
  const value: CodeRow = { hash: await hashCode(database, environment, email, code), misses: 0 };
  const identifier = toCodeIdentifier(email);
  await database.transaction(async (transaction) => {
    await transaction.delete(verification).where(eq(verification.identifier, identifier));
    await transaction.insert(verification).values({ id: randomUUID(), identifier, value: JSON.stringify(value), expiresAt: new Date(Date.now() + lifetimeSeconds * 1000) });
  });
  return code;
}

// Forgets an address's code: after its link signs in, so the code can't be used as well.
export async function forgetSignInCode(database: Database, email: string) {
  await database.delete(verification).where(eq(verification.identifier, toCodeIdentifier(email)));
}

async function readMissesToday(database: Database, email: string) {
  const [row] = await database
    .select({ value: verification.value })
    .from(verification)
    .where(and(eq(verification.identifier, toMissesIdentifier(email)), gt(verification.expiresAt, new Date())));
  return row ? Number(row.value) || 0 : 0;
}

async function countMiss(database: Database, email: string) {
  const identifier = toMissesIdentifier(email);
  const [counted] = await database
    .update(verification)
    .set({ value: sql`(${verification.value}::int + 1)::text` })
    .where(and(eq(verification.identifier, identifier), gt(verification.expiresAt, new Date())))
    .returning({ id: verification.id });
  if (counted) return;
  await database.delete(verification).where(eq(verification.identifier, identifier));
  await database.insert(verification).values({ id: randomUUID(), identifier, value: "1", expiresAt: new Date(Date.now() + DAY_MS) });
}

// True when the code is the address's live one. A right code is used up with the address's live links; a wrong one
// counts as a miss. Unknown addresses and expired codes answer false like a wrong code.
export async function redeemSignInCode(database: Database, environment: Environment, email: string, code: string) {
  if (!SIGN_IN_CODE_PATTERN.test(code)) return false;
  const normalizedEmail = email.trim().toLowerCase();
  if ((await readMissesToday(database, normalizedEmail)) >= MAXIMUM_MISSES_PER_DAY) return false;

  const identifier = toCodeIdentifier(normalizedEmail);
  const [row] = await database
    .select({ id: verification.id, value: verification.value })
    .from(verification)
    .where(and(eq(verification.identifier, identifier), gt(verification.expiresAt, new Date())));
  const stored = row ? readCodeRow(row.value) : null;
  if (!row || !stored) return false;

  const hash = await hashCode(database, environment, normalizedEmail, code);
  if (isSameHash(hash, stored.hash)) {
    // Deleting the row is the claim: of two tries at once with the right code, only one deletes it.
    const claimed = await database.delete(verification).where(eq(verification.id, row.id)).returning({ id: verification.id });
    if (claimed.length === 0) return false;
    await database
      .delete(verification)
      .where(and(like(verification.identifier, `${LINK_IDENTIFIER_PREFIX}%`), sql`lower(${verification.value}::jsonb ->> 'email') = ${normalizedEmail}`));
    return true;
  }

  await countMiss(database, normalizedEmail);
  // Counted in the database, so wrong guesses sent all at once still each count.
  const [missed] = await database
    .update(verification)
    .set({ value: sql`jsonb_set(${verification.value}::jsonb, '{misses}', to_jsonb(coalesce((${verification.value}::jsonb ->> 'misses')::int, 0) + 1))::text` })
    .where(eq(verification.id, row.id))
    .returning({ value: verification.value });
  const misses = missed ? (readCodeRow(missed.value)?.misses ?? MAXIMUM_MISSES_PER_CODE) : MAXIMUM_MISSES_PER_CODE;
  if (misses >= MAXIMUM_MISSES_PER_CODE) await database.delete(verification).where(eq(verification.id, row.id));
  return false;
}
