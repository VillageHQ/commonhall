// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { NATIVE_ROOM_CLOSED_EVENT } from "@/platform/native-app/bridge";

import { LiveRoom } from "./live-room";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {}, push: () => {} }) }));

const ROOM_ID = "5f0c1b9e-4a7d-4c1e-9b2a-1d3e5f7a9c0b";

// The page as loaded in the store app: by a reload, or by a visit (a room card, an alert).
function loadPage(type: "reload" | "navigate") {
  vi.spyOn(window.performance, "getEntriesByType").mockReturnValue([{ type } as unknown as PerformanceEntry]);
  return render(createElement(LiveRoom, { roomId: ROOM_ID, title: "Pricing AMA", hostName: "Maya Chen", isHost: false }));
}

function closeInApp(reason: string) {
  act(() => {
    window.dispatchEvent(new CustomEvent(NATIVE_ROOM_CLOSED_EVENT, { detail: { roomId: ROOM_ID, reason } }));
  });
}

describe("the store app's room page after leaving", () => {
  const openRoom = vi.fn();

  beforeEach(() => {
    openRoom.mockReset();
    window.sessionStorage.clear();
    // jsdom has no matchMedia; the room's header (its More sheet) asks it for the phone or the wide layout.
    window.matchMedia = ((query: string) => ({ matches: false, media: query, addEventListener: () => {}, removeEventListener: () => {} })) as unknown as typeof window.matchMedia;
    (window as unknown as { CommonhallApp: unknown }).CommonhallApp = { version: 4, platform: "ios", openRoom };
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    delete (window as unknown as { CommonhallApp?: unknown }).CommonhallApp;
  });

  it("keeps saying 'You left the room.' on a reload, and Join again opens the room", () => {
    loadPage("navigate");
    expect(openRoom).toHaveBeenCalledTimes(1);
    closeInApp("left");
    expect(screen.getByTestId("room-closed").textContent).toContain("You left the room.");

    // A reload runs no cleanup: the left page's mark is still in the tab when the new page loads.
    const reloaded = within(loadPage("reload").container);
    expect(openRoom).toHaveBeenCalledTimes(1);
    const page = reloaded.getByTestId("room-closed");
    expect(page.dataset.reason).toBe("left");
    expect(page.textContent).toContain("You left the room.");

    fireEvent.click(reloaded.getByRole("button", { name: "Join again" }));
    expect(openRoom).toHaveBeenCalledTimes(2);
    expect(reloaded.getByTestId("room-in-app")).toBeTruthy();
    expect(window.sessionStorage.length).toBe(0);
  });

  it("opens the room again when the member comes back to it, not by a reload", () => {
    const first = loadPage("navigate");
    closeInApp("left");
    // Back to Rooms inside the app: the page goes away and its mark with it.
    first.unmount();
    expect(window.sessionStorage.length).toBe(0);
    loadPage("reload");
    expect(openRoom).toHaveBeenCalledTimes(2);

    // An alert tap loads the page afresh even while a mark is left over.
    window.sessionStorage.setItem(`commonhall-room-left:${ROOM_ID}`, "left");
    cleanup();
    loadPage("navigate");
    expect(openRoom).toHaveBeenCalledTimes(3);
  });

  it("tries again on a reload after the room failed to open", () => {
    loadPage("navigate");
    closeInApp("failed");
    loadPage("reload");
    expect(openRoom).toHaveBeenCalledTimes(2);
  });
});
