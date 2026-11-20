// Measures tab-tap-to-paint, page weight, prefetch and scroll smoothness on a local throwaway Commonhall copy.
// The "after" copy (smooth-app Part A): feedbackMs reads data-pressed="true" or aria-current="page", whichever comes
// first; outlineMs is the tap to the tab's outline (or its real heading); cls sums each tap's layout shifts (Chromium
// only); each prefetch is listed; and pages under the tabs are opened to check they show no tab outline.
import { createRequire } from "node:module";
const require = createRequire((process.env.PLAYWRIGHT_DIR ?? process.cwd()) + "/package.json");
const { chromium, webkit, devices } = require("playwright");

const BASE = process.env.BASE ?? "http://localhost:9563";
const ENGINE = process.env.ENGINE ?? "chromium"; // chromium | webkit
const PROFILE = process.env.PROFILE ?? "fast"; // fast | phone (4x CPU, 4G-ish network; chromium only)
const WHO = process.env.WHO ?? "member";
const ROUNDS = Number(process.env.ROUNDS ?? 3);

const browserType = ENGINE === "webkit" ? webkit : chromium;
const browser = await browserType.launch();
const device = devices["iPhone 15"] ?? devices["iPhone 13"];
const context = await browser.newContext(
  ENGINE === "webkit" ? { ...device } : { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: device.userAgent },
);
await context.addInitScript(() => {
  window.__shifts = [];
  window.__shiftsSupported = PerformanceObserver.supportedEntryTypes?.includes("layout-shift") ?? false;
  if (!window.__shiftsSupported) return;
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) window.__shifts.push({ t: entry.startTime, v: entry.value, input: entry.hadRecentInput });
  }).observe({ type: "layout-shift", buffered: true });
});
const page = await context.newPage();

if (ENGINE === "chromium" && PROFILE === "phone") {
  const cdp = await context.newCDPSession(page);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (9 * 1024 * 1024) / 8, uploadThroughput: (3 * 1024 * 1024) / 8 });
}

const requests = [];
page.on("request", (r) => requests.push({ url: r.url(), headers: r.headers() }));

await page.goto(`${BASE}/signin`);
await page.getByRole("button", { name: WHO === "admin" ? /Maya/ : /Sam/ }).click();
await page.waitForURL((u) => !u.pathname.startsWith("/signin"), { timeout: 60000 });
// The tabs are read where the run starts: /today for the member tabs, /admin (START=/admin) for the console's.
await page.goto(`${BASE}${process.env.START ?? "/today"}`, { waitUntil: "networkidle" });

const tabs = await page.$$eval('nav[data-slot="tab-bar"] a', (as) => as.map((a) => ({ label: a.textContent.trim().replace(/\d+$/, ""), href: a.getAttribute("href") })));

const cold = [];
for (const tab of tabs) {
  await page.goto("about:blank");
  const t0 = Date.now();
  await page.goto(`${BASE}${tab.href}`, { waitUntil: "load" });
  const wallLoadMs = Date.now() - t0;
  await page.waitForLoadState("networkidle").catch(() => {});
  const stats = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0];
    const res = performance.getEntriesByType("resource");
    const sum = (list, key) => list.reduce((s, e) => s + (e[key] || 0), 0);
    const scripts = res.filter((e) => e.initiatorType === "script" || /\.js(\?|$)/.test(e.name));
    const fcp = performance.getEntriesByName("first-contentful-paint")[0];
    return {
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      fcp: fcp ? Math.round(fcp.startTime) : null,
      dcl: Math.round(nav.domContentLoadedEventEnd),
      load: Math.round(nav.loadEventEnd),
      htmlKBwire: Math.round((nav.encodedBodySize || 0) / 1024),
      htmlKB: Math.round((nav.decodedBodySize || 0) / 1024),
      requests: res.length + 1,
      jsFiles: scripts.length,
      jsKBwire: Math.round(sum(scripts, "encodedBodySize") / 1024),
      jsKB: Math.round(sum(scripts, "decodedBodySize") / 1024),
      totalKBwire: Math.round((sum(res, "encodedBodySize") + (nav.encodedBodySize || 0)) / 1024),
      domNodes: document.getElementsByTagName("*").length,
    };
  });
  cold.push({ tab: tab.label, href: tab.href, wallLoadMs, ...stats });
}

requests.length = 0;
await page.goto(`${BASE}/today`, { waitUntil: "networkidle" });
await page.waitForTimeout(3000);
const prefetchedRequests = requests.filter((r) => r.headers["next-router-prefetch"] || r.headers["rsc"] || /[?&]_rsc=/.test(r.url));
const prefetched = prefetchedRequests.map((r) => {
  const url = new URL(r.url);
  url.searchParams.delete("_rsc");
  const segment = r.headers["next-router-segment-prefetch"];
  return `${url.pathname}${url.search} (${r.headers["next-router-prefetch"] ? "prefetch" : "rsc"})${segment ? ` [segment ${segment}]` : ""}`;
});
const prefetchPerLink = {};
for (const r of prefetchedRequests) {
  const key = new URL(r.url).pathname;
  prefetchPerLink[key] = (prefetchPerLink[key] ?? 0) + 1;
}

