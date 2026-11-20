// Browser-only. The Commonhall phone app opens the portal in a web view and puts `window.CommonhallApp` there before
// the page loads (mobile/src/lib/bridge.ts). Pages that do something natively in the app read it here; in a plain
// browser it is missing and nothing changes. Client-safe, relative imports only.

export const NATIVE_APP_READY_EVENT = "commonhall-app-ready";
// The app's room screen closed: `detail` is { roomId, reason }.
export const NATIVE_ROOM_CLOSED_EVENT = "commonhall-room-closed";

export const ROOM_CLOSED_REASONS = { left: "left", ended: "ended", elsewhere: "elsewhere", failed: "failed" } as const;
export type RoomClosedReason = (typeof ROOM_CLOSED_REASONS)[keyof typeof ROOM_CLOSED_REASONS];
export type RoomClosed = { roomId: string; reason: RoomClosedReason };

// What the page tells the app with a room: whether the member already told people about it ("Tell people I'm here"
// or a Notify when starting it), so the app doesn't offer it again. Apps before this ignore it.
export type OpenRoomFacts = { hasNotified: boolean };

// The app's own actions, which the avatar menu's "This app" group offers (mobile/src/lib/bridge.ts, APP_ACTIONS).
export const APP_ACTIONS = { reload: "reload", browser: "browser", switch: "switch" } as const;
export type AppAction = (typeof APP_ACTIONS)[keyof typeof APP_ACTIONS];

// The app's user agent carries this (`applicationNameForUserAgent`), so the server can tell its pages apart.
export const NATIVE_APP_USER_AGENT_MARK = "CommonhallApp/";

export function isNativeAppUserAgent(userAgent: string | null | undefined) {
  return Boolean(userAgent?.includes(NATIVE_APP_USER_AGENT_MARK));
}

export type NativeApp = {
  version: number;
  platform: string;
  // The phone's Expo push token, once the member allowed alerts; sign-out forgets it on the server.
  pushToken: string | null;
  // Opens a live voice room in the app's own player, which keeps playing with the screen locked.
  openRoom: (roomId: string, title: string, facts?: OpenRoomFacts) => void;
  // Reload, open in the browser, switch community; null in an app from before these (it shows no "This app" items).
  appAction: ((action: AppAction) => void) | null;
};

type WindowWithApp = Window & { CommonhallApp?: Partial<NativeApp> };

export function readNativeApp(): NativeApp | null {
  if (typeof window === "undefined") return null;
  const app = (window as WindowWithApp).CommonhallApp;
  if (!app || typeof app.openRoom !== "function") return null;
  const appAction = (app as { appActions?: unknown }).appActions === true && typeof app.appAction === "function" ? app.appAction : null;
  return { version: Number(app.version) || 1, platform: String(app.platform ?? ""), pushToken: typeof app.pushToken === "string" ? app.pushToken : null, openRoom: app.openRoom, appAction };
}

// For useSyncExternalStore: the app can arrive after the page (the web preview sets it on load).
export function subscribeToNativeApp(onChange: () => void) {
  window.addEventListener(NATIVE_APP_READY_EVENT, onChange);
  return () => window.removeEventListener(NATIVE_APP_READY_EVENT, onChange);
}

const CLOSED_REASONS = new Set<string>(Object.values(ROOM_CLOSED_REASONS));

// The app's "room closed" event, checked: anything else is ignored.
export function readRoomClosed(event: Event): RoomClosed | null {
  const detail = (event as CustomEvent<unknown>).detail;
  if (!detail || typeof detail !== "object") return null;
  const { roomId, reason } = detail as Record<string, unknown>;
  if (typeof roomId !== "string" || typeof reason !== "string" || !CLOSED_REASONS.has(reason)) return null;
  return { roomId, reason: reason as RoomClosedReason };
}

// Calls back when the app closes this room's screen (Leave, the lock screen's Leave, or back from an ended room).
export function subscribeToRoomClosed(roomId: string, onClosed: (reason: RoomClosedReason) => void) {
  const listener = (event: Event) => {
    const closed = readRoomClosed(event);
    if (closed?.roomId === roomId) onClosed(closed.reason);
  };
  window.addEventListener(NATIVE_ROOM_CLOSED_EVENT, listener);
  return () => window.removeEventListener(NATIVE_ROOM_CLOSED_EVENT, listener);
}

export function isInNativeApp() {
  return readNativeApp() !== null;
}

// For useSyncExternalStore: whether the app takes the avatar menu's "This app" actions (a stable boolean snapshot).
export function hasAppActions() {
  return readNativeApp()?.appAction != null;
}

// Asks the app to do one of its own actions; does nothing in a browser or an app from before them.
export function runAppAction(action: AppAction) {
  readNativeApp()?.appAction?.(action);
}
