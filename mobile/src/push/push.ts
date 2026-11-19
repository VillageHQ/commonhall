import type { AlertTap, PushSetup } from "./types";

// The web preview (`expo start --web`) has no Expo push. For the end-to-end check, `EXPO_PUBLIC_PREVIEW_PUSH_TOKEN`
// gives it a made-up token, and scripts/web-preview.mjs stands in for Expo's push service: an alert the server sends
// to that token comes back here as a banner, and a tap on it is handled like a tap on a phone's alert.

const PREVIEW_TOKEN = process.env.EXPO_PUBLIC_PREVIEW_PUSH_TOKEN ?? "";
const PREVIEW_EVENTS_PATH = "/__preview/push-events";
export const PREVIEW_ALERT_EVENT = "commonhall-preview-alert";

export async function setUpPush(): Promise<PushSetup> {
  if (!PREVIEW_TOKEN) return { token: null, reason: "Alerts work in the phone app, not in the web preview." };
  return { token: PREVIEW_TOKEN, reason: null };
}

export type PreviewAlert = { title: string; body: string; data: Record<string, unknown> };

// Alerts the preview's stand-in push service received, as banners (App.tsx shows them; a tap calls onTap).
export function listenForAlertTaps(onTap: (tap: AlertTap) => void) {
  const onPreviewTap = (event: Event) => onTap({ data: (event as CustomEvent<PreviewAlert>).detail.data });
  window.addEventListener(PREVIEW_ALERT_EVENT, onPreviewTap);
  return () => window.removeEventListener(PREVIEW_ALERT_EVENT, onPreviewTap);
}

export function listenForPreviewAlerts(onAlert: (alert: PreviewAlert) => void) {
  if (!PREVIEW_TOKEN || typeof EventSource === "undefined") return () => undefined;
  const source = new EventSource(PREVIEW_EVENTS_PATH);
  source.onmessage = (message) => {
    try {
      onAlert(JSON.parse(message.data) as PreviewAlert);
    } catch {}
  };
  return () => source.close();
}

export function tapPreviewAlert(alert: PreviewAlert) {
  window.dispatchEvent(new CustomEvent<PreviewAlert>(PREVIEW_ALERT_EVENT, { detail: alert }));
}
