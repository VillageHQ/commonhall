// Starts the production server in demo mode, opens /me/network as the demo accounts, prints browser and server errors, stops the server.
import { spawn, execSync } from "node:child_process";
import { createRequire } from "node:module";
const require = createRequire("C:/Users/absi/AppData/Roaming/npm/node_modules/");
const { chromium } = require("playwright-core");
const PORT = 3901, BASE = `http://localhost:${PORT}`;
const label = process.argv[2] ?? "run";
const env = { ...process.env, PORT: String(PORT), DEMO_MODE: "true", NODE_ENV: "production",
  DATABASE_URL: "postgres://community:community@127.0.0.1:9501/community", APP_URL: BASE,
  BETTER_AUTH_SECRET: "probe-secret-probe-secret-probe-secret-1234" };
const server = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], { env, cwd: process.cwd() });
let log = "";
server.stdout.on("data", (d) => (log += d)); server.stderr.on("data", (d) => (log += d));
const stop = () => { try { execSync(`taskkill /PID ${server.pid} /T /F`, { stdio: "ignore" }); } catch {} };
try {
  for (let i = 0; i < 120; i++) { try { const r = await fetch(`${BASE}/signin`); if (r.status < 500) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  await new Promise((r) => setTimeout(r, 4000));
  const browser = await chromium.launch();
  for (const who of ["member", "admin"]) {
    const context = await browser.newContext(); const page = await context.newPage();
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.goto(`${BASE}/signin`);
    await page.locator(`form button[name="who"][value="${who}"], form:has(input[name="who"][value="${who}"]) button`).first().click();
    await page.waitForURL(/feed|today/, { timeout: 30000 });
    const before = log.length;
    const response = await page.goto(`${BASE}/me/network`);
    const html = await response.text();
    await page.locator("h1").first().waitFor();
    await page.waitForTimeout(3000);
    console.log(`[${label}] ${who}: h1="${await page.locator("h1").first().innerText()}" server-html-has-loading=${html.includes("Checking your network")}`);
    console.log(`[${label}] ${who}: browser errors: ${errors.length ? errors.join(" | ") : "none"}`);
    const serverPart = log.slice(before).split("\n").filter((l) => /error/i.test(l));
    console.log(`[${label}] ${who}: server error lines: ${serverPart.length ? serverPart.join(" | ") : "none"}`);
    await page.screenshot({ path: `.ai/tmp/${label}-${who}.png`, fullPage: true });
    if (who === "member" && process.argv[3] === "states") {
      // The sync flow's states: the status answer is replaced per stage, the rest is the real built page.
      for (const stage of ["needs_linkedin", "needs_consent", "needs_sync", "syncing", "ready"]) {
        const stageErrors = [];
        const onConsole = (m) => { if (m.type() === "error") stageErrors.push(m.text()); };
        page.on("console", onConsole);
        await page.unroute("**/api/network/status").catch(() => {});
        await page.route("**/api/network/status", (route) => route.fulfill({ json: { stage, isAdmin: false, canSearch: stage === "ready",
          sync: stage === "needs_sync" || stage === "syncing" ? { appUrl: "https://village.demo.invalid" } : null } }));
        const at = log.length;
        await page.goto(`${BASE}/me/network`);
        await page.locator("h1").first().waitFor();
        await page.waitForTimeout(1500);
        const main = (await page.locator(".fh-narrow").innerText()).replace(/\s+/g, " ").slice(0, 260);
        const serverLines = log.slice(at).split(/\r?\n/).filter((l) => /error/i.test(l));
        console.log(`[${label}] stage ${stage}: ${main}`);
        console.log(`[${label}] stage ${stage}: browser errors ${stageErrors.length ? stageErrors.join(" | ") : "none"}; server error lines ${serverLines.length ? serverLines.join(" | ") : "none"}`);
        await page.screenshot({ path: `.ai/tmp/${label}-stage-${stage}.png`, fullPage: true });
        page.off("console", onConsole);
      }
    }
    await context.close();
  }
  await browser.close();
} finally { stop(); }
