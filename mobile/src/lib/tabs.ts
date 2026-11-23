// The app's own tab bar (ui-polish Part 7, smooth-app Part D): one web view per tab, kept alive, under a native bar.
// The bar copies the site's own member tab bar, which stays in every page (hidden in the app): its tabs, labels,
// icons, badges and colours are read from the page, so the two never differ and a module that is switched off has no
// tab. The page's side is a script the app runs in every page (`buildTabsScript`), next to the bridge's bootstrap.
//   page -> app: `tabs.state` (the site's bar as it would show now, the path, whether a sheet is open) and
//   `tabs.open` (a link to another tab's page was tapped: that tab opens it).
//   app -> page: `window.__commonhallTabs` (the bar's height for the page's layout, scroll to the top, go to a page).
// A page without the site's member bar (signed out, the admin's console) gets no native bar; the console keeps its
// own tabs in the page.

import { toSafePath } from "./links.ts";

// The member tabs before a page has said which it has (Rooms · Today · Asks · People · Inbox).
export const DEFAULT_TAB_PATHS = ["/rooms", "/today", "/asks", "/people", "/inbox"] as const;
export const HOME_TAB_PATH = "/today";

// Visible height of the bar (Part 2's contract: 56 px, plus the home indicator's inset under it).
export const TAB_BAR_HEIGHT = 56;
// A low-memory Android phone keeps fewer tabs alive; a dropped tab loads again when it is next opened.
export const LOW_MEMORY_BYTES = 3 * 1024 ** 3;
// Once the open tab has loaded and this long has passed, the next tab loads behind it (one at a time), so a first tap
// on it is instant. Not on a low-memory Android phone, which keeps fewer tabs alive.
export const PRELOAD_DELAY_MS = 1200;
export const MAXIMUM_LIVE_TABS = 5;
export const LOW_MEMORY_LIVE_TABS = 3;

const MAXIMUM_TABS = 8;
const MAXIMUM_LABEL_LENGTH = 40;
const MAXIMUM_ICON_LENGTH = 6000;
const MAXIMUM_PATH_LENGTH = 2000;

export type PageTab = { href: string; label: string; icon: string; count: number; isLive: boolean; badgeLabel: string };

// The site's bar colours as the page computes them (light, dark, the community's colour), and the page's own paper
// (a tab's first load is drawn on it); missing ones fall back to the app's theme.
export const COLOR_KEYS = ["bar", "rule", "active", "inactive", "badge", "badgeText", "live", "paper"] as const;
export type PageColors = Partial<Record<(typeof COLOR_KEYS)[number], string>>;

// The community's name (and its small line) in the page's top bar: a tab that is loading for the first time shows the
// bar with them, instead of bare paper.
export type PageBrand = { name: string; sub: string };

// `isOverlayOpen`: a sheet, a menu or a dialog of the page is open (it covers the page down to its bottom edge, so the
// bar steps aside). `isDark`: the site's own dark mode (its `dark` class), which every tab follows.
export type TabsState = { type: "tabs.state"; isFirst: boolean; isShown: boolean; isOverlayOpen: boolean; isDark: boolean; path: string; tabs: PageTab[]; colors: PageColors; brand: PageBrand | null };
export type TabsOpen = { type: "tabs.open"; path: string };
export type TabsMessage = TabsState | TabsOpen;

// What the page lays out around: the bar's visible height (0 while the keyboard covers it), the docked slot above it
// (Part 6's mini player), and on Android the bottom inset (its web view may not report it).
export type PageFrame = { tab: number; mini: number; bottomInset?: number };

function readText(value: unknown, maximum: number) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

