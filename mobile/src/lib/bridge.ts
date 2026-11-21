// The app and the portal page talk through the web view. The page's own fetch carries the member's session cookie
// and the site's own origin, so the server's checks stay as they are: no app tokens, no second sign-in.
//   app -> page: `__commonhallBridge.call(id, method, path, body)` runs a fetch in the page.
//   page -> app: JSON messages: the fetch's answer, "open this voice room" (with whether the member already told
//   people about it, and a line for the host to read there, in the page's words), and the avatar menu's "This app" actions (reload, open in the browser, switch community).
//   app -> page: the event "commonhall-room-closed" when the app's room screen closes, so the room page says why.
// The page reads `window.CommonhallApp` (src/platform/native-app/bridge.ts in the web app).

import { isSameOrigin } from "./links.ts";

export const BRIDGE_VERSION = 1;
export const NATIVE_APP_READY_EVENT = "commonhall-app-ready";
export const ROOM_CLOSED_EVENT = "commonhall-room-closed";

// Why the room screen closed, as the page reads it (src/platform/native-app/bridge.ts, ROOM_CLOSED_REASONS).
export type RoomClosedReason = "left" | "ended" | "elsewhere" | "failed";

// The page marks itself as inside the app with this attribute on <html>; the site's CSS keys on `html[data-app]`.
export const APP_MARK = "commonhall";

// What the avatar menu's "This app" group asks the app to do.
export const APP_ACTIONS = ["reload", "browser", "switch"] as const;
export type AppAction = (typeof APP_ACTIONS)[number];

export type BridgeMessage =
  | { type: "api.result"; id: number; status: number; body: string }
  | { type: "voice.open"; roomId: string; title: string; hasNotified: boolean; notice: string }
  | { type: "app.action"; action: AppAction };

export type ApiMethod = "POST" | "DELETE";

export type ApiAnswer = { status: number; json: unknown };

const ROOM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAXIMUM_TITLE_LENGTH = 120;
const MAXIMUM_NOTICE_LENGTH = 200;
// The app calls only what it needs: the voice rooms API and its own alert registration.
const ALLOWED_PATHS: Record<ApiMethod, RegExp> = {
  POST: /^\/api\/(voice\/[a-z]+|notifications\/devices)$/,
  DELETE: /^\/api\/notifications\/devices$/,
};

export function isAllowedCall(method: ApiMethod, path: string) {
  return ALLOWED_PATHS[method]?.test(path) ?? false;
}

export function isRoomId(value: unknown): value is string {
  return typeof value === "string" && ROOM_ID_PATTERN.test(value);
}

export function parseBridgeMessage(raw: string): BridgeMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const message = parsed as Record<string, unknown>;
  if (message.type === "api.result" && typeof message.id === "number" && typeof message.status === "number" && typeof message.body === "string") {
    return { type: "api.result", id: message.id, status: message.status, body: message.body };
  }
  if (message.type === "voice.open" && isRoomId(message.roomId)) {
    const title = typeof message.title === "string" ? message.title.slice(0, MAXIMUM_TITLE_LENGTH) : "";
    // A page from before these facts sends nothing: the app then learns it from the server's answer, as before.
    const notice = typeof message.notice === "string" ? message.notice.slice(0, MAXIMUM_NOTICE_LENGTH) : "";
    return { type: "voice.open", roomId: message.roomId, title, hasNotified: message.hasNotified === true, notice };
  }
  if (message.type === "app.action" && typeof message.action === "string" && (APP_ACTIONS as readonly string[]).includes(message.action)) {
    return { type: "app.action", action: message.action as AppAction };
  }
  return null;
}

// A message from the web view, read only when the page that sent it is the community's own.
export function readPortalMessage(raw: string, pageUrl: string, origin: string): BridgeMessage | null {
  return isSameOrigin(pageUrl, origin) ? parseBridgeMessage(raw) : null;
}

// Runs in the page before its own scripts (react-native-webview's injectedJavaScriptBeforeContentLoaded).
export function buildBootstrapScript({ platform, pushToken }: { platform: string; pushToken: string | null }) {
  const facts = JSON.stringify({ version: BRIDGE_VERSION, platform, pushToken });
  return `(function () {
  document.documentElement.dataset.app = ${JSON.stringify(APP_MARK)};
  if (window.__commonhallBridge) return true;
  var facts = ${facts};
  function send(message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  window.CommonhallApp = {
    version: facts.version,
    platform: facts.platform,
    pushToken: facts.pushToken,
    appActions: true,
    openRoom: function (roomId, title, facts) { send({ type: "voice.open", roomId: String(roomId), title: String(title || ""), hasNotified: Boolean(facts && facts.hasNotified === true), notice: facts && typeof facts.notice === "string" ? facts.notice : "" }); },
    appAction: function (action) { send({ type: "app.action", action: String(action) }); }
  };
  window.__commonhallBridge = {
    call: function (id, method, path, body) {
      fetch(path, { method: method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body || {}) })
        .then(function (response) { return response.text().then(function (text) { send({ type: "api.result", id: id, status: response.status, body: text }); }); })
        .catch(function () { send({ type: "api.result", id: id, status: 0, body: "" }); });
    }
  };
  window.dispatchEvent(new Event(${JSON.stringify(NATIVE_APP_READY_EVENT)}));
  return true;
})();`;
}

export function buildCallScript(id: number, method: ApiMethod, path: string, body: unknown) {
  return `window.__commonhallBridge && window.__commonhallBridge.call(${id}, ${JSON.stringify(method)}, ${JSON.stringify(path)}, ${JSON.stringify(body ?? {})}); true;`;
}

export function buildPushTokenScript(pushToken: string) {
  return `window.CommonhallApp && (window.CommonhallApp.pushToken = ${JSON.stringify(pushToken)}); true;`;
}

export function buildRoomClosedScript(roomId: string, reason: RoomClosedReason) {
  const detail = JSON.stringify({ roomId, reason });
  return `window.dispatchEvent(new CustomEvent(${JSON.stringify(ROOM_CLOSED_EVENT)}, { detail: ${detail} })); true;`;
}

export function buildNavigateScript(path: string) {
  return `window.location.assign(${JSON.stringify(path)}); true;`;
}

export function toApiAnswer(status: number, body: string): ApiAnswer {
  try {
    return { status, json: body ? JSON.parse(body) : null };
  } catch {
    return { status, json: null };
  }
}

// The server's { code } on a failed call (its RequestError code), or null.
export function readErrorCode(answer: ApiAnswer) {
  const code = answer.json && typeof answer.json === "object" ? (answer.json as { code?: unknown }).code : null;
  return typeof code === "string" ? code : null;
}

// The server's { message } on a failed call, or a plain fallback.
export function readFailureMessage(answer: ApiAnswer, fallback: string) {
  if (answer.status === 0) return "The app lost its connection to your community. Check your connection and try again.";
  if (answer.status === 401) return "You're signed out. Sign in again, then try once more.";
  const message = answer.json && typeof answer.json === "object" ? (answer.json as { message?: unknown }).message : null;
  return typeof message === "string" && message ? message : fallback;
}
