import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";

import { buildBootstrapScript, buildCallScript, buildRoomClosedScript, isAllowedCall, parseBridgeMessage, readErrorCode, readFailureMessage, readPortalMessage, ROOM_CLOSED_EVENT, toApiAnswer } from "./bridge.ts";
import { checkCommunity, readAddress, type FetchLike } from "./community.ts";
import { opensInPortal, readAlertPath, readJoinLink, toPortalUrl } from "./links.ts";

const ROOM_ID = "3f2c1a9e-8b7d-4c6e-9a1b-2c3d4e5f6a7b";

function fakeFetch(answers: Record<string, { status: number; body: string } | Error>): FetchLike {
  return async (url) => {
    const answer = answers[url];
    if (!answer || answer instanceof Error) throw answer ?? new Error("unreachable");
    return { ok: answer.status < 400, status: answer.status, text: async () => answer.body };
  };
}

describe("the community address", () => {
  it("adds https and keeps an invite link's page", () => {
    assert.deepEqual(readAddress(" northwind.example.com "), { ok: true, origin: "https://northwind.example.com", path: null });
    assert.deepEqual(readAddress("https://northwind.example.com/invite/abc?x=1"), { ok: true, origin: "https://northwind.example.com", path: "/invite/abc?x=1" });
  });

  it("allows plain http only on a local test copy", () => {
    assert.equal(readAddress("http://localhost:9716").ok, true);
    assert.equal(readAddress("http://192.168.1.20:3000").ok, true);
    assert.equal(readAddress("http://northwind.example.com").ok, false);
  });

  it("says plainly what is wrong with a bad address", () => {
    for (const input of ["", "not an address", "northwind", "ftp://northwind.example.com", "https://me:pw@northwind.example.com"]) {
      const result = readAddress(input);
      assert.equal(result.ok, false, input);
      if (!result.ok) assert.ok(result.message.length > 10);
    }
  });
});

