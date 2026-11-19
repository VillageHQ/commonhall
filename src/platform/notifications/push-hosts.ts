import type { Environment } from "../environment.ts";

// Where a browser's push subscription may point: the browsers' own push services, over https. Anything else is refused
// at registration and never sent to, so a member can't make this server call an address of their choosing.
// PUSH_TEST_ORIGIN lets the tests' fake push server in (an exact origin, like http://127.0.0.1:4567); never set it in
// production.

const PUSH_SERVICE_HOSTS = [
  // Chrome, Edge (Chromium), Opera, Samsung Internet and Android.
  "fcm.googleapis.com",
  "android.googleapis.com",
  // Firefox.
  ".push.services.mozilla.com",
  // Edge on Windows.
  ".notify.windows.com",
  // Safari on macOS, iPhone and iPad.
  ".push.apple.com",
];

function matchesHost(hostname: string, allowed: string) {
  return allowed.startsWith(".") ? hostname.endsWith(allowed) : hostname === allowed;
}

export function isAllowedPushEndpoint(endpoint: string, environment: Environment) {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  const testOrigin = environment.PUSH_TEST_ORIGIN?.trim();
  if (testOrigin && url.origin === testOrigin) return true;
  return url.protocol === "https:" && url.port === "" && url.username === "" && url.password === "" && PUSH_SERVICE_HOSTS.some((allowed) => matchesHost(url.hostname, allowed));
}
