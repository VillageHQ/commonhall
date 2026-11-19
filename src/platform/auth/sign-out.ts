import { authClient } from "./auth-client.ts";
import { ROUTES } from "../http/routes.ts";
import { clearVillageBrowserSession } from "./browser-session.ts";
import { forgetThisBrowser } from "../notifications/browser.ts";

export async function signOutAndGoTo(path: string) {
  // While still signed in, so the server can forget this browser's alerts (best effort: sign-out never waits on it failing).
  await forgetThisBrowser().catch(() => undefined);
  await authClient.signOut();
  clearVillageBrowserSession();
  window.location.assign(path);
}

export function signOut() {
  return signOutAndGoTo(ROUTES.signIn);
}
