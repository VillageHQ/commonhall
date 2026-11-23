// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { NATIVE_APP_READY_EVENT } from "@/platform/native-app/bridge";
import { ROUTES } from "@/platform/http/routes";

import { buildShellNavigation } from "./navigation";
import { PhoneAccountButton, SidebarMember } from "./user-menu";

vi.mock("next/navigation", () => ({ usePathname: () => ROUTES.today }));

const MAYA = { id: "maya", name: "Maya Ortiz", email: "maya@example.com", image: null, isAdmin: false };
const APP_ITEMS = ["Reload", "Open in the browser", "Switch community"];

type TestWindow = Window & { CommonhallApp?: unknown };

// What the store app's bootstrap puts in the page (mobile/src/lib/bridge.ts); `appActions` only from smooth-app on.
function putAppInPage({ appActions }: { appActions: boolean }) {
  const appAction = vi.fn();
  (window as TestWindow).CommonhallApp = { version: 1, platform: "ios", pushToken: null, openRoom: vi.fn(), ...(appActions ? { appActions: true, appAction } : {}) };
  return appAction;
}

// The dropdown (from 1000 px, the sidebar's foot); the phone's sheet draws the same group.
async function openMenu() {
  render(createElement(SidebarMember, { member: MAYA, navigation: buildShellNavigation(undefined, false) }));
  fireEvent.keyDown(screen.getByRole("button", { name: "Your menu: Maya Ortiz" }), { key: "ArrowDown" });
  return screen.findByRole("menu");
}

// A phone's width: the Sheet reads it (jsdom has no matchMedia).
async function openSheet() {
  vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }));
  render(createElement(PhoneAccountButton, { member: MAYA, navigation: buildShellNavigation(undefined, false) }));
  fireEvent.click(screen.getByRole("button", { name: "Your menu" }));
  return screen.findByRole("dialog", { name: "Maya Ortiz" });
}

function readItems(menu: HTMLElement) {
  return Array.from(menu.querySelectorAll("[role^='menuitem']"), (item) => item.textContent?.replace(/(On|Off)$/, ""));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  delete (window as TestWindow).CommonhallApp;
});

describe("the avatar menu's This app group", () => {
  it("shows nothing in a browser", async () => {
    const menu = await openMenu();
    expect(within(menu).queryByText("This app")).toBeNull();
    for (const label of APP_ITEMS) expect(within(menu).queryByRole("menuitem", { name: label })).toBeNull();
  });

  it("shows nothing in an app build from before the app actions", async () => {
    putAppInPage({ appActions: false });
    const menu = await openMenu();
    expect(within(menu).queryByText("This app")).toBeNull();
    expect(within(menu).queryByRole("menuitem", { name: "Reload" })).toBeNull();
  });

  it("offers Reload, Open in the browser and Switch community in the app, together, just before Dark mode", async () => {
    putAppInPage({ appActions: true });
    const menu = await openMenu();
    expect(within(menu).getByText("This app")).toBeTruthy();
    const items = readItems(menu);
    const first = items.indexOf("Reload");
    expect(first).toBeGreaterThan(0);
    expect(items.slice(first, first + APP_ITEMS.length + 2)).toEqual([...APP_ITEMS, "Dark mode", "Sign out"]);
  });

  it.each([
    ["Reload", "reload"],
    ["Open in the browser", "browser"],
    ["Switch community", "switch"],
  ])("%s asks the app for %s", async (label, action) => {
    const appAction = putAppInPage({ appActions: true });
    const menu = await openMenu();
    fireEvent.click(within(menu).getByRole("menuitem", { name: label }));
    expect(appAction).toHaveBeenCalledTimes(1);
    expect(appAction).toHaveBeenCalledWith(action);
  });

  it("shows the group when the app arrives after the page (the web preview)", async () => {
    const menu = await openMenu();
    expect(within(menu).queryByRole("menuitem", { name: "Reload" })).toBeNull();
    putAppInPage({ appActions: true });
    act(() => {
      window.dispatchEvent(new Event(NATIVE_APP_READY_EVENT));
    });
    expect(within(menu).getByRole("menuitem", { name: "Reload" })).toBeTruthy();
  });

  it("draws the same group in the phone's sheet, before Dark mode, and a row asks the app", async () => {
    const appAction = putAppInPage({ appActions: true });
    const sheet = await openSheet();
    const rows = Array.from(sheet.querySelectorAll(".fh-menu-row"), (row) => row.textContent?.replace(/(On|Off)$/, ""));
    const first = rows.indexOf("Reload");
    expect(within(sheet).getByRole("heading", { name: "This app" })).toBeTruthy();
    expect(rows.slice(first, first + APP_ITEMS.length + 2)).toEqual([...APP_ITEMS, "Dark mode", "Sign out"]);
    fireEvent.click(within(sheet).getByRole("button", { name: "Reload" }));
    expect(appAction).toHaveBeenCalledWith("reload");
  });
});