// A colour React Native draws as is: #hex or rgb()/rgba(), never a fully transparent one.
export function readColor(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const color = value.trim();
  if (/^#[0-9a-f]{3,8}$/i.test(color)) return color;
  const rgb = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(color);
  if (!rgb) return null;
  const alpha = rgb[4];
  if (alpha !== undefined && parseFloat(alpha) === 0) return null;
  return color;
}

// The tab's icon is the site's own inline SVG (Lucide). Drawn natively, so only plain shapes are kept.
export function readIcon(value: unknown): string {
  if (typeof value !== "string" || value.length > MAXIMUM_ICON_LENGTH) return "";
  const icon = value.trim();
  if (!/^<svg[\s>]/i.test(icon) || !/<\/svg>$/i.test(icon)) return "";
  if (/<(script|foreignObject|image|use|style|a)[\s>/]|\son[a-z]+\s*=|href\s*=|javascript:/i.test(icon)) return "";
  return icon;
}

// The icon with the stroke the bar wants (2 for the open tab, 1.5 for the others), drawn in `color` (currentColor).
export function withStroke(icon: string, strokeWidth: number) {
  if (!icon) return icon;
  const stroke = `stroke-width="${strokeWidth}"`;
  if (/\sstroke-width="[^"]*"/.test(icon)) return icon.replace(/(<svg[^>]*?)\sstroke-width="[^"]*"/i, `$1 ${stroke}`);
  return icon.replace(/^<svg/i, `<svg ${stroke}`);
}

function readTab(value: unknown): PageTab | null {
  if (!value || typeof value !== "object") return null;
  const tab = value as Record<string, unknown>;
  const href = toSafePath(tab.href);
  if (!href || href.length > MAXIMUM_PATH_LENGTH) return null;
  const count = typeof tab.count === "number" && Number.isFinite(tab.count) ? Math.max(0, Math.min(999, Math.floor(tab.count))) : 0;
  return { href, label: readText(tab.label, MAXIMUM_LABEL_LENGTH), icon: readIcon(tab.icon), count, isLive: tab.isLive === true, badgeLabel: readText(tab.badgeLabel, 80) };
}

function readBrand(value: unknown): PageBrand | null {
  if (!value || typeof value !== "object") return null;
  const brand = value as Record<string, unknown>;
  const name = readText(brand.name, MAXIMUM_LABEL_LENGTH * 2);
  return name ? { name, sub: readText(brand.sub, MAXIMUM_LABEL_LENGTH * 2) } : null;
}

export function parseTabsMessage(raw: string): TabsMessage | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const message = parsed as Record<string, unknown>;
  if (message.type === "tabs.open") {
    const path = toSafePath(message.path);
    return path && path.length <= MAXIMUM_PATH_LENGTH ? { type: "tabs.open", path } : null;
  }
  if (message.type !== "tabs.state") return null;
  const path = toSafePath(message.path);
  if (!path || !Array.isArray(message.tabs)) return null;
  const tabs = message.tabs.slice(0, MAXIMUM_TABS).map(readTab).filter((tab): tab is PageTab => tab !== null);
  const colors: PageColors = {};
  const sent = message.colors && typeof message.colors === "object" ? (message.colors as Record<string, unknown>) : {};
  for (const key of COLOR_KEYS) {
    const color = readColor(sent[key]);
    if (color) colors[key] = color;
  }
  return { type: "tabs.state", isFirst: message.isFirst === true, isShown: message.isShown === true && tabs.length > 0, isOverlayOpen: message.isOverlayOpen === true, isDark: message.isDark === true, path, tabs, colors, brand: readBrand(message.brand) };
}