async function tapTab(label) {
  return page.evaluate(async (label) => {
    const findTab = () => [...document.querySelectorAll('nav[data-slot="tab-bar"] a')].find((a) => a.textContent.trim().replace(/\d+$/, "") === label);
    const link = findTab();
    const target = new URL(link.href).pathname;
    const before = document.querySelector("main h1")?.textContent ?? "";
    const tabBar = document.querySelector('nav[data-slot="tab-bar"]');
    const isOutline = () => document.querySelector('main [data-slot="page-outline"]') !== null;
    return await new Promise((resolve) => {
      let feedback = null;
      let feedbackBy = null;
      let urlAt = null;
      let outlineAt = null;
      let outlineSeen = false;
      const t0 = performance.now();
      const readFeedback = () => {
        if (feedback !== null) return;
        const current = findTab();
        if (current?.getAttribute("data-pressed") === "true") feedbackBy = "data-pressed";
        else if (current?.getAttribute("aria-current") === "page") feedbackBy = "aria-current";
        if (feedbackBy) feedback = performance.now() - t0;
      };
      const readOutline = () => {
        if (isOutline()) outlineSeen = true;
        if (outlineAt !== null) return;
        const h1 = document.querySelector("main h1")?.textContent ?? "";
        if (isOutline() || (location.pathname === target && h1 && h1 !== before)) outlineAt = performance.now() - t0;
      };
      const observer = new MutationObserver(() => {
        readFeedback();
        readOutline();
      });
      observer.observe(tabBar, { attributes: true, subtree: true });
      observer.observe(document.querySelector("main"), { childList: true, subtree: true, characterData: true });
      const check = () => {
        readFeedback();
        readOutline();
        if (urlAt === null && location.pathname === target) urlAt = performance.now() - t0;
        const h1 = document.querySelector("main h1")?.textContent ?? "";
        if (location.pathname === target && h1 && h1 !== before && !isOutline()) {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              observer.disconnect();
              const rsc = performance.getEntriesByType("resource").filter((e) => e.name.includes("_rsc=") && new URL(e.name).pathname === target && e.startTime >= t0 - 5).at(-1);
              resolve({
                rscWaitMs: rsc ? Math.round(rsc.responseStart - rsc.requestStart) : null,
                rscKB: rsc ? Math.round(rsc.decodedBodySize / 1024) : null,
                rscTotalMs: rsc ? Math.round(rsc.responseEnd - rsc.startTime) : null,
                target,
                t0,
                feedbackMs: feedback === null ? null : Math.round(feedback),
                feedbackBy,
                outlineMs: outlineAt === null ? null : Math.round(outlineAt),
                outlineSeen,
                urlMs: Math.round(urlAt),
                paintedMs: Math.round(performance.now() - t0),
                heading: h1.slice(0, 40),
              });
            }),
          );
          return;
        }
        if (performance.now() - t0 > 30000) {
          observer.disconnect();
          resolve({ target, timeout: true, heading: h1.slice(0, 40) });
          return;
        }
        requestAnimationFrame(check);
      };
      // A finger: the press, then the click.
      link.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true, pointerType: "touch", isPrimary: true, button: 0 }));
      readFeedback();
      link.click();
      requestAnimationFrame(check);
    });
  }, label);
}

// The layout shifts since a tap (Chromium only; WebKit has no layout-shift entries).
async function readShifts(from) {
  return page.evaluate((from) => {
    if (!window.__shiftsSupported) return null;
    return Math.round(window.__shifts.filter((shift) => shift.t >= from && !shift.input).reduce((sum, shift) => sum + shift.v, 0) * 10000) / 10000;
  }, from);
}

const taps = [];
const order = tabs.map((t) => t.label);
await page.goto(`${BASE}${tabs[0].href}`, { waitUntil: "networkidle" });
for (let round = 0; round < ROUNDS; round++) {
  for (const label of [...order.slice(1), order[0]]) {
    let result;
    const before = requests.length;
    try {
      result = await tapTab(label);
    } catch (error) {
      // A full page load (the plain link) destroys the evaluate context.
      const t0 = Date.now();
      await page.waitForLoadState("load");
      result = { fullLoad: true, error: String(error).slice(0, 80), afterErrorMs: Date.now() - t0 };
    }
    await page.waitForTimeout(600);
    const cls = result.t0 === undefined ? null : await readShifts(result.t0).catch(() => null);
    delete result.t0;
    const during = requests.slice(before).filter((r) => r.headers["rsc"] && !r.headers["next-router-prefetch"]).map((r) => new URL(r.url).pathname);
    taps.push({ round: round + 1, tab: label, ...result, cls, rscOnTap: during.join(" ") });
    await page.waitForTimeout(600);
  }
}

