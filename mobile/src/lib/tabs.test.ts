import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";

import { isSignedOutPath } from "./links.ts";
import { buildFrameScript, buildGoScript, buildTabsScript, findTabFor, findTabRoot, parseTabsMessage, pickTabsToDrop, readColor, readIcon, readSlideDirection, withStroke } from "./tabs.ts";

const HREFS = ["/rooms", "/today", "/asks", "/people", "/inbox"];
const ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M2 10v3"></path></svg>';

function state(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    type: "tabs.state",
    isFirst: true,
    isShown: true,
    isSheetOpen: false,
    path: "/today",
    tabs: HREFS.map((href) => ({ href, label: href.slice(1), icon: ICON, count: href === "/inbox" ? 3 : 0, isLive: href === "/rooms", badgeLabel: "" })),
    colors: { bar: "rgb(255, 255, 255)", rule: "rgba(0, 0, 0, 0)", active: "oklch(0.2 0 0)", inactive: "#5f5d57" },
    ...overrides,
  });
}

describe("the page's tab messages", () => {
  it("reads the site's bar: its tabs, badges and the colours the app can draw", () => {
    const message = parseTabsMessage(state());
    assert.ok(message && message.type === "tabs.state");
    assert.deepEqual(
      message.tabs.map((tab) => tab.href),
      HREFS,
    );
    assert.equal(message.tabs[4]?.count, 3);
    assert.equal(message.tabs[0]?.isLive, true);
    assert.equal(message.isShown, true);
    // A transparent colour and one React Native can't parse fall back to the app's theme.
    assert.deepEqual(message.colors, { bar: "rgb(255, 255, 255)", inactive: "#5f5d57" });
  });

  it("shows no bar for a page without tabs, and refuses other sites' paths", () => {
    const empty = parseTabsMessage(state({ tabs: [] }));
    assert.equal(empty?.type === "tabs.state" && empty.isShown, false);
    assert.equal(parseTabsMessage(state({ path: "//elsewhere.example" })), null);
    const foreign = parseTabsMessage(state({ tabs: [{ href: "https://elsewhere.example/x", label: "X" }, { href: "/today", label: "Today" }] }));
    assert.deepEqual(
      foreign?.type === "tabs.state" && foreign.tabs.map((tab) => tab.href),
      ["/today"],
    );
    assert.deepEqual(parseTabsMessage(JSON.stringify({ type: "tabs.open", path: "/inbox?show=intros" })), { type: "tabs.open", path: "/inbox?show=intros" });
    assert.equal(parseTabsMessage(JSON.stringify({ type: "tabs.open", path: "https://elsewhere.example" })), null);
    assert.equal(parseTabsMessage("not json"), null);
  });

  it("keeps only plain icons, and sets their stroke", () => {
    assert.equal(readIcon(ICON), ICON);
    assert.equal(readIcon('<svg onload="x()"><path d="M1 1"/></svg>'), "");
    assert.equal(readIcon('<svg><script>x()</script></svg>'), "");
    assert.equal(readIcon('<svg><use href="#a"/></svg>'), "");
    assert.equal(readIcon("<div></div>"), "");
    assert.match(withStroke(ICON, 2), /stroke-width="2"/);
    assert.doesNotMatch(withStroke(ICON, 2), /stroke-width="1.5"/);
    assert.match(withStroke("<svg><path/></svg>", 1.5), /^<svg stroke-width="1.5">/);
  });

  it("reads colours", () => {
    assert.equal(readColor("#fafaf7"), "#fafaf7");
    assert.equal(readColor("rgba(17, 17, 16, 0.5)"), "rgba(17, 17, 16, 0.5)");
    assert.equal(readColor("rgba(0, 0, 0, 0)"), null);
    assert.equal(readColor("color-mix(in srgb, red, blue)"), null);
  });
});

