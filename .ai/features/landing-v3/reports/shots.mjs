// Proof shots of the round-3 landing page: full pages (phone + desktop, light + dark), the demo's five scroll states,
// a reduced-motion check and a no-JS check. Usage: node shots.mjs <base url> <out dir>
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

const [base = "http://127.0.0.1:8798/design/v17/", out = "./shots"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const g = execSync("npm root -g", { encoding: "utf8" }).trim();
const { chromium } = createRequire(path.join(g, "noop.js"))("playwright-core");
const browser = await chromium.launch();
const log = [];
const note = (s) => { console.log(s); log.push(s); };

async function page(opts = {}) {
  const ctx = await browser.newContext({ deviceScaleFactor: 2, ...opts });
  const p = await ctx.newPage();
  p.on("pageerror", (e) => note("PAGE ERROR " + e.message));
  p.on("console", (m) => { if (m.type() === "error") note("CONSOLE ERROR " + m.text()); });
  return [ctx, p];
}

for (const [w, h, name] of [[390, 844, "phone"], [1280, 900, "desktop"]]) {
  for (const theme of ["light", "dark"]) {
    const [ctx, p] = await page({ viewport: { width: w, height: h } });
    await p.goto(base + "?theme=" + theme, { waitUntil: "networkidle" });
    await p.waitForTimeout(600);
    await p.screenshot({ path: path.join(out, `${name}-${theme}-full.png`), fullPage: true });
    for (const id of ["rooms", "demo", "compare", "pricing", "data", "doors"]) {
      const el = await p.$("#" + id);
      await el.scrollIntoViewIfNeeded();
      await p.waitForTimeout(250);
      await el.screenshot({ path: path.join(out, `${name}-${theme}-${id}.png`) });
    }
    await ctx.close();
  }
}

// the demo: scroll through its track and record which tab is on at five points
for (const [w, h, name] of [[1280, 900, "desktop"], [390, 844, "phone"]]) {
  const [ctx, p] = await page({ viewport: { width: w, height: h } });
  await p.goto(base + "?theme=light", { waitUntil: "networkidle" });
  const info = await p.evaluate(() => {
    const d = document.getElementById("demo-root");
    const r = d.getBoundingClientRect();
    return { top: r.top + scrollY, height: d.offsetHeight, scroll: d.classList.contains("is-scroll"), stage: d.querySelector(".demo-stage").offsetHeight };
  });
  note(`${name}: demo scroll mode=${info.scroll} track=${info.height}px stage=${info.stage}px`);
  const travel = info.height - info.stage;
  const seen = [];
  for (let i = 0; i < 5; i++) {
    const y = info.top + (travel * (i + 0.5)) / 5 - 24 + 1;
    await p.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);
    await p.waitForTimeout(450);
    const on = await p.evaluate(() => document.querySelector(".demo-tab.is-on")?.textContent.trim());
    seen.push(on);
    await p.screenshot({ path: path.join(out, `${name}-demo-step-${i + 1}.png`) });
  }
  note(`${name}: tabs seen while scrolling: ${seen.join(" | ")}`);
  // a tap on tab 4 from the top of the track
  await p.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), info.top - 100);
  await p.waitForTimeout(300);
  await p.click("#dt-4");
  await p.waitForTimeout(1400);
  const afterTap = await p.evaluate(() => document.querySelector(".demo-tab.is-on")?.textContent.trim());
  note(`${name}: after tapping tab 4: ${afterTap}`);
  await p.screenshot({ path: path.join(out, `${name}-demo-tap.png`) });
  await ctx.close();
}

// reduced motion: no pinning, tabs switch on tap
{
  const [ctx, p] = await page({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  await p.goto(base + "?theme=light", { waitUntil: "networkidle" });
  const r = await p.evaluate(() => ({ scroll: document.getElementById("demo-root").classList.contains("is-scroll"), height: document.getElementById("demo-root").offsetHeight }));
  await p.click("#dt-3");
  await p.waitForTimeout(200);
  const on = await p.evaluate(() => document.querySelector(".demo-tab.is-on")?.textContent.trim() + " / panel " + document.querySelector(".demo-panel.is-on")?.id);
  note(`reduced motion: scroll mode=${r.scroll} track=${r.height}px; after tap 3: ${on}`);
  await ctx.close();
}
// no JavaScript: every screen shows
{
  const [ctx, p] = await page({ viewport: { width: 1280, height: 900 }, javaScriptEnabled: false });
  await p.goto(base + "?theme=light", { waitUntil: "networkidle" });
  const r = await p.evaluate(() => Array.from(document.querySelectorAll(".demo-panel")).map((el) => getComputedStyle(el).visibility + "/" + getComputedStyle(el).opacity).join(","));
  note(`no JS: panels ${r}; tabs shown=${await p.evaluate(() => getComputedStyle(document.querySelector(".demo-tabs")).display)}`);
  await p.$("#demo").then((el) => el.screenshot({ path: path.join(out, "nojs-demo.png") }));
  await ctx.close();
}
// 320 px: nothing wider than the screen
{
  const [ctx, p] = await page({ viewport: { width: 320, height: 640 } });
  await p.goto(base + "?theme=light", { waitUntil: "networkidle" });
  const over = await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  note(`320px: horizontal overflow=${over}px`);
  await p.screenshot({ path: path.join(out, "w320-full.png"), fullPage: true });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(out, "log.txt"), log.join("\n") + "\n");
