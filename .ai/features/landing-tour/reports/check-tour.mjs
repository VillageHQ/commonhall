// Usage: node .ai/features/landing-tour/reports/check-tour.mjs [out dir]
// Serves site/ and checks the live tour in Chromium (playwright-core, local or the global npm install):
// - 1280 x 800, light and dark: the scroll picks each step (screenshot each), the pinned stage's centre vs the window's (up and down, and sideways),
//   Pause stops the pointer, a tab click jumps there.
// - 390 x 844: the tour plays on a timer (screenshots), no sideways overflow.
// - reduced motion: nothing moves; a tab click changes the still.
// - JavaScript off: the still of step 1 shows.
// Fails on console errors, page errors, failed requests and any request to another site.
import { createServer } from "node:http";
import { mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

async function loadChromium() {
  try {
    return (await import("playwright-core")).chromium;
  } catch {
    const require = createRequire(join(process.env.APPDATA || "", "npm/node_modules/"));
    return require("playwright-core").chromium;
  }
}
const chromium = await loadChromium();
const repo = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const siteDir = join(repo, "site");
const outDir = process.argv[2] ?? dirname(fileURLToPath(import.meta.url));
await mkdir(outDir, { recursive: true });
const PORT = 55581;
const ORIGIN = `http://127.0.0.1:${PORT}/`;
const TYPES = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".txt": "text/plain" };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const file = resolve(siteDir, "." + (path.endsWith("/") ? path + "index.html" : path));
  try {
    const body = await readFile(file);
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const browser = await chromium.launch();
const problems = [];
const results = [];
const shots = process.env.SHOTS !== "0";

function watch(page, tag) {
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") problems.push(`${tag} console ${m.type()}: ${m.text()}`); });
  page.on("pageerror", (e) => problems.push(`${tag} page error: ${e.message}`));
  page.on("requestfailed", (r) => problems.push(`${tag} failed request: ${r.url()}`));
  page.on("request", (r) => { if (!r.url().startsWith(ORIGIN) && !r.url().startsWith("data:")) problems.push(`${tag} outside request: ${r.url()}`); });
  page.on("response", (r) => { if (r.status() >= 400) problems.push(`${tag} ${r.status()}: ${r.url()}`); });
}

async function shot(page, name) {
  if (!shots) return;
  const stage = page.locator(".demo-stage");
  await stage.screenshot({ path: join(outDir, `${name}.png`) });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readStep = (page) => page.evaluate(() => [...document.querySelectorAll(".demo-tab")].findIndex((t) => t.classList.contains("is-on")));
const readScreenText = (page) => page.evaluate(() => document.getElementById("tour-screen").shadowRoot.querySelector(".tour-mount").innerText.slice(0, 160).replace(/\s+/g, " "));

// ---------- desktop, scroll-driven ----------
for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  const tag = `1280-${theme}`;
  watch(page, tag);
  await page.goto(`${ORIGIN}?theme=${theme}`, { waitUntil: "networkidle" });
  if (theme === "light") {
    // Step 1 waits for the visitor: after 12 s at the top of the page it has not played yet.
    await sleep(12000);
    const early = await page.evaluate(() => ({ field: document.getElementById("tour-screen").shadowRoot.querySelector("#q")?.value ?? null, pointer: document.getElementById("tour-screen").shadowRoot.querySelector(".tour-pointer").classList.contains("is-on") }));
    results.push(`${tag} before arriving: search field "${early.field}", pointer ${early.pointer ? "shown" : "hidden"}`);
    if (early.field || early.pointer) problems.push(`${tag}: step 1 played before the visitor reached the tour`);
  }
  const isScroll = await page.evaluate(() => document.getElementById("demo-root").classList.contains("is-scroll"));
  results.push(`${tag}: scroll mode ${isScroll}`);
  const top = await page.evaluate(() => document.getElementById("demo-root").getBoundingClientRect().top + window.scrollY);
  const travel = await page.evaluate(() => document.getElementById("demo-root").offsetHeight - document.querySelector(".demo-stage").offsetHeight);
  const pin = await page.evaluate(() => parseFloat(document.querySelector(".demo-stage").style.top) || 0);
  const count = await page.locator(".demo-tab").count();
  for (let step = 0; step < count; step += 1) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(top - pin + ((step + 0.5) / count) * travel));
    await sleep(step === 0 ? 7500 : 9000);
    const on = await readStep(page);
    const box = await page.locator(".demo-stage").boundingBox();
    const centre = box.y + box.height / 2;
    results.push(`${tag} step ${step + 1}: tab ${on + 1} on; stage centre ${Math.round(centre)} vs window ${400} (off by ${Math.round(Math.abs(centre - 400))} px); screen: ${await readScreenText(page)}`);
    if (on !== step) problems.push(`${tag}: scrolled to step ${step + 1} but tab ${on + 1} is on`);
    if (Math.abs(centre - 400) > 40) problems.push(`${tag}: the pinned stage is ${Math.round(Math.abs(centre - 400))} px off the window's centre`);
    const across = box.x + box.width / 2;
    if (Math.abs(across - 640) > 4) problems.push(`${tag}: the stage is ${Math.round(Math.abs(across - 640))} px off the window's centre, sideways`);
    await shot(page, `tour-${tag}-step${step + 1}`);
  }
  if (theme === "light") {
    // Pause: the pointer stops moving.
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(top - pin + (0.5 / count) * travel));
    await sleep(1500);
    await page.click(".tour-toggle");
    const before = await page.evaluate(() => document.getElementById("tour-screen").shadowRoot.querySelector(".tour-pointer").style.transform);
    await sleep(2500);
    const after = await page.evaluate(() => document.getElementById("tour-screen").shadowRoot.querySelector(".tour-pointer").style.transform);
    const words = await page.textContent(".tour-toggle");
    results.push(`${tag} pause: button says "${words.trim()}", pointer ${before === after ? "still" : "moved"}`);
    if (before !== after) problems.push(`${tag}: the pointer moved while paused`);
    await page.click(".tour-toggle");
    // A tab click scrolls to that step.
    await page.click("#dt-4");
    await sleep(2500);
    results.push(`${tag} click tab 4: tab ${(await readStep(page)) + 1} on`);
    if ((await readStep(page)) !== 3) problems.push(`${tag}: clicking tab 4 did not show step 4`);
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (overflow) problems.push(`${tag}: sideways overflow`);
  await context.close();
}