describe("which tab a page belongs to", () => {
  it("puts a page under a tab in that tab, and other pages in none", () => {
    assert.equal(findTabFor("/inbox/abc", HREFS), "/inbox");
    assert.equal(findTabFor("/rooms/3f2c1a9e?join=1", HREFS), "/rooms");
    assert.equal(findTabFor("/inbox?show=intros", HREFS), "/inbox");
    assert.equal(findTabFor("/inboxes", HREFS), null);
    assert.equal(findTabFor("/settings", HREFS), null);
    assert.equal(findTabRoot("/asks", HREFS), "/asks");
    assert.equal(findTabRoot("/asks/abc", HREFS), null);
  });

  it("slides a tab in from its side of the bar", () => {
    assert.equal(readSlideDirection("/today", "/people", HREFS), 1);
    assert.equal(readSlideDirection("/people", "/today", HREFS), -1);
    assert.equal(readSlideDirection(null, "/today", HREFS), 0);
  });

  it("drops the least recently shown tabs past the limit, never the open one", () => {
    assert.deepEqual(pickTabsToDrop([1, 2, 3], 3, 3), []);
    assert.deepEqual(pickTabsToDrop([1, 2, 3, 4], 4, 3), [1]);
    assert.deepEqual(pickTabsToDrop([4, 1, 2, 3, 5], 5, 3), [4, 1]);
  });

  it("knows the signed-out pages", () => {
    assert.equal(isSignedOutPath("/signin?next=/inbox"), true);
    assert.equal(isSignedOutPath("/invite/abc"), true);
    assert.equal(isSignedOutPath("/today"), false);
  });
});

describe("the tab script in the page", () => {
  function fakePage() {
    const attributes = new Map<string, string>();
    const listeners: string[] = [];
    const sent: string[] = [];
    const root = {
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
      hasAttribute: (name: string) => attributes.has(name),
      style: { values: new Map<string, string>(), setProperty(name: string, value: string) { this.values.set(name, value); }, removeProperty(name: string) { this.values.delete(name); } },
    };
    const window: Record<string, unknown> = {
      ReactNativeWebView: { postMessage: (raw: string) => sent.push(raw) },
      addEventListener: (name: string) => listeners.push(name),
      location: { pathname: "/today", search: "", origin: "https://northwind.example.com", assign: () => undefined },
    };
    const document = { documentElement: root, readyState: "complete", head: { appendChild: () => undefined }, createElement: () => ({}), querySelector: () => null, addEventListener: () => undefined, adoptedStyleSheets: [] as unknown[] };
    class CSSStyleSheet {
      replaceSync() {}
    }
    class MutationObserver {
      observe() {}
    }
    const context = { window, document, location: window.location, CSSStyleSheet, MutationObserver, getComputedStyle: () => ({}), setTimeout };
    return { context, attributes, listeners, sent, root, window, document };
  }

  it("marks the page, hides the site's bar, reports at once and catches taps on links to other tabs", () => {
    const page = fakePage();
    runInNewContext(buildTabsScript("/today"), page.context);
    assert.equal(page.attributes.has("data-native-tabs"), true);
    assert.equal(page.document.adoptedStyleSheets.length, 1);
    assert.ok(page.listeners.includes("click"));
    const first = parseTabsMessage(page.sent[0] ?? "");
    assert.equal(first?.type === "tabs.state" && first.isFirst, true);
    assert.equal(first?.type === "tabs.state" && first.isShown, false);
  });

  it("runs again after load without a second set of listeners, and lays the page out around the bar", () => {
    const page = fakePage();
    runInNewContext(buildTabsScript("/today"), page.context);
    runInNewContext(buildTabsScript("/inbox"), page.context);
    assert.equal(page.listeners.filter((name) => name === "click").length, 1);
    runInNewContext(buildFrameScript({ tab: 56, mini: 56 }), page.context);
    assert.equal(page.root.style.values.get("--tab-h"), "56px");
    assert.equal(page.root.style.values.get("--mini"), "56px");
    assert.equal(page.attributes.has("data-mini-player"), true);
    runInNewContext(buildFrameScript({ tab: 0, mini: 0, bottomInset: 24 }), page.context);
    assert.equal(page.attributes.has("data-mini-player"), false);
    assert.equal(page.root.style.values.get("--sab"), "24px");
  });

  it("goes to a page with a plain load where the site's bar has no link to it", () => {
    const page = fakePage();
    const assigned: string[] = [];
    (page.window.location as { assign: (path: string) => void }).assign = (path) => assigned.push(path);
    runInNewContext(buildTabsScript("/today"), page.context);
    runInNewContext(buildGoScript("/today"), page.context);
    assert.deepEqual(assigned, ["/today"]);
  });
});
