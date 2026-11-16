// A short clip of the demo section: the page scrolls through the pinned stage and the tabs advance.
// Usage: node clip.mjs <url> <out dir> [phone]
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

const [url, out = "./clip", mode = "desktop"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const g = execSync("npm root -g", { encoding: "utf8" }).trim();
const { chromium } = createRequire(path.join(g, "noop.js"))("playwright-core");
const phone = mode === "phone";
const size = phone ? { width: 390, height: 760 } : { width: 1280, height: 800 };
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: phone ? 2 : 1, recordVideo: { dir: out, size } });
const p = await ctx.newPage();
await p.goto(url + "?theme=light", { waitUntil: "networkidle" });
const info = await p.evaluate(() => {
  const d = document.getElementById("demo-root");
  const r = d.getBoundingClientRect();
  return { top: r.top + scrollY, height: d.offsetHeight, stage: d.querySelector(".demo-stage").offsetHeight };
});
const start = info.top - 140;
const end = info.top + info.height - info.stage - 24 + 40;
await p.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), start);
await p.waitForTimeout(700);
// ~7 seconds of smooth scrolling at 60 steps a second
const seconds = 4.5, fps = 30, steps = seconds * fps;
for (let i = 1; i <= steps; i++) {
  const t = i / steps;
  const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  await p.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), start + (end - start) * eased);
  await p.waitForTimeout(1000 / fps);
}
await p.waitForTimeout(900);
const video = p.video();
await ctx.close();
const webm = await video.path();
await browser.close();
const mp4 = path.join(out, `demo-${mode}.mp4`);
execSync(`ffmpeg -y -loglevel error -i "${webm}" -t 10 -vf "fps=30,scale=trunc(iw/2)*2:trunc(ih/2)*2" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "${mp4}"`);
fs.unlinkSync(webm);
console.log(mp4, Math.round(fs.statSync(mp4).size / 1024) + " KB");
