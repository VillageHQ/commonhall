import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";

import { buildBootstrapScript, buildCallScript, isAllowedCall, parseBridgeMessage, readFailureMessage, toApiAnswer } from "./bridge.ts";
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
    assert.equal(toPortalUrl(origin, "//elsewhere.example"), `${origin}/`);
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
    assert.deepEqual(parseBridgeMessage(JSON.stringify({ type: "voice.open", roomId: ROOM_ID, title: "Pricing AMA" })), { type: "voice.open", roomId: ROOM_ID, title: "Pricing AMA" });
    assert.equal(parseBridgeMessage(JSON.stringify({ type: "voice.open", roomId: "../admin" })), null);
    assert.equal(parseBridgeMessage("not json"), null);
    assert.equal(parseBridgeMessage(JSON.stringify({ type: "api.result", id: "1", status: 200, body: "" })), null);
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
    const app = window.CommonhallApp as { pushToken: string; openRoom: (id: string, title: string) => void };
    assert.equal(app.pushToken, "ExponentPushToken[abcdefghijkl]");

    app.openRoom(ROOM_ID, "Pricing AMA");
    assert.deepEqual(parseBridgeMessage(sent[0] ?? ""), { type: "voice.open", roomId: ROOM_ID, title: "Pricing AMA" });

    runInNewContext(buildCallScript(7, "POST", "/api/voice/join", { roomId: ROOM_ID }), context);
    await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(calls[0]?.path, "/api/voice/join");
    assert.equal(calls[0]?.init.credentials, "same-origin");
    assert.deepEqual(JSON.parse(calls[0]?.init.body ?? ""), { roomId: ROOM_ID });
    assert.deepEqual(parseBridgeMessage(sent[1] ?? ""), { type: "api.result", id: 7, status: 200, body: JSON.stringify({ token: "t" }) });
  });

  it("turns a failed answer into the server's own words", () => {
    assert.equal(readFailureMessage(toApiAnswer(409, JSON.stringify({ code: "voice_room_ended", message: "This room has ended." })), "x"), "This room has ended.");
    assert.equal(readFailureMessage(toApiAnswer(500, "oops"), "Fallback."), "Fallback.");
    assert.match(readFailureMessage(toApiAnswer(401, ""), "x"), /signed out/);
  });
});
