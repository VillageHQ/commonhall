import { isDemoMode } from "../demo/mode.ts";
import type { Environment } from "../environment.ts";

const RESEND_API_URL = "https://api.resend.com";
const EMAILS_PATH = "/emails";
const SEND_TIMEOUT_MS = 8_000;

export type ResendConfig = { apiKey: string; fromAddress: string; apiUrl: string };

type OutgoingEmail = {
  to: string | readonly string[];
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
  replyTo?: string | null;
  headers?: Readonly<Record<string, string>>;
};

// Demo mode has a made-up sender, so emails queue as usual; the outbox sender keeps them in the sending log.
const DEMO_RESEND_CONFIG: ResendConfig = { apiKey: "demo", fromAddress: "Northwind Founders <hello@northwind.example>", apiUrl: "https://resend.demo.invalid" };

export function readResendConfig(environment: Environment): ResendConfig | null {
  if (isDemoMode(environment)) return DEMO_RESEND_CONFIG;
  const apiKey = environment.RESEND_API_KEY?.trim();
  const fromAddress = environment.RESEND_FROM_ADDRESS?.trim();
  if (!apiKey || !fromAddress) return null;
  return { apiKey, fromAddress, apiUrl: environment.RESEND_API_URL?.trim() || RESEND_API_URL };
}

// Resend refused this email itself (a bad address, a bad field): another try gets the same answer. 400 is not here:
// Resend also answers 400 for a malformed API key, which the admin can fix, as with 401, 403 (key, domain) and 429.
const REJECTED_EMAIL_STATUS = 422;
const MAXIMUM_REASON_LENGTH = 200;

export class ResendRejectedEmailError extends Error {}

// Resend's own words ("Invalid `to` field…"), so the admin sees why.
async function readReason(response: Response) {
  const body: unknown = await response.json().catch(() => null);
  const message = body && typeof body === "object" && "message" in body && typeof body.message === "string" ? body.message : "";
  return message ? `: ${message.slice(0, MAXIMUM_REASON_LENGTH).replace(/\.$/, "")}` : "";
}

export async function sendResendEmail({ apiKey, fromAddress, apiUrl }: ResendConfig, email: OutgoingEmail) {
  const response = await fetch(`${apiUrl}${EMAILS_PATH}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": email.idempotencyKey,
    },
    body: JSON.stringify({
      from: fromAddress,
      to: [email.to].flat(),
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      ...(email.headers ? { headers: email.headers } : {}),
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (response.status === REJECTED_EMAIL_STATUS) throw new ResendRejectedEmailError(`Resend refused this email (${response.status})${await readReason(response)}.`);
  if (!response.ok) throw new Error(`Resend answered ${response.status}.`);
}
