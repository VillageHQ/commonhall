// Measures tab-tap-to-paint, page weight, prefetch and scroll smoothness on a local throwaway Commonhall copy.
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
await page.goto(`${BASE}/today`, { waitUntil: "networkidle" });

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
const prefetched = requests
  .filter((r) => r.headers["next-router-prefetch"] || r.headers["rsc"] || /[?&]_rsc=/.test(r.url))
  .map((r) => new URL(r.url).pathname + (r.headers["next-router-prefetch"] ? " (prefetch)" : " (rsc)"));

async function tapTab(label) {
  return page.evaluate(async (label) => {
    const link = [...document.querySelectorAll('nav[data-slot="tab-bar"] a')].find((a) => a.textContent.trim().replace(/\d+$/, "") === label);
    const target = new URL(link.href).pathname;
    const before = document.querySelector("main h1")?.textContent ?? "";
    const tabBar = document.querySelector('nav[data-slot="tab-bar"]');
    return await new Promise((resolve) => {
      let feedback = null;
      let urlAt = null;
      const t0 = performance.now();
      const observer = new MutationObserver(() => {
        const current = [...document.querySelectorAll('nav[data-slot="tab-bar"] a')].find((a) => a.textContent.trim().replace(/\d+$/, "") === label);
        if (feedback === null && current?.getAttribute("aria-current") === "page") feedback = performance.now() - t0;
      });
      observer.observe(tabBar, { attributes: true, subtree: true });
      const check = () => {
        if (urlAt === null && location.pathname === target) urlAt = performance.now() - t0;
        const h1 = document.querySelector("main h1")?.textContent ?? "";
        if (location.pathname === target && h1 && h1 !== before) {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              observer.disconnect();
              const rsc = performance.getEntriesByType("resource").filter((e) => e.name.includes("_rsc=") && new URL(e.name).pathname === target && e.startTime >= t0 - 5).at(-1);
              resolve({ rscWaitMs: rsc ? Math.round(rsc.responseStart - rsc.requestStart) : null, rscKB: rsc ? Math.round(rsc.decodedBodySize / 1024) : null, rscTotalMs: rsc ? Math.round(rsc.responseEnd - rsc.startTime) : null, target, feedbackMs: feedback === null ? null : Math.round(feedback), urlMs: Math.round(urlAt), paintedMs: Math.round(performance.now() - t0), heading: h1.slice(0, 40) });
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
      link.click();
      requestAnimationFrame(check);
    });
  }, label);
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
    const during = requests.slice(before).filter((r) => r.headers["rsc"] && !r.headers["next-router-prefetch"]).map((r) => new URL(r.url).pathname);
    taps.push({ round: round + 1, tab: label, ...result, rscOnTap: during.join(" ") });
    await page.waitForTimeout(600);
  }
}

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

console.log(JSON.stringify({ engine: ENGINE, profile: PROFILE, who: WHO, tabs, cold, prefetched, taps, scroll, css }, null, 2));
await browser.close();
