import { afterEach, describe, expect, it, vi } from "vitest";

import { hasAppActions, isNativeAppUserAgent, NATIVE_NAVIGATE_EVENT, NATIVE_ROOM_CLOSED_EVENT, readNativeApp, readNavigatePath, readRoomClosed, runAppAction, subscribeToRoomClosed } from "./bridge";
import { toViewport } from "./viewport";

const ROOM_ID = "5f0c1b9e-4a7d-4c1e-9b2a-1d3e5f7a9c0b";
const OTHER_ROOM_ID = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

function closed(detail: unknown) {
  return new CustomEvent(NATIVE_ROOM_CLOSED_EVENT, { detail });
}

describe("the store app's 'room closed' event", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("reads a room and a known reason, and nothing else", () => {
    expect(readRoomClosed(closed({ roomId: ROOM_ID, reason: "left" }))).toEqual({ roomId: ROOM_ID, reason: "left" });
    expect(readRoomClosed(closed({ roomId: ROOM_ID, reason: "ended" }))).toEqual({ roomId: ROOM_ID, reason: "ended" });
    expect(readRoomClosed(closed({ roomId: ROOM_ID, reason: "gone" }))).toBeNull();
    expect(readRoomClosed(closed({ roomId: 7, reason: "left" }))).toBeNull();
    expect(readRoomClosed(closed(null))).toBeNull();
    expect(readRoomClosed(new Event(NATIVE_ROOM_CLOSED_EVENT))).toBeNull();
  });

  it("calls back only for this page's room, until unsubscribed", () => {
    vi.stubGlobal("window", new EventTarget());
    const reasons: string[] = [];
    const unsubscribe = subscribeToRoomClosed(ROOM_ID, (reason) => reasons.push(reason));
    window.dispatchEvent(closed({ roomId: OTHER_ROOM_ID, reason: "left" }));
    window.dispatchEvent(closed({ roomId: ROOM_ID, reason: "left" }));
    unsubscribe();
    window.dispatchEvent(closed({ roomId: ROOM_ID, reason: "ended" }));
    expect(reasons).toEqual(["left"]);
  });
});

describe("the store app's own actions and pages", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("offers Reload, Open in the browser and Switch community only to an app that takes them", () => {
    const openRoom = () => {};
    vi.stubGlobal("window", { CommonhallApp: { version: 1, platform: "ios", openRoom } });
    expect(readNativeApp()?.appAction).toBeNull();
    expect(hasAppActions()).toBe(false);

    const asked: string[] = [];
    vi.stubGlobal("window", { CommonhallApp: { version: 1, platform: "ios", openRoom, appActions: true, appAction: (action: string) => asked.push(action) } });
    expect(hasAppActions()).toBe(true);
    runAppAction("switch");
    expect(asked).toEqual(["switch"]);

    vi.stubGlobal("window", {});
    expect(hasAppActions()).toBe(false);
    expect(() => runAppAction("reload")).not.toThrow();
  });

  it("lets only the app's pages draw under the status bar", () => {
    const appAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CommonhallApp/1";
    const safari = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
    expect(isNativeAppUserAgent(appAgent)).toBe(true);
    expect(toViewport(appAgent).viewportFit).toBe("cover");
    for (const agent of [safari, null, undefined, ""]) {
      expect(isNativeAppUserAgent(agent)).toBe(false);
      expect(toViewport(agent)).toEqual({ width: "device-width", initialScale: 1 });
    }
  });
});

describe("the store app's 'move to a path' event", () => {
  function navigate(detail: unknown) {
    return new CustomEvent(NATIVE_NAVIGATE_EVENT, { detail });
  }

  it("takes only this site's own paths", () => {
    expect(readNavigatePath(navigate({ path: "/inbox/abc?x=1" }))).toBe("/inbox/abc?x=1");
    expect(readNavigatePath(navigate({ path: "//evil.example/x" }))).toBeNull();
    expect(readNavigatePath(navigate({ path: "/\\evil.example" }))).toBeNull();
    expect(readNavigatePath(navigate({ path: "https://evil.example/" }))).toBeNull();
    expect(readNavigatePath(navigate({ path: 7 }))).toBeNull();
    expect(readNavigatePath(navigate(null))).toBeNull();
  });
});
