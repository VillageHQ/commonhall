import { readNativeApp } from "../native-app/bridge.ts";
import { NOTIFICATION_API_ROUTES } from "./contract.ts";

// Browser-only. Forgets this browser's push subscription, on the server and in the browser: "Turn off on this device",
// and every sign-out, so the next person to sign in on a shared computer never sees the last one's alerts. In the
// phone app, the app's push token goes the same way.
export async function forgetThisBrowser() {
  const appToken = readNativeApp()?.pushToken;
  if (appToken) await removeDevice(appToken);
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  if (!subscription) return;
  await removeDevice(subscription.endpoint);
  await subscription.unsubscribe().catch(() => false);
}

async function removeDevice(address: string) {
  await fetch(NOTIFICATION_API_ROUTES.devices, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address }) }).catch(() => null);
}
