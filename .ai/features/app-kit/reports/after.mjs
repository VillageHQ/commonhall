// Real screenshots of the built app on the Commonhall look (no overrides). Usage: node after.mjs <base> <out>
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";
const [base = "http://127.0.0.1:9498", out = "./after"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const g = execSync("npm root -g", { encoding: "utf8" }).trim();
const { chromium } = createRequire(path.join(g, "noop.js"))("playwright-core");
const browser = await chromium.launch();
const notes = [];
async function signedIn(who, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on("pageerror", (e) => notes.push("PAGE ERROR " + e.message));
  page.on("console", (m) => { if (m.type() === "error") notes.push("CONSOLE ERROR " + m.text().slice(0, 160)); });
  await page.goto(`${base}/signin`, { waitUntil: "networkidle" });
  if (who) {
    await page.locator(`form button[name="who"][value="${who}"]`).first().click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
  }
  return { ctx, page };
}
const SHOTS = [
  { who: null, path: "/signin", name: "signin" },
  { who: "member", path: "/today", name: "today" },
  { who: "member", path: "/directory", name: "directory" },
  { who: "member", path: "/asks", name: "asks" },
  { who: "member", path: "/intros", name: "intros" },
  { who: "admin", path: "/admin", name: "admin" },
];
for (const [w, h, size] of [[390, 844, "phone"], [1280, 800, "desktop"]]) {
  for (const shot of SHOTS) {
    const { ctx, page } = await signedIn(shot.who, { width: w, height: h });
    await page.goto(base + shot.path, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    if (shot.name === "today" && size === "desktop") {
      const font = await page.evaluate(() => getComputedStyle(document.querySelector("h1")).fontFamily);
      const h1Rendered = await page.evaluate(() => document.fonts.check(`500 30px ${getComputedStyle(document.querySelector("h1")).fontFamily.split(",")[0]}`));
      notes.push(`h1 font-family: ${font.slice(0, 80)} | loaded: ${h1Rendered}`);
      notes.push(`tokens: ${await page.evaluate(() => { const s = getComputedStyle(document.documentElement); return ["--background", "--foreground", "--fund", "--primary", "--serif"].map((k) => k + "=" + s.getPropertyValue(k).trim().slice(0, 40)).join(" "); })}`);
    }
    await page.screenshot({ path: path.join(out, `${shot.name}-${size}-light.png`) });
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `${shot.name}-${size}-dark.png`) });
    notes.push(`shot ${shot.name} ${size}: ${await page.title()} ${page.url().replace(base, "")}`);
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(out, "notes.txt"), notes.join("\n") + "\n");
console.log(notes.join("\n"));
