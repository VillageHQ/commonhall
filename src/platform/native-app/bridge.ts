// Browser-only. The Commonhall phone app opens the portal in a web view and puts `window.CommonhallApp` there before
// the page loads (mobile/src/lib/bridge.ts). Pages that do something natively in the app read it here; in a plain
// browser it is missing and nothing changes. Client-safe, relative imports only.

export const NATIVE_APP_READY_EVENT = "commonhall-app-ready";

export type NativeApp = {
  version: number;
  platform: string;
  // The phone's Expo push token, once the member allowed alerts; sign-out forgets it on the server.
  pushToken: string | null;
  // Opens a live voice room in the app's own player, which keeps playing with the screen locked.
  openRoom: (roomId: string, title: string) => void;
};

type WindowWithApp = Window & { CommonhallApp?: Partial<NativeApp> };

export function readNativeApp(): NativeApp | null {
  if (typeof window === "undefined") return null;
  const app = (window as WindowWithApp).CommonhallApp;
  if (!app || typeof app.openRoom !== "function") return null;
  return { version: Number(app.version) || 1, platform: String(app.platform ?? ""), pushToken: typeof app.pushToken === "string" ? app.pushToken : null, openRoom: app.openRoom };
}

// For useSyncExternalStore: the app can arrive after the page (the web preview sets it on load).
export function subscribeToNativeApp(onChange: () => void) {
  window.addEventListener(NATIVE_APP_READY_EVENT, onChange);
  return () => window.removeEventListener(NATIVE_APP_READY_EVENT, onChange);
}

export function isInNativeApp() {
  return readNativeApp() !== null;
}