describe("checking that an address is a Commonhall server", () => {
  const origin = "https://northwind.example.com";

  it("opens a Commonhall server under its own name", async () => {
    const result = await checkCommunity(
      origin,
      fakeFetch({
        [`${origin}/api/health`]: { status: 200, body: JSON.stringify({ status: "ok", app: "commonhall" }) },
        [`${origin}/manifest.webmanifest`]: { status: 200, body: JSON.stringify({ name: "Northwind Founders" }) },
      }),
    );
    assert.deepEqual(result, { ok: true, community: { origin, name: "Northwind Founders" } });
  });

  it("refuses any other site with a plain error", async () => {
    const result = await checkCommunity(origin, fakeFetch({ [`${origin}/api/health`]: { status: 200, body: "<html>a blog</html>" } }));
    assert.deepEqual(result, { ok: false, message: "northwind.example.com isn't a Commonhall community. Check the address your fund sent you." });
    const otherJson = await checkCommunity(origin, fakeFetch({ [`${origin}/api/health`]: { status: 200, body: JSON.stringify({ status: "ok" }) } }));
    assert.equal(otherJson.ok, false);
  });

  it("tells an unreachable server from a resting one", async () => {
    const unreachable = await checkCommunity(origin, fakeFetch({ [`${origin}/api/health`]: new Error("offline") }));
    assert.equal(unreachable.ok, false);
    if (!unreachable.ok) assert.match(unreachable.message, /couldn't reach/);
    const resting = await checkCommunity(origin, fakeFetch({ [`${origin}/api/health`]: { status: 503, body: JSON.stringify({ status: "unavailable", app: "commonhall" }) } }));
    if (!resting.ok) assert.match(resting.message, /isn't answering/);
  });
});

describe("links inside the app", () => {
  const origin = "https://northwind.example.com";

  it("opens an alert's page on the server that sent it, and nothing else", () => {
    assert.equal(readAlertPath({ url: "/intros/42", kind: "intro" }), "/intros/42");
    assert.equal(readAlertPath({ url: "https://elsewhere.example/x" }), null);
    assert.equal(readAlertPath({ url: "//elsewhere.example/x" }), null);
    assert.equal(readAlertPath(null), null);
    assert.equal(toPortalUrl(origin, "/intros/42"), `${origin}/intros/42`);
    assert.equal(toPortalUrl(origin, "//elsewhere.example"), `${origin}/today`);
  });

  it("opens on Today unless an alert or a link names a page", () => {
    assert.equal(toPortalUrl(origin, null), `${origin}/today`);
    assert.equal(toPortalUrl(origin, "/invite/abc"), `${origin}/invite/abc`);
  });

  it("keeps the community's pages in the web view and sends other sites to the browser", () => {
    assert.equal(opensInPortal(`${origin}/rooms`, origin), true);
    assert.equal(opensInPortal("https://www.linkedin.com/in/someone", origin), false);
    assert.equal(opensInPortal("https://northwind.example.com.evil.example/", origin), false);
  });

  it("reads a join link", () => {
    assert.deepEqual(readJoinLink("commonhall://join?server=northwind.example.com&path=/invite/abc"), { address: "northwind.example.com", path: "/invite/abc" });
    assert.deepEqual(readJoinLink("commonhall://join?server=northwind.example.com&path=https://evil.example"), { address: "northwind.example.com", path: null });
    assert.equal(readJoinLink("https://northwind.example.com/join"), null);
    assert.equal(readJoinLink("commonhall://other?server=x"), null);
  });
});

describe("the bridge between the app and the portal page", () => {
  it("calls only the voice API and its own alert registration", () => {
    assert.equal(isAllowedCall("POST", "/api/voice/join"), true);
    assert.equal(isAllowedCall("POST", "/api/notifications/devices"), true);
    assert.equal(isAllowedCall("DELETE", "/api/notifications/devices"), true);
    assert.equal(isAllowedCall("POST", "/api/admin/invites"), false);
    assert.equal(isAllowedCall("POST", "/api/voice/../admin"), false);
  });

  it("accepts only well-formed messages from the page", () => {
    assert.deepEqual(parseBridgeMessage(JSON.stringify({ type: "voice.open", roomId: ROOM_ID, title: "Pricing AMA", hasNotified: true })), { type: "voice.open", roomId: ROOM_ID, title: "Pricing AMA", hasNotified: true });
    // A page from before the fact, or anything but true, reads as not told yet.
    assert.deepEqual(parseBridgeMessage(JSON.stringify({ type: "voice.open", roomId: ROOM_ID, title: "Pricing AMA" })), { type: "voice.open", roomId: ROOM_ID, title: "Pricing AMA", hasNotified: false });
    assert.equal((parseBridgeMessage(JSON.stringify({ type: "voice.open", roomId: ROOM_ID, hasNotified: "yes" })) as { hasNotified: boolean }).hasNotified, false);
    assert.equal(parseBridgeMessage(JSON.stringify({ type: "voice.open", roomId: "../admin" })), null);
    assert.equal(parseBridgeMessage("not json"), null);
    assert.equal(parseBridgeMessage(JSON.stringify({ type: "api.result", id: "1", status: 200, body: "" })), null);
  });

  it("takes the avatar menu's app actions, only known ones, only from the community's own pages", () => {
    const origin = "https://northwind.example.com";
    for (const action of ["reload", "browser", "switch"]) {
      assert.deepEqual(readPortalMessage(JSON.stringify({ type: "app.action", action }), `${origin}/today`, origin), { type: "app.action", action });
    }
    assert.equal(readPortalMessage(JSON.stringify({ type: "app.action", action: "delete" }), `${origin}/today`, origin), null);
    assert.equal(readPortalMessage(JSON.stringify({ type: "app.action" }), `${origin}/today`, origin), null);
    assert.equal(readPortalMessage(JSON.stringify({ type: "app.action", action: "reload" }), "https://elsewhere.example.com/x", origin), null);
    assert.equal(readPortalMessage(JSON.stringify({ type: "voice.open", roomId: ROOM_ID }), "https://northwind.example.com.evil.example/x", origin), null);
  });

  it("marks every page as inside the app, also when the bootstrap runs again after load", () => {
    const sent: string[] = [];
    const dataset: Record<string, string> = {};
    const window: Record<string, unknown> = { ReactNativeWebView: { postMessage: (text: string) => sent.push(text) }, dispatchEvent: () => true };
    const context = { window, document: { documentElement: { dataset } }, Event: class {} };
    const script = buildBootstrapScript({ platform: "ios", pushToken: null });
    runInNewContext(script, context);
    assert.equal(dataset.app, "commonhall");
    const app = window.CommonhallApp as { appActions: boolean; appAction: (action: string) => void };
    assert.equal(app.appActions, true);
    app.appAction("switch");
    assert.deepEqual(parseBridgeMessage(sent.shift() ?? ""), { type: "app.action", action: "switch" });

    // The load-end re-run on a page whose attribute went missing (or that never got it) sets it again.
    delete dataset.app;
    runInNewContext(script, context);
    assert.equal(dataset.app, "commonhall");
    assert.equal(window.CommonhallApp, app);
  });

  it("runs the page's fetch with its own cookie and sends the answer back", async () => {
    const sent: string[] = [];
    const events: string[] = [];
    const calls: { path: string; init: { method: string; credentials: string; body: string } }[] = [];
    const window: Record<string, unknown> = {
      ReactNativeWebView: { postMessage: (text: string) => sent.push(text) },
      dispatchEvent: (event: { type: string }) => events.push(event.type),
    };
    const context = {
      window,
      document: { documentElement: { dataset: {} } },
      Event: class {
        type: string;
        constructor(type: string) {
          this.type = type;
        }
      },
      fetch: async (path: string, init: { method: string; credentials: string; body: string }) => {
        calls.push({ path, init });
        return { status: 200, text: async () => JSON.stringify({ token: "t" }) };
      },
    };
    runInNewContext(buildBootstrapScript({ platform: "android", pushToken: "ExponentPushToken[abcdefghijkl]" }), context);
    assert.deepEqual(events, ["commonhall-app-ready"]);
    const app = window.CommonhallApp as { pushToken: string; openRoom: (id: string, title: string, facts?: { hasNotified: boolean }) => void };
    assert.equal(app.pushToken, "ExponentPushToken[abcdefghijkl]");

    app.openRoom(ROOM_ID, "Pricing AMA", { hasNotified: true });
    assert.deepEqual(parseBridgeMessage(sent.shift() ?? ""), { type: "voice.open", roomId: ROOM_ID, title: "Pricing AMA", hasNotified: true });
    app.openRoom(ROOM_ID, "Pricing AMA");
    assert.deepEqual(parseBridgeMessage(sent.shift() ?? ""), { type: "voice.open", roomId: ROOM_ID, title: "Pricing AMA", hasNotified: false });

    runInNewContext(buildCallScript(7, "POST", "/api/voice/join", { roomId: ROOM_ID }), context);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(calls[0]?.path, "/api/voice/join");
    assert.equal(calls[0]?.init.credentials, "same-origin");
    assert.deepEqual(JSON.parse(calls[0]?.init.body ?? ""), { roomId: ROOM_ID });
    assert.deepEqual(parseBridgeMessage(sent[0] ?? ""), { type: "api.result", id: 7, status: 200, body: JSON.stringify({ token: "t" }) });
  });

  it("tells the page the room screen closed, and why", () => {
    const events: { type: string; detail: unknown }[] = [];
    const context = {
      window: { dispatchEvent: (event: { type: string; detail: unknown }) => events.push(event) },
      CustomEvent: class {
        type: string;
        detail: unknown;
        constructor(type: string, init: { detail: unknown }) {
          this.type = type;
          this.detail = init.detail;
        }
      },
    };
    runInNewContext(buildRoomClosedScript(ROOM_ID, "left"), context);
    assert.equal(events.length, 1);
    assert.equal(events[0]?.type, ROOM_CLOSED_EVENT);
    assert.deepEqual({ ...(events[0]?.detail as object) }, { roomId: ROOM_ID, reason: "left" });
  });

  it("turns a failed answer into the server's own words", () => {
    assert.equal(readFailureMessage(toApiAnswer(409, JSON.stringify({ code: "voice_room_ended", message: "This room has ended." })), "x"), "This room has ended.");
    assert.equal(readFailureMessage(toApiAnswer(500, "oops"), "Fallback."), "Fallback.");
    assert.equal(readErrorCode(toApiAnswer(409, JSON.stringify({ code: "voice_notified_already", message: "x" }))), "voice_notified_already");
    assert.equal(readErrorCode(toApiAnswer(500, "oops")), null);
    assert.match(readFailureMessage(toApiAnswer(401, ""), "x"), /signed out/);
  });
});
