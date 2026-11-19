import { NOTIFICATION_API_ROUTES } from "./contract.ts";

// Browser-only. Forgets this browser's push subscription, on the server and in the browser: "Turn off on this device",
// and every sign-out, so the next person to sign in on a shared computer never sees the last one's alerts.
export async function forgetThisBrowser() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = registration ? await registration.pushManager.getSubscription() : null;
  if (!subscription) return;
  await fetch(NOTIFICATION_API_ROUTES.devices, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address: subscription.endpoint }) }).catch(() => null);
  await subscription.unsubscribe().catch(() => false);
}
