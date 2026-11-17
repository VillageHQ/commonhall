// Before/after sketch for the plan: the running demo as it is, then with the landing page's tokens injected
// (nothing is built; the override lives only in the browser tab). Usage: node mock.mjs <demo base> <out dir>
import { execSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import fs from "node:fs";

const [base = "http://127.0.0.1:9490", out = "./mock"] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const g = execSync("npm root -g", { encoding: "utf8" }).trim();
const { chromium } = createRequire(path.join(g, "noop.js"))("playwright-core");
const fontDir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w:)/, "$1")), "../../../site/assets/fonts");
const b64 = (f) => fs.readFileSync(path.join(fontDir, f)).toString("base64");

const LIGHT = `
@font-face { font-family: "Newsreader"; font-weight: 500; font-style: normal; src: url(data:font/woff2;base64,${b64("newsreader-latin-500-normal.woff2")}) format("woff2"); }
@font-face { font-family: "Newsreader"; font-weight: 500; font-style: italic; src: url(data:font/woff2;base64,${b64("newsreader-latin-500-italic.woff2")}) format("woff2"); }
:root, .dark {
  --serif: "Newsreader", "Iowan Old Style", Georgia, serif !important;
}
:root:not(.dark) {
  --background:#FAFAF7; --foreground:#111110; --foreground-soft:#4A4A46; --card:#FFFFFF; --popover:#FFFFFF;
  --muted:#F2F1EC; --muted-foreground:#4A4A46; --border:rgba(17,17,16,.16); --rule:rgba(17,17,16,.16); --input:#6B6B66;
  --ink:#111110; --spine:#111110; --graphite:#4A4A46; --paper:#FAFAF7; --leaf:#FFFFFF; --vellum:#F2F1EC; --side:#F2F1EC;
  --spine-tint:#ECECE8; --sage-soft:#ECECE8; --sage-text:#111110;
  --fund:#111110; --fund-deep:#000000; --fund-tint:#ECECE8;
  --primary:#111110; --primary-foreground:#FAFAF7; --secondary:#ECECE8; --secondary-foreground:#111110;
  --accent:#ECECE8; --accent-foreground:#111110; --brand-emphasis:#111110; --brand-edge:#111110; --ring:#111110;
  --logo-backdrop-dark:#111110;
}
.dark {
  --background:#0E0E0D; --foreground:#F4F2EC; --foreground-soft:#B8B6AE; --card:#161615; --popover:#161615;
  --muted:#1E1E1C; --muted-foreground:#B8B6AE; --border:rgba(244,242,236,.18); --rule:rgba(244,242,236,.18); --input:#8F8D85;
  --ink:#F4F2EC; --spine:#F4F2EC; --graphite:#B8B6AE; --paper:#0E0E0D; --leaf:#161615; --vellum:#1E1E1C; --side:#0A0A09;
  --spine-tint:#2A2A27; --sage-soft:#2A2A27; --sage-text:#F4F2EC;
  --fund:#F4F2EC; --fund-deep:#FFFFFF; --fund-tint:#2A2A27;
  --primary:#F4F2EC; --primary-foreground:#0E0E0D; --secondary:#2A2A27; --secondary-foreground:#F4F2EC;
  --accent:#2A2A27; --accent-foreground:#F4F2EC; --brand-emphasis:#F4F2EC; --brand-edge:#F4F2EC; --ring:#F4F2EC;
}
`;

const browser = await chromium.launch();
async function signedIn(who, viewport) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(`${base}/signin`, { waitUntil: "networkidle" });
  await page.locator(`form button[name="who"][value="${who}"], form:has(input[name="who"][value="${who}"]) button`).first().click();
  await page.waitForLoadState("networkidle"); await page.waitForTimeout(800); console.log(who, "landed on", page.url());
  return { ctx, page };
}
const SHOTS = [
  { who: "member", path: "/today", name: "today" },
  { who: "member", path: "/directory", name: "directory" },
  { who: "admin", path: "/admin", name: "admin" },
];
for (const [w, h, size] of [[390, 844, "phone"], [1280, 800, "desktop"]]) {
  for (const shot of SHOTS) {
    const { ctx, page } = await signedIn(shot.who, { width: w, height: h });
    await page.goto(base + shot.path, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, `${shot.name}-${size}-before.png`) });
    await page.addStyleTag({ content: LIGHT });
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(out, `${shot.name}-${size}-after.png`) });
    // dark: the app's own theme class
    await page.evaluate(() => document.documentElement.classList.add("dark"));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(out, `${shot.name}-${size}-after-dark.png`) });
    console.log("shot", shot.name, size, "title:", await page.title());
    await ctx.close();
  }
}
await browser.close();