function readPathname(path: string) {
  return path.split(/[?#]/)[0] ?? path;
}

// The tab a path belongs to: its own page or a page under it (/inbox/abc is Inbox's). Other paths have no tab.
export function findTabFor(path: string | null, hrefs: readonly string[]): string | null {
  if (!path) return null;
  const pathname = readPathname(path);
  return hrefs.find((href) => pathname === href || pathname.startsWith(`${href}/`)) ?? null;
}

// The tab whose own first page this is (exactly /asks, not /asks/abc).
export function findTabRoot(path: string | null, hrefs: readonly string[]): string | null {
  if (!path) return null;
  const pathname = readPathname(path);
  return hrefs.find((href) => pathname === href) ?? null;
}

// Which live tabs to drop when one more opens: the least recently shown ones past the limit, never the open one.
// `recent` lists view ids, the most recently shown last.
export function pickTabsToDrop(recent: readonly number[], activeId: number, limit: number): number[] {
  const others = recent.filter((id) => id !== activeId);
  const overflow = others.length + 1 - limit;
  return overflow > 0 ? others.slice(0, overflow) : [];
}

// The next tab to load behind the open one: the first of the bar's tabs that isn't alive and wasn't tried already.
export function pickTabToPreload(hrefs: readonly string[], aliveHomes: readonly string[], tried: ReadonlySet<string>): string | null {
  return hrefs.find((href) => !aliveHomes.includes(href) && !tried.has(href)) ?? null;
}

// The direction a tab slides in from: from the right when it sits to the right of the one that was open.
export function readSlideDirection(fromHref: string | null, toHref: string, hrefs: readonly string[]): -1 | 0 | 1 {
  const from = fromHref ? hrefs.indexOf(fromHref) : -1;
  const to = hrefs.indexOf(toHref);
  if (from < 0 || to < 0 || from === to) return 0;
  return to > from ? 1 : -1;
}

// What the hidden site bar looks like to the script: the member bar is the one whose tabs don't go to the console.
const MEMBER_BAR = '[data-slot="tab-bar"]:not(:has(a[href^="/admin"]))';
// The app draws the bar, so the page keeps the site's bar for its layout and its badges but never shows it. It stays
// in the layout (visibility, not display), so the site's own rules that remove it (a pushed screen, a takeover, the
// web's width) still tell the app when to hide its bar.
// What covers the page while open: the round's Sheet (html[data-sheet-open]) and Radix's menus and dialogs.
const OVERLAYS = ["menu", "dialog", "alertdialog", "listbox"].map((role) => `[role="${role}"][data-state="open"]`).join(",");
// The community's mark in the phone's top bar (its name in <b>, its small line in <small>).
const TOP_BAR_MARK = '[data-slot="phone-top-bar"] .fh-fundmark';
const HIDE_SITE_BAR_CSS = `html[data-native-tabs] ${MEMBER_BAR}{visibility:hidden!important;opacity:0!important;pointer-events:none!important}`;

// Runs in every page of the portal before its own scripts, and again when it has loaded (guarded: a second run only
// updates the tab it belongs to and reports). `home` is the tab this web view shows.
export function buildTabsScript(home: string) {
  return `(function () {
  var root = document.documentElement;
  root.setAttribute("data-native-tabs", "");
  if (window.__commonhallTabs) { window.__commonhallTabs.home(${JSON.stringify(home)}); window.__commonhallTabs.report(true); return true; }
  var MEMBER_BAR = ${JSON.stringify(MEMBER_BAR)};
  var OVERLAYS = ${JSON.stringify(OVERLAYS)};
  var TOP_BAR_MARK = ${JSON.stringify(TOP_BAR_MARK)};
  var CSS = ${JSON.stringify(HIDE_SITE_BAR_CSS)};
  var home = ${JSON.stringify(home)};
  var last = "";
  var isQueued = false;
  var isFirst = true;
  var isGoing = false;
  function send(raw) {
    if (window.__commonhallTabsSend) window.__commonhallTabsSend(raw);
    else if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(raw);
  }
  try {
    var sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    document.adoptedStyleSheets = document.adoptedStyleSheets.concat([sheet]);
  } catch (error) {
    var addStyle = function () { var style = document.createElement("style"); style.textContent = CSS; document.head.appendChild(style); };
    if (document.head) addStyle(); else document.addEventListener("DOMContentLoaded", addStyle);
  }
  function memberBar() { return document.querySelector(MEMBER_BAR); }
  function tabLinks(bar) { return bar ? Array.prototype.slice.call(bar.querySelectorAll("a[href]")) : []; }
  function colorOf(element, property) { return element ? getComputedStyle(element)[property] : ""; }
  function read() {
    var bar = memberBar();
    var links = tabLinks(bar);
    var isShown = false;
    var colors = {};
    var current = null;
    var tabs = links.map(function (link) {
      var label = link.querySelector("span:not([role])");
      var badge = link.querySelector('[role="img"]');
      var icon = link.querySelector("svg");
      var isLive = Boolean(badge && badge.getAttribute("data-slot") === "live-dot");
      if (link.getAttribute("aria-current") === "page") current = link;
      return { href: link.getAttribute("href"), label: label ? label.textContent : "", icon: icon ? icon.outerHTML : "", count: badge && !isLive ? Number(badge.textContent) || 0 : 0, isLive: isLive, badgeLabel: badge ? badge.getAttribute("aria-label") || "" : "" };
    });
    if (bar) {
      var style = getComputedStyle(bar);
      isShown = style.display !== "none" && bar.getClientRects().length > 0;
      var other = links.filter(function (link) { return link !== current; })[0];
      var count = bar.querySelector(".fh-badge");
      var dot = bar.querySelector('[data-slot="live-dot"]');
      colors = { bar: style.backgroundColor, rule: style.borderTopColor, active: colorOf(current, "color"), inactive: colorOf(other, "color"), badge: colorOf(count, "backgroundColor"), badgeText: colorOf(count, "color"), live: colorOf(dot, "backgroundColor"), paper: colorOf(document.body, "backgroundColor") };
    }
    var isOverlayOpen = root.hasAttribute("data-sheet-open") || Boolean(document.querySelector(OVERLAYS));
    var mark = document.querySelector(TOP_BAR_MARK);
    var markName = mark ? mark.querySelector("b") : null;
    var markSub = mark ? mark.querySelector("small") : null;
    var brand = markName ? { name: markName.textContent || "", sub: markSub ? markSub.textContent || "" : "" } : null;
    return { type: "tabs.state", isShown: isShown, isOverlayOpen: isOverlayOpen, isDark: root.classList.contains("dark"), path: location.pathname + location.search, tabs: tabs, colors: colors, brand: brand };
  }
  function report(force) {
    var state = read();
    var raw = JSON.stringify(state);
    if (!force && raw === last) return;
    last = raw;
    state.isFirst = isFirst;
    isFirst = false;
    send(JSON.stringify(state));
  }
  function schedule() {
    if (isQueued) return;
    isQueued = true;
    setTimeout(function () { isQueued = false; report(false); }, 40);
  }
  function start() {
    new MutationObserver(schedule).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ["aria-current", "data-sheet-open", "data-state", "class", "hidden"] });
    report(true);
  }
  window.addEventListener("resize", schedule);
  window.addEventListener("popstate", schedule);
  window.addEventListener("click", function (event) {
    if (isGoing || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
    var url;
    try { url = new URL(link.href, location.href); } catch (error) { return; }
    if (url.origin !== location.origin || url.pathname === home) return;
    var isTab = tabLinks(memberBar()).some(function (tab) { return tab.getAttribute("href") === url.pathname; });
    if (!isTab) return;
    event.preventDefault();
    event.stopPropagation();
    send(JSON.stringify({ type: "tabs.open", path: url.pathname + url.search + url.hash }));
  }, true);
  window.__commonhallTabs = {
    home: function (next) { home = String(next); },
    report: report,
    frame: function (frame) {
      var style = root.style;
      style.setProperty("--tab-h", frame.tab + "px");
      if (frame.mini > 0) { root.setAttribute("data-mini-player", ""); style.setProperty("--mini", frame.mini + "px"); }
      else { root.removeAttribute("data-mini-player"); style.removeProperty("--mini"); }
      if (typeof frame.bottomInset === "number") style.setProperty("--sab", frame.bottomInset + "px");
    },
    top: function () {
      var isReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top: 0, behavior: isReduced ? "auto" : "smooth" });
    },
    // Dark mode turned on or off in another tab: the site's own hook follows its class (the cookie is shared already).
    dark: function (isDark) { root.classList.toggle("dark", Boolean(isDark)); },
    go: function (path) {
      var link = tabLinks(memberBar()).filter(function (tab) { return tab.getAttribute("href") === path; })[0];
      if (!link) { location.assign(path); return; }
      isGoing = true;
      try { link.click(); } finally { isGoing = false; }
    }
  };
  // The first report goes out only once the app can answer it (the frame comes back at once in the web preview).
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start); else start();
  return true;
})();`;
}

function callTabs(body: string) {
  return `window.__commonhallTabs && ${body}; true;`;
}

export function buildFrameScript(frame: PageFrame) {
  return callTabs(`window.__commonhallTabs.frame(${JSON.stringify(frame)})`);
}

export function buildHomeScript(home: string) {
  return callTabs(`window.__commonhallTabs.home(${JSON.stringify(home)})`);
}

export function buildReportScript() {
  return callTabs("window.__commonhallTabs.report(true)");
}

export function buildDarkScript(isDark: boolean) {
  return callTabs(`window.__commonhallTabs.dark(${isDark ? "true" : "false"})`);
}

export function buildScrollTopScript() {
  return callTabs("window.__commonhallTabs.top()");
}

// A tab's own page through the site's own link (a client-side move, no reload); any other page loads.
export function buildGoScript(path: string) {
  const safePath = toSafePath(path) ?? HOME_TAB_PATH;
  return `(window.__commonhallTabs ? window.__commonhallTabs.go(${JSON.stringify(safePath)}) : window.location.assign(${JSON.stringify(safePath)})); true;`;
}