// ---------- phone, on a timer ----------
for (const theme of ["light", "dark"]) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const tag = `390-${theme}`;
  watch(page, tag);
  await page.goto(`${ORIGIN}?theme=${theme}`, { waitUntil: "networkidle" });
  // The app's phone tab bar stays inside the tour's frame (at the top of the page the frame is far below).
  const bar = await page.evaluate(() => {
    const host = document.getElementById("tour-screen").getBoundingClientRect();
    const tabs = document.getElementById("tour-screen").shadowRoot.querySelector(".fh-tabbar")?.getBoundingClientRect();
    return tabs ? { inside: tabs.top >= host.top - 1 && tabs.bottom <= host.bottom + 1, top: Math.round(tabs.top), hostTop: Math.round(host.top) } : null;
  });
  results.push(`${tag} the app's tab bar: ${bar ? (bar.inside ? "inside the frame" : `outside the frame (top ${bar.top}, frame top ${bar.hostTop})`) : "none"}`);
  if (bar && !bar.inside) problems.push(`${tag}: the app's tab bar sits outside the tour's frame`);
  await page.locator("#demo").scrollIntoViewIfNeeded();
  await page.evaluate(() => document.querySelector(".demo-stage").scrollIntoView({ block: "center" }));
  const seen = new Set();
  const count = await page.locator(".demo-tab").count();
  const started = Date.now();
  let last = -1;
  while (Date.now() - started < 20_000 * count && seen.size < count) {
    const on = await readStep(page);
    if (on !== last) {
      last = on;
      seen.add(on);
      await sleep(5500);
      await shot(page, `tour-${tag}-step${on + 1}`);
      results.push(`${tag} step ${on + 1}: ${await readScreenText(page)}`);
    }
    await sleep(400);
  }
  results.push(`${tag}: the timer showed steps ${[...seen].map((s) => s + 1).join(", ")}`);
  if (seen.size < count) problems.push(`${tag}: the timer showed only ${seen.size} of ${count} steps`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  if (overflow > 0) problems.push(`${tag}: sideways overflow ${overflow}px`);
  // A tab click stops the auto-advance.
  await page.click("#dt-2");
  await sleep(16000);
  const after = await readStep(page);
  results.push(`${tag} after a click on tab 2 and 16 s: tab ${after + 1} on, button "${(await page.textContent(".tour-toggle")).trim()}"`);
  if (after !== 1) problems.push(`${tag}: the tour moved on after a tab click`);
  await context.close();
}

// ---------- reduced motion ----------
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  const tag = "reduced";
  watch(page, tag);
  await page.goto(ORIGIN, { waitUntil: "networkidle" });
  await page.evaluate(() => document.querySelector(".demo-stage").scrollIntoView({ block: "center" }));
  await sleep(4000);
  const first = await readStep(page);
  const pointer = await page.evaluate(() => document.getElementById("tour-screen").shadowRoot.querySelector(".tour-pointer").classList.contains("is-on"));
  results.push(`${tag}: tab ${first + 1} on after 4 s, pointer ${pointer ? "shown" : "hidden"}, still mode ${await page.evaluate(() => document.getElementById("demo-root").classList.contains("is-still"))}`);
  if (pointer) problems.push(`${tag}: the pointer shows with reduced motion`);
  await shot(page, "tour-reduced-step1");
  await page.click("#dt-2");
  await sleep(800);
  results.push(`${tag} tap tab 2: tab ${(await readStep(page)) + 1}; screen: ${await readScreenText(page)}`);
  await shot(page, "tour-reduced-step2");
  await sleep(6000);
  if ((await readStep(page)) !== 1) problems.push(`${tag}: the step changed by itself`);
  await context.close();
}

// ---------- JavaScript off ----------
{
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
  const page = await context.newPage();
  const tag = "no-js";
  watch(page, tag);
  await page.goto(ORIGIN, { waitUntil: "networkidle" });
  await page.locator("#demo").scrollIntoViewIfNeeded();
  const text = await page.evaluate(() => document.getElementById("tour-screen").shadowRoot?.querySelector(".tour-mount")?.innerText.slice(0, 400).replace(/\s+/g, " ") ?? "(no shadow root)");
  results.push(`${tag}: ${text}`);
  if (!/Who are you trying to reach/.test(text)) problems.push(`${tag}: the still of step 1 does not show`);
  await page.locator("#demo .wrap").screenshot({ path: join(outDir, "tour-no-js.png") });
  await context.close();
}

await browser.close();
server.close();
console.log(results.join("\n"));
if (problems.length) {
  console.log(`\nPROBLEMS (${problems.length}):\n${[...new Set(problems)].join("\n")}`);
  process.exit(1);
}
console.log("\nAll tour checks passed.");
