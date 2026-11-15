// Proof for the door field: stills with the pointer parked after a wave (1280 light/dark, 390 light), a clip per theme,
// the count of ink pixels inside the headline boxes during a sweep (must be 0), and the reduced-motion / no-JS states.
// Usage: node .ai/features/door-field/reports/proof.mjs   (from the repo root; needs playwright-core + chromium, ffmpeg optional)
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { mkdirSync, readdirSync, renameSync, existsSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
const require = createRequire(import.meta.url);
let chromium;
try { chromium = require("playwright-core").chromium; } catch { chromium = require(path.join(process.env.APPDATA, "npm/node_modules/playwright-core")).chromium; }
const root = process.cwd();
const out = path.join(root, ".ai/features/door-field/reports");
mkdirSync(out, { recursive: true });
const url = (theme) => pathToFileURL(path.join(root, "site/index.html")).href + "?theme=" + theme;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const line = (x0, y0, x1, y1, n) => Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n]);
async function sweep(page, pts, stepMs = 22) { for (const [x, y] of pts) { await page.mouse.move(x, y); await sleep(stepMs); } }
const browser = await chromium.launch();
const report = {};

// stills + headline-box ink count
for (const [theme, w, h, scale, name] of [["light", 1280, 720, 1, "light-1280"], ["dark", 1280, 720, 1, "dark-1280"], ["light", 390, 844, 2, "light-390"]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: scale });
  await page.goto(url(theme), { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await sleep(400);
  const pts = w > 600 ? [...line(120, 200, 640, 400, 14), ...line(640, 400, 300, 160, 10), ...line(300, 160, 700, 300, 10)] : line(40, 120, 200, 420, 10);
  let worst = 0;
  for (let k = 0; k < pts.length; k++) {
    await page.mouse.move(pts[k][0], pts[k][1]);
    await sleep(22);
    if (k % 3 === 0) {
      const n = await page.evaluate(() => {
        const c = document.getElementById("field"); const ctx = c.getContext("2d");
        const cr = c.getBoundingClientRect(); const sx = c.width / cr.width, sy = c.height / cr.height;
        let count = 0;
        for (const el of document.querySelectorAll("[data-skip-text]")) {
          const range = document.createRange(); range.selectNodeContents(el);
          for (const r of range.getClientRects()) {
            const x = Math.max(0, Math.floor((r.left - cr.left) * sx)), y = Math.max(0, Math.floor((r.top - cr.top) * sy));
            const ww = Math.min(c.width - x, Math.ceil(r.width * sx)), hh = Math.min(c.height - y, Math.ceil(r.height * sy));
            if (ww <= 0 || hh <= 0) continue;
            const d = ctx.getImageData(x, y, ww, hh).data;
            for (let i = 3; i < d.length; i += 4) if (d[i] > 40) count++; // above the at-rest ink (about 6.5% = alpha 17): an open door would be 55% = alpha 140
          }
        }
        return count;
      });
      worst = Math.max(worst, n);
    }
  }
  await sleep(w > 600 ? 480 : 420);
  await page.screenshot({ path: path.join(out, name + ".png") });
  report[name] = { openDoorPixelsInsideHeadlineBoxes: worst };
  await page.close();
}

// reduced motion: drawn once, closed, still; no JS: no canvas
const rm = await browser.newContext({ viewport: { width: 1280, height: 720 }, reducedMotion: "reduce" });
const p1 = await rm.newPage();
await p1.goto(url("light"), { waitUntil: "networkidle" });
await sleep(300);
const before = await p1.evaluate(() => document.getElementById("field").toDataURL());
await sweep(p1, line(100, 200, 700, 400, 10), 20);
await sleep(400);
report.reducedMotionStill = (await p1.evaluate(() => document.getElementById("field").toDataURL())) === before;
await p1.screenshot({ path: path.join(out, "reduced-motion-1280.png") });
await rm.close();
const njs = await browser.newContext({ viewport: { width: 1280, height: 720 }, javaScriptEnabled: false });
const p2 = await njs.newPage();
await p2.goto(url("light"), { waitUntil: "networkidle" });
report.noJsCanvasDisplay = await p2.evaluate(() => getComputedStyle(document.getElementById("field")).display);
await p2.screenshot({ path: path.join(out, "no-js-1280.png") });
await njs.close();

// clips
for (const theme of ["light", "dark"]) {
  const tmp = path.join(out, "video-tmp-" + theme);
  mkdirSync(tmp, { recursive: true });
  const ctxp = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } });
  const page = await ctxp.newPage();
  await page.goto(url(theme), { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const dot = document.createElement("div");
    dot.style.cssText = "position:fixed;left:0;top:0;width:14px;height:14px;margin:-7px 0 0 -7px;border-radius:50%;border:2px solid currentColor;opacity:.8;z-index:99;pointer-events:none";
    document.body.appendChild(dot);
    document.addEventListener("mousemove", (e) => { dot.style.transform = "translate(" + e.clientX + "px," + e.clientY + "px)"; });
  });
  await sleep(900);
  await page.mouse.move(60, 120);
  await sweep(page, line(60, 120, 560, 300, 28));
  await sleep(500);
  await sweep(page, line(560, 300, 1240, 120, 34));
  await sleep(450);
  await sweep(page, line(1240, 120, 1180, 660, 26));
  await sleep(300);
  await sweep(page, line(1180, 660, 40, 640, 40));
  await sleep(450);
  await sweep(page, line(40, 640, 640, 360, 24));
  await sleep(1300);
  await ctxp.close();
  const f = readdirSync(tmp).find((n) => n.endsWith(".webm"));
  const webm = path.join(out, `clip-${theme}.webm`);
  renameSync(path.join(tmp, f), webm);
  const ff = [process.env.FFMPEG, "ffmpeg", path.join(process.env.LOCALAPPDATA || "", "Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-8.1.1-full_build/bin/ffmpeg.exe")].filter(Boolean);
  for (const bin of ff) {
    try {
      execFileSync(bin, ["-y", "-loglevel", "error", "-i", webm, "-t", "10", "-vf", "fps=30,scale=1280:-2", "-c:v", "libx264", "-crf", "28", "-pix_fmt", "yuv420p", "-an", path.join(out, `clip-${theme}.mp4`)]);
      report[`clip-${theme}`] = `mp4 ${(statSync(path.join(out, `clip-${theme}.mp4`)).size / 1024).toFixed(0)} KB`;
      break;
    } catch { /* try the next */ }
  }
  if (!report[`clip-${theme}`]) report[`clip-${theme}`] = "webm only (no ffmpeg)";
}
await browser.close();
console.log(JSON.stringify(report, null, 1));
