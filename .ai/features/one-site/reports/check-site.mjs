// Usage: node check-site.mjs [site dir] [out dir] [chrome.exe]
//   defaults: site/ and .ai/features/common-hall-v2/reports/ under the repo root, and Playwright's own Chromium.
// Needs playwright-core: from a folder that has it installed, or the global npm install.
// Serves site/ on a local port and opens it at 320, 390 and 1280 px in the light and the dark theme (forced with
// ?theme=). With motion on it moves the pointer over the first screen, scrolls the whole page and back, and fails on
// outside requests, console errors, failed requests, horizontal overflow, a missing anchor or text under 4.5:1
// contrast. It then shoots each width full page with reduced motion (the door field drawn once, closed, and still when
// the pointer moves) and prints the page.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

async function loadChromium() {
  try {
    return (await import("playwright-core")).chromium;
  } catch {
    const require = createRequire(join(process.env.APPDATA || join(process.env.HOME || "", ".npm-global"), "npm/node_modules/"));
    return require("playwright-core").chromium;
  }
}
const chromium = await loadChromium();

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const [siteDir = join(repo, "site"), outDir = join(repo, ".ai/features/common-hall-v2/reports"), exe] = process.argv.slice(2);
const PORT = 55571;
const ORIGIN = `http://127.0.0.1:${PORT}/`;
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".txt": "text/plain" };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = resolve(siteDir, "." + (path.endsWith("/") ? path + "index.html" : path));
  try { const body = await readFile(file); res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const browser = await chromium.launch(exe ? { executablePath: exe } : {});
const requests = new Set(); const problems = [];

function watch(page, tag) {
  page.on("request", (r) => requests.add(r.url()));
  page.on("console", (m) => { if (m.type() === "error") problems.push(`${tag}: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`${tag}: ${e.message}`));
  page.on("response", (r) => { if (r.status() >= 400) problems.push(`${tag}: ${r.status()} ${r.url()}`); });
}
const overflowOf = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
// Text contrast: every element with its own text, its colour against the first opaque background above it.
const contrastOf = (page) => page.evaluate(() => {
  const parse = (c) => { const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return null; const [r, g, b, a = 1] = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return { r, g, b, a }; };
  const lum = ({ r, g, b }) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const bgOf = (el) => { for (let e = el; e; e = e.parentElement) { const c = parse(getComputedStyle(e).backgroundColor); if (c && c.a > 0.95) return c; } return { r: 255, g: 255, b: 255, a: 1 }; };
  const bad = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!el.childNodes.length || ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || el.closest(".sr, .honeypot, [hidden], dialog:not([open]), .tip") || el.closest("svg")) continue;
    const fg = parse(cs.color); const bg = bgOf(el);
    if (!fg) continue;
    const mixed = { r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a) };
    const l1 = lum(mixed), l2 = lum(bg); const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const need = 4.5;
    if (ratio < need) bad.push(`${el.tagName.toLowerCase()}.${el.className} "${el.textContent.trim().slice(0, 30)}" ${ratio.toFixed(2)}`);
  }
  return bad;
});

for (const scheme of ["light", "dark"]) for (const width of [320, 390, 1280]) {
  const tag = `${scheme} ${width}`;
  const url = `${ORIGIN}?theme=${scheme}`;
  // 1. motion on: the pointer over the first screen, then the whole page scrolled down and back up
  const page = await browser.newPage({ viewport: { width, height: width < 900 ? 844 : 800 }, colorScheme: scheme, deviceScaleFactor: 1 });
  watch(page, tag);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  for (let i = 0; i < 12; i++) { await page.mouse.move(60 + i * (width / 14), 120 + (i % 4) * 90); await page.waitForTimeout(60); }
  await page.waitForTimeout(1800);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += 400) { await page.mouse.wheel(0, 400); await page.waitForTimeout(60); }
  await page.waitForTimeout(500);
  let overflow = await overflowOf(page);
  if (overflow > 0) problems.push(`${tag}: page is ${overflow}px wider than the screen (motion)`);
  const theme = await page.evaluate(() => document.documentElement.dataset.theme);
  if (theme !== scheme) problems.push(`${tag}: ?theme=${scheme} gave ${theme}`);
  const low = await contrastOf(page);
  if (low.length) problems.push(`${tag}: text under 4.5:1: ${low.slice(0, 6).join("; ")}`);
  if (width === 390 && scheme === "light") {
    const anchors = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')].map((a) => a.getAttribute("href")).filter((h) => h.length > 1 && !document.getElementById(h.slice(1))));
    if (anchors.length) problems.push("missing anchors: " + anchors.join(", "));
  }
  await page.close();
  // 2. reduced motion: nothing moves, shot full page
  const still = await browser.newPage({ viewport: { width, height: width < 900 ? 844 : 800 }, colorScheme: scheme, reducedMotion: "reduce", deviceScaleFactor: 1 });
  watch(still, `${tag} reduced`);
  await still.goto(url, { waitUntil: "networkidle" });
  await still.evaluate(() => document.fonts.ready);
  const h2 = await still.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= h2; y += 500) { await still.evaluate((v) => scrollTo(0, v), y); await still.waitForTimeout(80); }
  await still.evaluate(() => scrollTo(0, 0));
  overflow = await overflowOf(still);
  if (overflow > 0) problems.push(`${tag}: page is ${overflow}px wider than the screen (reduced motion)`);
  // the door field is drawn once with every door closed, and the pointer changes nothing (no listeners)
  const snap = () => still.evaluate(() => { const c = document.getElementById("field"); return getComputedStyle(c).display === "none" ? null : c.toDataURL(); });
  const before = await snap();
  if (!before) problems.push(`${tag}: the door field is not drawn under reduced motion`);
  for (let i = 0; i < 8; i++) { await still.mouse.move(80 + i * (width / 10), 160 + (i % 3) * 80); await still.waitForTimeout(50); }
  await still.waitForTimeout(600);
  if (before && (await snap()) !== before) problems.push(`${tag}: the door field moved under reduced motion`);
  await still.screenshot({ path: join(outDir, `site-${width}-${scheme}.png`), fullPage: true });
  await still.close();
}
const outside = [...requests].filter((u) => !u.startsWith(ORIGIN));
console.log("requests:", requests.size, "outside this site:", outside.length ? outside : "none");
console.log("problems:", problems.length ? problems : "none");
if (outside.length || problems.length) process.exitCode = 1;
{
  const p = await browser.newPage(); await p.goto(ORIGIN, { waitUntil: "networkidle" }); await p.emulateMedia({ media: "print" });
  const printed = await p.evaluate(() => ({ skip: getComputedStyle(document.querySelector(".skip-link")).display, field: getComputedStyle(document.getElementById("field")).display }));
  await p.pdf({ path: join(outDir, "print-check.pdf") }); console.log("print:", printed);
}
await browser.close(); server.close();
