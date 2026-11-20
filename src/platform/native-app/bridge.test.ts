import { afterEach, describe, expect, it, vi } from "vitest";

import { NATIVE_ROOM_CLOSED_EVENT, readRoomClosed, subscribeToRoomClosed } from "./bridge";

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
