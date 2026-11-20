// The simplify-round6 screen inventory. Starts the built app (`pnpm build` first) in demo mode on :3460 against a
// throwaway Postgres, signs in as the demo admin and member, turns Rooms on with one live and one scheduled room, and
// for every screen takes a 390px and a 1280px full-page screenshot, saves the visible text of <main>, and counts words
// and controls. Kills the server at the end. Writes to .ai/tmp/simplify-study/ (git-ignored).
//
// Run from the repo root:
//   .ai/tmp/study.env holds DATABASE_URL (a throwaway database), APP_URL=http://localhost:3460, SETUP_TOKEN,
//   BETTER_AUTH_SECRET, DEMO_MODE=true and LiveKit dev keys (LIVEKIT_URL, LIVEKIT_API_KEY=devkey, LIVEKIT_API_SECRET=secret).
//   Turn Rooms on in that database first: insert module_state:voice = on into instance_settings.
//   PLAYWRIGHT_CORE=<folder that holds node_modules/playwright-core> node .ai/features/simplify-round6/study/capture.mjs
//   node .ai/features/simplify-round6/study/table.mjs   (the words and controls table)
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(path.join(process.env.PLAYWRIGHT_CORE ?? process.cwd(), "noop.js"));
const { chromium } = require("playwright-core");

