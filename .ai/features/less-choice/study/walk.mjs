// One walk through the local throwaway Commonhall copy, for persona testers.
// Usage: node walk.mjs '<json>'   where json = { "who": "member"|"admin"|"none", "base": "http://localhost:9563",
//   "session": "<name, keeps cookies between walks>", "phone": true, "shot": "<name>",
//   "steps": [ {"goto":"/today"}, {"click":"Start a room"}, {"fill":["What's it about?","Hiring"]},
//              {"check":"Notify others"}, {"select":["Label","value"]}, {"press":"Enter"}, {"wait":500},
//              {"look":true} ] }
// Prints, after every "look" step and at the end: the address, the heading, the page's text (trimmed), and every
// control a person could use (buttons, links, fields, switches, choices) with a count. Screenshots go to ./shots/.
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
const require = createRequire((process.env.PLAYWRIGHT_DIR ?? process.cwd()) + "/package.json");
const { chromium, devices } = require("playwright");

const input = JSON.parse(process.argv[2] ?? "{}");
const BASE = input.base ?? "http://localhost:9563";
const HERE = import.meta.dirname;
const SESSIONS = join(HERE, "sessions");
const SHOTS = join(HERE, "shots");
mkdirSync(SESSIONS, { recursive: true });
mkdirSync(SHOTS, { recursive: true });
const sessionFile = input.session ? join(SESSIONS, `${input.session.replace(/[^a-z0-9-]/gi, "_")}.json`) : null;

const browser = await chromium.launch();
const phone = input.phone !== false;
const context = await browser.newContext({
  ...(phone ? { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: devices["iPhone 13"].userAgent } : { viewport: { width: 1280, height: 860 } }),
  ...(sessionFile && existsSync(sessionFile) ? { storageState: sessionFile } : {}),
});
const page = await context.newPage();
page.setDefaultTimeout(8000);

async function signIn(who) {
  await page.goto(`${BASE}/signin`);
  const button = page.getByRole("button", { name: who === "admin" ? /Maya/ : /Sam/ });
  if (!(await button.count())) return;
  await button.click();
  await page.waitForURL((u) => !u.pathname.startsWith("/signin"), { timeout: 30000 });
}

async function look(label) {
  const data = await page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const s = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none";
    };
    const name = (el) => (el.getAttribute("aria-label") || el.innerText || el.value || el.placeholder || el.getAttribute("title") || "").trim().replace(/\s+/g, " ").slice(0, 60);
    const labelFor = (el) => {
      if (el.id) {
        const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
        if (l) return l.innerText.trim().replace(/\s+/g, " ").slice(0, 60);
      }
      return el.getAttribute("aria-label") || el.getAttribute("placeholder") || el.name || "";
    };
    const main = document.querySelector("main") ?? document.body;
    const controls = { buttons: [], links: [], fields: [], switches: [], choices: [], selects: [] };
    for (const el of main.querySelectorAll("button, [role=button], a[href], input, textarea, select, [role=switch], [role=radio], [role=tab], [role=checkbox]")) {
      if (!visible(el)) continue;
      const role = el.getAttribute("role");
      const type = (el.getAttribute("type") || "").toLowerCase();
      if (role === "switch") controls.switches.push(labelFor(el) || name(el));
      else if (role === "radio" || role === "tab" || type === "radio") controls.choices.push(name(el) || labelFor(el));
      else if (role === "checkbox" || type === "checkbox") controls.switches.push(labelFor(el) || name(el));
      else if (el.tagName === "SELECT") controls.selects.push(`${labelFor(el)} [${el.options.length} options]`);
      else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") { if (type !== "hidden") controls.fields.push(labelFor(el) || type); }
      else if (el.tagName === "A") controls.links.push(name(el));
      else controls.buttons.push(name(el));
    }
    const text = main.innerText.replace(/\n{2,}/g, "\n").slice(0, 3500);
    return { url: location.pathname + location.search, h1: document.querySelector("h1")?.innerText ?? "", text, controls, pageHeightPx: document.documentElement.scrollHeight };
  });
  const counts = Object.fromEntries(Object.entries(data.controls).map(([k, v]) => [k, v.length]));
  console.log(`\n=== ${label} — ${data.url} — "${data.h1}" — page ${data.pageHeightPx}px tall`);
  console.log(`controls: ${JSON.stringify(counts)}`);
  for (const [kind, list] of Object.entries(data.controls)) if (list.length) console.log(`  ${kind}: ${list.map((x) => JSON.stringify(x)).join(", ")}`);
  console.log(`--- text ---\n${data.text}\n--- end text ---`);
}

async function clickByName(target) {
  const tries = [
    page.getByRole("button", { name: target, exact: true }),
    page.getByRole("link", { name: target, exact: true }),
    page.getByRole("button", { name: target }),
    page.getByRole("link", { name: target }),
    page.getByRole("tab", { name: target }),
    page.getByRole("radio", { name: target }),
    page.getByRole("switch", { name: target }),
    page.getByRole("menuitem", { name: target }),
    page.getByText(target, { exact: true }),
    page.getByText(target),
  ];
  for (const locator of tries) {
    const visibleOne = locator.locator("visible=true").first();
    if (await visibleOne.count()) {
      await visibleOne.click();
      return;
    }
  }
  throw new Error(`Nothing visible to click named "${target}"`);
}

let stepNumber = 0;
try {
  if (input.who && input.who !== "none" && !(sessionFile && existsSync(sessionFile))) await signIn(input.who);
  for (const step of input.steps ?? []) {
    stepNumber += 1;
    if (step.goto) await page.goto(`${BASE}${step.goto}`, { waitUntil: "networkidle" }).catch(() => page.waitForLoadState("load"));
    else if (step.click) {
      await clickByName(step.click);
      await page.waitForLoadState("networkidle").catch(() => {});
      await page.waitForTimeout(400);
    } else if (step.fill) await page.getByLabel(step.fill[0]).first().fill(step.fill[1]);
    else if (step.fillPlaceholder) await page.getByPlaceholder(step.fillPlaceholder[0]).first().fill(step.fillPlaceholder[1]);
    else if (step.check) await page.getByLabel(step.check).first().click();
    else if (step.select) await page.getByLabel(step.select[0]).first().selectOption(step.select[1]);
    else if (step.press) await page.keyboard.press(step.press);
    else if (step.wait) await page.waitForTimeout(step.wait);
    else if (step.look) await look(`step ${stepNumber}`);
  }
} catch (error) {
  console.log(`\n!!! step ${stepNumber} failed: ${String(error.message ?? error).split("\n")[0]}`);
}
await look("end");
if (input.shot) {
  const file = join(SHOTS, `${input.shot.replace(/[^a-z0-9-]/gi, "_")}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`screenshot: ${file}`);
}
if (sessionFile) await context.storageState({ path: sessionFile });
await browser.close();
