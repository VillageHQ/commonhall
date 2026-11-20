// Proof for less-choice Part 2 (Today and People). Starts the built app (`pnpm build` first) in demo mode on
// CAPTURE_PORT (default 3661) with the env file in CAPTURE_ENV (default .ai/tmp/study.env: DATABASE_URL to a throwaway
// database, APP_URL, SETUP_TOKEN, BETTER_AUTH_SECRET, DEMO_MODE=true), drives Today and People as the demo member
// (Sam Lee, made up) at 390 px and 1280 px, prints each check PASS/FAIL, saves screenshots beside this file, and stops
// the server. Run from the repo root:
//   PLAYWRIGHT_CORE=<folder holding node_modules/playwright-core> node .ai/features/choice-today/reports/proof.mjs
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.env.PLAYWRIGHT_CORE ?? process.cwd(), "noop.js"));
const { chromium, devices } = require("playwright-core");

const ROOT = process.cwd();
const HERE = import.meta.dirname;
const PORT = process.env.CAPTURE_PORT ?? "3661";
const BASE = `http://localhost:${PORT}`;
for (const line of readFileSync(path.join(ROOT, process.env.CAPTURE_ENV ?? ".ai/tmp/study.env"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}
process.env.APP_URL = BASE;

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", PORT], { cwd: ROOT, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
const stop = () => {
  try {
    server.kill();
  } catch {}
};
process.on("exit", stop);

async function waitUp() {
  for (let i = 0; i < 180; i++) {
    try {
      const r = await fetch(`${BASE}/api/health`);
      if (r.ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`server never came up\n${serverLog.slice(-2000)}`);
}

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: devices["iPhone 13"].userAgent };
const LAPTOP = { viewport: { width: 1280, height: 860 } };

async function signedIn(browser, options, initScript) {
  const context = await browser.newContext(options);
  if (initScript) await context.addInitScript(initScript);
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  await page.goto(`${BASE}/signin`);
  await page.getByRole("button", { name: /Sam/ }).first().click();
  await page.waitForURL((u) => !u.pathname.startsWith("/signin"), { timeout: 60000 });
  return { context, page };
}

// The page's blocks under the header, in order: their first words.
async function todayBlocks(page) {
  return page.evaluate(() =>
    [...document.querySelectorAll(".td-page > *")]
      .filter((el) => el.getBoundingClientRect().height > 0 && !el.matches("[data-slot='page-header'], .fh-flash"))
      .map((el) => el.innerText.trim().split("\n")[0].slice(0, 60)),
  );
}

// Controls a person could use between the top of <main> and the first member row (or the empty state).
async function controlsAboveList(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const list = document.querySelector("#member-results");
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    return [...main.querySelectorAll("button, a[href], input, select, textarea, [role=switch], [role=tab]")]
      .filter((el) => visible(el) && list && el.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING)
      .map((el) => (el.getAttribute("aria-label") || el.innerText || el.placeholder || el.tagName).trim().slice(0, 40));
  });
}

async function typeSearch(page, words) {
  const box = page.locator("#member-search");
  await box.fill("");
  await box.fill(words);
  await page.waitForURL((u) => u.searchParams.get("q") === words, { timeout: 15000 });
  await page.waitForTimeout(1500);
}

function shot(page, name) {
  return page.screenshot({ path: path.join(HERE, `${name}.png`), fullPage: false });
}

try {
  await waitUp();
  const browser = await chromium.launch();

  for (const [size, options] of [
    ["390", PHONE],
    ["1280", LAPTOP],
  ]) {
    const { context, page } = await signedIn(browser, options);
    // Sign-in lands on Today: that is the member's first visit, where the install card may show (phone: Safari's steps).
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);
    const landedOn = new URL(page.url()).pathname;
    const firstVisitCards = await page.locator("[data-testid='install-card']").count();
    if (size === "390") await shot(page, "today-first-visit-390");

    // Today: what waits comes first, and the heading counts exactly what shows.
    await page.goto(`${BASE}/today`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const blocks = await todayBlocks(page);
    const heading = await page.locator("h1").first().innerText();
    const shownWaiting = await page.locator(".fh-tsec").filter({ hasText: "Waiting on you" }).locator("article, .fh-titem").count();
    const counted = /one thing waits/.test(heading) ? 1 : Number((heading.match(/(\d+) things wait/) ?? [])[1] ?? 0);
    await shot(page, `today-${size}`);
    check(`${size}px Today's first block is "Waiting on you"`, blocks[0]?.startsWith("Waiting on you") ?? false, `blocks: ${JSON.stringify(blocks.slice(0, 4))}`);
    check(`${size}px Today's heading counts the items shown`, counted > 0 && counted === shownWaiting, `"${heading}" over ${shownWaiting} items`);

    // The install card (phone only: Safari's steps): shown on the first visit, gone on the next.
    if (size === "390") {
      const second = await page.locator("[data-testid='install-card']").count();
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      const third = await page.locator("[data-testid='install-card']").count();
      check("390px install card shows on the first visit only", landedOn === "/today" && firstVisitCards === 1 && second === 0 && third === 0, `landed on ${landedOn}: ${firstVisitCards}; next visit ${second}; after a reload ${third}`);
    }

    // People: at most 3 controls above the list, any-word search, the empty state's one tap.
    await page.goto(`${BASE}/people`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const above = await controlsAboveList(page);
    await shot(page, `people-${size}`);
    check(`${size}px People: at most 3 controls above the list`, above.length <= 3, JSON.stringify(above));

    await typeSearch(page, "fintech investor");
    const status = await page.locator("#member-results [role=status]").first().innerText().catch(() => "");
    const names = await page.locator("#member-results .fh-mcard b").allInnerTexts();
    await shot(page, `people-fintech-investor-${size}`);
    check(`${size}px "fintech investor" lists members`, names.length > 0, `${status}: ${names.join(", ")}`);
    check(`${size}px under the list: one tap to search their networks`, (await page.locator("[data-slot='people-network-offer']").count()) === 1);

    const nobody = "zebra veterinary robotics";
    await typeSearch(page, nobody);
    const offer = page.locator("[data-slot='people-network-offer']");
    const offerText = (await offer.count()) ? await offer.first().innerText() : "";
    await shot(page, `people-empty-${size}`);
    check(`${size}px no match: the empty state offers the network search with the words in`, offerText.includes(`“${nobody}”`), offerText);
    if (offerText) {
      await offer.first().click();
      await page.waitForURL((u) => u.searchParams.get("net") === "1", { timeout: 15000 }).catch(() => {});
      const url = new URL(page.url());
      await page.waitForTimeout(2500);
      await shot(page, `people-network-search-${size}`);
      check(`${size}px the one tap starts the network search`, url.searchParams.get("net") === "1" && url.searchParams.get("q") === nobody, url.pathname + url.search);
    }
    await context.close();
  }

  // Inside the store app (window.CommonhallApp present before the page loads): no install card, even on a first visit.
  const app = await signedIn(browser, PHONE, () => {
    window.CommonhallApp = { version: 1, platform: "ios", pushToken: null, openRoom: () => {} };
  });
  await app.page.evaluate(() => window.localStorage.clear());
  await app.page.goto(`${BASE}/today`, { waitUntil: "networkidle" });
  await app.page.waitForTimeout(800);
  await shot(app.page, "today-store-app-390");
  check("store app: no install card on a first visit", (await app.page.locator("[data-testid='install-card']").count()) === 0);
  await app.context.close();

  await browser.close();
} catch (error) {
  check("the run reached every check", false, String(error?.message ?? error).split("\n")[0]);
} finally {
  stop();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