const ROOT = process.cwd();
const OUT = path.join(ROOT, ".ai/tmp/simplify-study");
const BASE = "http://localhost:3460";
for (const line of readFileSync(path.join(ROOT, ".ai/tmp/study.env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", "3460"], { cwd: ROOT, env: process.env, stdio: ["ignore", "pipe", "pipe"] });
let serverLog = "";
server.stdout.on("data", (d) => (serverLog += d));
server.stderr.on("data", (d) => (serverLog += d));
const stop = () => { try { server.kill(); } catch {} };
process.on("exit", stop);

async function waitUp() {
  for (let i = 0; i < 120; i++) {
    try { const r = await fetch(`${BASE}/api/health`); if (r.ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("server never came up\n" + serverLog);
}

const MEMBER = ["/today", "/asks", "/ask", "/search", "/directory", "/jobs", "/jobs/yours", "/intros", "/intros/new", "/inbox", "/messages/new", "/rooms", "/perks", "/library", "/library/leaderboard", "/library/new", "/me", "/me/alerts", "/me/data", "/me/email", "/me/network", "/feed", "/welcome", "/start", "/search/ask"];
const ADMIN = ["/admin", "/admin/report", "/admin/intros", "/admin/members", "/admin/invites", "/admin/asks", "/admin/digest", "/admin/announcements", "/admin/jobs", "/admin/settings", "/admin/setup", "/admin/start", "/admin/features", "/admin/rooms", "/admin/perks", "/admin/calls", "/admin/weekly-email", "/admin/mail", "/admin/health", "/admin/audit", "/admin/import", "/admin/links", "/admin/reports", "/admin/village"];
const DYNAMIC = [
  { from: "/asks", re: /^\/asks\/[^/]+$/ },
  { from: "/intros", re: /^\/intros\/[^/]+$/ },
  { from: "/inbox", re: /^\/inbox\/[^/]+$/ },
  { from: "/directory", re: /^\/people\/[^/]+$/ },
  { from: "/library", re: /^\/library\/(?!new|leaderboard)[^/]+$/ },
  { from: "/rooms", re: /^\/rooms\/[^/]+$/ },
  { from: "PERSON", re: /^\/intros\/new\?/ },
  { from: "PERSON", re: /^\/messages\/new\?/ },
];
const ADMIN_DYNAMIC = [{ from: "/admin/members", re: /^\/admin\/members\/[^/]+$/ }];

function slug(p) { return p.replace(/^\//, "").replace(/\?.*$/, "").replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "id").replace(/[^a-zA-Z0-9-]/g, "_").slice(0, 60) || "root"; }

async function measure(page) {
  return page.evaluate(() => {
    const visible = (el) => { const s = getComputedStyle(el); const r = el.getBoundingClientRect(); return s.display !== "none" && s.visibility !== "hidden" && (r.width > 0 || r.height > 0); };
    const main = document.querySelector("main") ?? document.body;
    const text = (main.innerText || "").replace(/\s+\n/g, "\n").trim();
    const words = text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    const controls = [...main.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=switch], summary")].filter(visible);
    const kinds = {};
    for (const c of controls) { const k = c.tagName.toLowerCase(); kinds[k] = (kinds[k] ?? 0) + 1; }
    const navs = [...document.querySelectorAll("nav")].filter(visible).map((n) => ({ label: n.getAttribute("aria-label") ?? "", items: [...n.querySelectorAll("a, button")].filter(visible).map((a) => (a.innerText || a.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim()).filter(Boolean) }));
    const bodyWords = (document.body.innerText || "").split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
    const headings = [...main.querySelectorAll("h1,h2")].filter(visible).map((h) => h.innerText.trim()).slice(0, 8);
    return { text, words, bodyWords, controls: controls.length, kinds, navs, headings, title: document.title };
  });
}

async function signIn(context, who) {
  const page = await context.newPage();
  await page.goto(`${BASE}/signin`);
  const res = await page.request.post(`${BASE}/api/demo/sign-in`, { form: { who }, headers: { Origin: BASE }, maxRedirects: 0 });
  // The response sets the session cookie on the context's request jar, shared with pages.
  await page.close();
  return res.status();
}

async function capture(browser, role, routes, dynamic) {
  const rows = [];
  const contexts = {};
  for (const [width, height, tag] of [[390, 844, "phone"], [1280, 900, "desktop"]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, isMobile: tag === "phone", hasTouch: tag === "phone" });
    const status = await signIn(context, role);
    console.log(role, tag, "sign-in", status);
    contexts[tag] = context;
  }
  const extra = [];
  {
    const page = await contexts.desktop.newPage();
    for (const d of dynamic) {
      const from = d.from === "PERSON" ? extra.find((e) => e.startsWith("/people/")) : d.from;
      await page.goto(`${BASE}${from}`, { waitUntil: "networkidle" }).catch(() => {});
      const hrefs = await page.$$eval("a[href]", (as) => as.map((a) => { const u = new URL(a.href); return u.pathname + u.search; }));
      const hit = hrefs.find((h) => d.re.test(h));
      if (hit) extra.push(hit); else console.log("no dynamic page from", d.from);
    }
    await page.close();
  }
  for (const route of [...routes, ...extra]) {
    const row = { route, role };
    for (const tag of ["phone", "desktop"]) {
      const page = await contexts[tag].newPage();
      let status = 0;
      try {
        const r = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30000 });
        status = r?.status() ?? 0;
      } catch (e) { status = -1; }
      await page.waitForTimeout(400);
      const finalPath = new URL(page.url()).pathname;
      const file = `${role}-${slug(route)}-${tag}.png`;
      await page.screenshot({ path: path.join(OUT, "shots", file), fullPage: true }).catch(() => {});
      const m = await measure(page).catch(() => ({ text: "", words: 0, controls: 0, kinds: {}, navs: [], headings: [] }));
      if (tag === "desktop") writeFileSync(path.join(OUT, "text", `${role}-${slug(route)}.txt`), `# ${route} (${role}) -> ${finalPath}\n\n${m.text}\n`);
      row[tag] = { status, finalPath, file, words: m.words, bodyWords: m.bodyWords, controls: m.controls, kinds: m.kinds, navs: m.navs, headings: m.headings };
      await page.close();
    }
    console.log(role, route, row.desktop.status, row.desktop.finalPath, "words", row.desktop.words, "controls", row.desktop.controls, "| phone", row.phone.words, row.phone.controls);
    rows.push(row);
  }
  for (const c of Object.values(contexts)) await c.close();
  return rows;
}

mkdirSync(path.join(OUT, "shots"), { recursive: true });
mkdirSync(path.join(OUT, "text"), { recursive: true });
try {
  await waitUp();
  console.log("server up");
  const browser = await chromium.launch();
  for (const [who, body] of [["admin", { title: "Fundraising in a slow market: open office hours", access: "open", scheduledFor: null, inviteeIds: [] }], ["member", { title: "First sales hire: what worked", access: "open", scheduledFor: new Date(Date.now() + 26 * 3600e3).toISOString(), inviteeIds: [] }]]) {
    const ctx = await browser.newContext();
    await signIn(ctx, who);
    const r = await ctx.request.post(`${BASE}/api/voice/create`, { data: body, headers: { Origin: BASE } });
    console.log("room", who, r.status(), (await r.text()).slice(0, 200));
    await ctx.close();
  }
  const member = await capture(browser, "member", MEMBER, DYNAMIC);
  const admin = await capture(browser, "admin", ADMIN, ADMIN_DYNAMIC);
  // Inside a live room, as the member, on a phone: tap Join.
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, permissions: ["microphone"] });
    await signIn(ctx, "member");
    const page = await ctx.newPage();
    await page.goto(`${BASE}/rooms`, { waitUntil: "networkidle" });
    const href = (await page.$$eval("a[href]", (as) => as.map((a) => new URL(a.href).pathname))).find((h) => /^\/rooms\/[^/]+$/.test(h));
    if (href) {
      await page.goto(`${BASE}${href}`, { waitUntil: "networkidle" });
      const join = page.getByRole("button", { name: /join|listen/i }).first();
      if (await join.count()) { await join.click().catch(() => {}); await page.waitForTimeout(4000); }
      await page.screenshot({ path: path.join(OUT, "shots", "member-room-joined-phone.png"), fullPage: true });
      const m = await measure(page);
      writeFileSync(path.join(OUT, "text", "member-room-joined.txt"), `# ${href} after Join (member, phone)

${m.text}
`);
      member.push({ route: href + " (joined)", role: "member", phone: { words: m.words, controls: m.controls, navs: m.navs, file: "member-room-joined-phone.png" } });
    }
    await ctx.close();
  }
  // The signed-out screens.
  const pub = [];
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    for (const route of ["/signin", "/public/board"]) {
      const page = await ctx.newPage();
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" }).catch(() => {});
      await page.screenshot({ path: path.join(OUT, "shots", `public-${slug(route)}-phone.png`), fullPage: true });
      const m = await measure(page);
      writeFileSync(path.join(OUT, "text", `public-${slug(route)}.txt`), `# ${route}\n\n${m.text}\n`);
      pub.push({ route, role: "public", phone: { words: m.words, controls: m.controls, navs: m.navs } });
      await page.close();
    }
    await ctx.close();
  }
  writeFileSync(path.join(OUT, "inventory.json"), JSON.stringify({ member, admin, pub }, null, 2));
  await browser.close();
} finally {
  writeFileSync(path.join(OUT, "server.log"), serverLog);
  stop();
}
console.log("done");
process.exit(0);