// Pages under the tabs: open one from its list page by tapping a real link, and watch for a tab outline on the way.
async function openSubpage(listPath, selector) {
  await page.goto(`${BASE}${listPath}`, { waitUntil: "networkidle" });
  const href = await page.evaluate((selector) => document.querySelector(selector)?.getAttribute("href") ?? null, selector);
  if (!href) return { missing: true };
  return page.evaluate(
    async ({ selector }) => {
      const link = document.querySelector(selector);
      const target = new URL(link.href).pathname;
      let outlineSeen = false;
      const observer = new MutationObserver(() => {
        if (document.querySelector('main [data-slot="page-outline"]')) outlineSeen = true;
      });
      observer.observe(document.querySelector("main"), { childList: true, subtree: true });
      const t0 = performance.now();
      link.click();
      return await new Promise((resolve) => {
        const check = () => {
          const h1 = document.querySelector("main h1")?.textContent ?? "";
          // Console pages of one area share their heading, so the new page is in once the address has changed and no
          // outline is on screen (a page with no loading.tsx commits with its address).
          if (location.pathname === target && !document.querySelector('main [data-slot="page-outline"]')) {
            setTimeout(() => {
              observer.disconnect();
              resolve({ target, outlineSeen, paintedMs: Math.round(performance.now() - t0), heading: h1.slice(0, 40) });
            }, 300);
            return;
          }
          if (performance.now() - t0 > 20000) {
            observer.disconnect();
            resolve({ target, timeout: true, outlineSeen });
            return;
          }
          requestAnimationFrame(check);
        };
        requestAnimationFrame(check);
      });
    },
    { selector },
  );
}

const SUBPAGES =
  WHO === "admin"
    ? [
        ["/admin/members", 'main nav a[href="/admin/invites"]'],
        ["/admin/members", 'main nav a[href="/admin/import"]'],
        ["/admin/members", 'main nav a[href="/admin/links"]'],
        ["/admin/announcements", 'main nav a[href="/admin/digest"]'],
        ["/admin/members", 'main a[href^="/admin/members/"]'],
      ]
    : [
        ["/rooms", 'main a[href^="/rooms/"]'],
        ["/people", 'main a[href^="/people/"]'],
        ["/asks", 'main a[href^="/asks/"]'],
        ["/inbox", 'main a[href^="/inbox/"]'],
      ];
const subpages = [];
for (const [listPath, selector] of SUBPAGES) subpages.push({ listPath, selector, ...(await openSubpage(listPath, selector)) });

async function scrollFrames(path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "networkidle" });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const frames = page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        let last = performance.now();
        const end = last + 3000;
        const tick = (now) => {
          times.push(now - last);
          last = now;
          if (now < end) requestAnimationFrame(tick);
          else resolve(times);
        };
        requestAnimationFrame(tick);
      }),
  );
  await page.mouse.move(200, 400);
  for (let i = 0; i < 30; i++) {
    if (ENGINE === "webkit") await page.evaluate((dy) => window.scrollBy(0, dy), i < 15 ? 160 : -160);
    else await page.mouse.wheel(0, i < 15 ? 160 : -160);
    await page.waitForTimeout(80);
  }
  const times = (await frames).slice(1);
  const sorted = [...times].sort((a, b) => a - b);
  const pct = (p) => Math.round(sorted[Math.floor(sorted.length * p)] * 10) / 10;
  return { path, pageHeightPx: height, frames: times.length, p50: pct(0.5), p95: pct(0.95), maxMs: Math.round(sorted.at(-1)), over33ms: times.filter((t) => t > 33.4).length };
}
const scroll = [];
for (const path of ["/today", "/people", tabs[0].href]) scroll.push(await scrollFrames(path));

const css = await page.evaluate(() => {
  const read = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const s = getComputedStyle(el);
    return { position: s.position, backdropFilter: s.backdropFilter || s.webkitBackdropFilter, height: s.height };
  };
  const html = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  return {
    topbar: read(".fh-topbar"),
    tabbar: read(".fh-tabbar"),
    htmlOverscroll: html.overscrollBehaviorY,
    bodyOverscroll: body.overscrollBehaviorY,
    touchAction: body.touchAction,
    tapHighlight: body.webkitTapHighlightColor,
    userSelect: body.userSelect || body.webkitUserSelect,
    viewport: document.querySelector("meta[name=viewport]")?.content,
    scroller: document.scrollingElement.tagName,
  };
});

console.log(JSON.stringify({ engine: ENGINE, profile: PROFILE, who: WHO, tabs, cold, prefetchedOnTodayIdle: prefetched.length, prefetchPerLink, prefetched, taps, subpages, scroll, css }, null, 2));
await browser.close();
