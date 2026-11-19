import webPush from "web-push";

import type { Environment } from "../environment.ts";
import { resolveAppUrl } from "../http/app-url.ts";
import { logError } from "../observability/route-logging.ts";
import { isAllowedPushEndpoint } from "./push-hosts.ts";
import { readVapidSubject, type VapidKeys } from "./vapid.ts";

// Delivery to one device. Both go through fetch, so demo mode's guard stops calls to real push services and tests
// point them at a fake server.

export const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const SEND_TIMEOUT_MS = 8000;
const ALERT_TTL_SECONDS = 24 * 60 * 60;
const GONE_STATUS = 410;
const NOT_FOUND_STATUS = 404;

export type AlertPayload = { title: string; body: string; url: string; kind: string };

// `gone`: the push service says the subscription ended (410), so the device is removed. `unknown`: it doesn't know the
// subscription (404), which a brand-new one can briefly be; notify() removes such a device only once it is old.
export const DELIVERY_RESULTS = { sent: "sent", gone: "gone", unknown: "unknown", failed: "failed" } as const;

export type DeliveryResult = (typeof DELIVERY_RESULTS)[keyof typeof DELIVERY_RESULTS];

type WebPushDevice = { address: string; p256dh: string | null; auth: string | null };

export async function sendWebPush(device: WebPushDevice, payload: AlertPayload, keys: VapidKeys, environment: Environment): Promise<DeliveryResult> {
  // A row from before the allowed-hosts rule, or keys gone missing: never sent to, and removed.
  if (!device.p256dh || !device.auth || !isAllowedPushEndpoint(device.address, environment)) return DELIVERY_RESULTS.gone;
  const details = webPush.generateRequestDetails({ endpoint: device.address, keys: { p256dh: device.p256dh, auth: device.auth } }, JSON.stringify(payload), {
    vapidDetails: { subject: readVapidSubject(environment), publicKey: keys.publicKey, privateKey: keys.privateKey },
    TTL: ALERT_TTL_SECONDS,
    urgency: "high",
  });
  const response = await fetch(details.endpoint, {
    method: details.method,
    headers: details.headers as Record<string, string>,
    body: details.body ? new Uint8Array(details.body) : null,
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (response.ok) return DELIVERY_RESULTS.sent;
  if (response.status === GONE_STATUS) return DELIVERY_RESULTS.gone;
  if (response.status === NOT_FOUND_STATUS) return DELIVERY_RESULTS.unknown;
  logError("notify-webpush", new Error(`The push service answered ${response.status}.`));
  return DELIVERY_RESULTS.failed;
}

type ExpoTicket = { status?: string; details?: { error?: string } };

// Expo answers each message with a ticket; DeviceNotRegistered means the app was removed from that phone. `origin`
// tells the app which of its communities sent the alert, so a tap opens the page there.
export async function sendExpoPush(tokens: string[], payload: AlertPayload, environment: Environment): Promise<DeliveryResult[]> {
  if (tokens.length === 0) return [];
  const origin = resolveAppUrl(environment);
  const response = await fetch(environment.EXPO_PUSH_URL?.trim() || EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(tokens.map((to) => ({ to, title: payload.title, body: payload.body, data: { url: payload.url, kind: payload.kind, origin }, sound: "default" }))),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  });
  if (!response.ok) return tokens.map(() => DELIVERY_RESULTS.failed);
  const answer = (await response.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
  return tokens.map((_, index) => {
    const ticket = answer?.data?.[index];
    if (ticket?.status === "ok") return DELIVERY_RESULTS.sent;
    return ticket?.details?.error === "DeviceNotRegistered" ? DELIVERY_RESULTS.gone : DELIVERY_RESULTS.failed;
  });
}
