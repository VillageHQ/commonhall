// The app and the portal page talk through the web view. The page's own fetch carries the member's session cookie
// and the site's own origin, so the server's checks stay as they are: no app tokens, no second sign-in.
//   app -> page: `__commonhallBridge.call(id, method, path, body)` runs a fetch in the page.
//   page -> app: JSON messages: the fetch's answer, and "open this voice room".
// The page reads `window.CommonhallApp` (src/platform/native-app/bridge.ts in the web app).

export const BRIDGE_VERSION = 1;
export const NATIVE_APP_READY_EVENT = "commonhall-app-ready";

export type BridgeMessage =
  | { type: "api.result"; id: number; status: number; body: string }
  | { type: "voice.open"; roomId: string; title: string };

export type ApiMethod = "POST" | "DELETE";

export type ApiAnswer = { status: number; json: unknown };

const ROOM_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAXIMUM_TITLE_LENGTH = 120;
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
    return { type: "voice.open", roomId: message.roomId, title };
  }
  return null;
}

// Runs in the page before its own scripts (react-native-webview's injectedJavaScriptBeforeContentLoaded).
export function buildBootstrapScript({ platform, pushToken }: { platform: string; pushToken: string | null }) {
  const facts = JSON.stringify({ version: BRIDGE_VERSION, platform, pushToken });
  return `(function () {
  if (window.__commonhallBridge) return true;
  var facts = ${facts};
  function send(message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  window.CommonhallApp = {
    version: facts.version,
    platform: facts.platform,
    pushToken: facts.pushToken,
    openRoom: function (roomId, title) { send({ type: "voice.open", roomId: String(roomId), title: String(title || "") }); }
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

// The server's { message } on a failed call, or a plain fallback.
export function readFailureMessage(answer: ApiAnswer, fallback: string) {
  if (answer.status === 0) return "The app lost its connection to your community. Check your connection and try again.";
  if (answer.status === 401) return "You're signed out. Sign in again, then try once more.";
  const message = answer.json && typeof answer.json === "object" ? (answer.json as { message?: unknown }).message : null;
  return typeof message === "string" && message ? message : fallback;
}
