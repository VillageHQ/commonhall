import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { extname, join, resolve } from "node:path";
const chromium = createRequire(join(process.env.APPDATA, "npm/node_modules/"))("playwright-core").chromium;
const repo = resolve(".");
const site = process.env.SITE_DIR ? resolve(process.env.SITE_DIR) : join(repo, "site"), out = join(repo, ".ai/features/common-hall-v2/reports"), tmp = join(repo, ".ai/tmp");
const only = process.argv[2];
const PORT = 55590, O = `http://127.0.0.1:${PORT}/`;
const T = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer(async (q, r) => { const f = resolve(site, "." + new URL(q.url, "http://x").pathname.replace(/\/$/, "/index.html")); try { r.writeHead(200, { "content-type": T[extname(f)] ?? "application/octet-stream" }); r.end(await readFile(f)); } catch { r.writeHead(404); r.end(); } });
await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const browser = await chromium.launch();
const res = {};
const run = (n) => !only || only === n;

if (run("form")) for (const w of [390, 1280]) {
  const page = await browser.newPage({ viewport: { width: w, height: w < 900 ? 844 : 800 } });
  const sent = [];
  page.on("request", (r) => { if (r.method() !== "GET") sent.push(r.url()); });
  await page.goto(O + "?theme=light", { waitUntil: "networkidle" });
  await page.click('.acts a.btn.out[href="#door-managed"]');
  await page.waitForTimeout(1200);
  res["inputs" + w] = await page.evaluate(() => ["f-name", "f-fund", "f-email", "f-members"].map((id) => { const r = document.getElementById(id).getBoundingClientRect(); return [id, Math.round(r.x), Math.round(r.y + scrollY), Math.round(r.width), Math.round(r.height)]; }));
  await page.click('#signup-form button[type="submit"]');
  await page.waitForTimeout(400);
  res["invalid" + w] = await page.$$eval(".field.is-invalid", (e) => e.length);
  res["errorsVisible" + w] = await page.$$eval(".field.is-invalid .field-error", (e) => e.filter((x) => { const r = x.getBoundingClientRect(); return r.height > 0; }).length);
  if (w === 390) { await page.evaluate(() => document.getElementById("signup-form").scrollIntoView({ block: "start" })); await page.waitForTimeout(300); await page.screenshot({ path: join(out, "form-errors-390.png") }); }
  await page.click("#f-name"); await page.keyboard.type("Sam Ortiz");
  await page.click("#f-fund"); await page.keyboard.type("Fieldstone Ventures");
  await page.click("#f-email"); await page.keyboard.type("sam@example.com");
  await page.click("#f-members"); await page.keyboard.type("120");
  await page.click('#signup-form button[type="submit"]');
  await page.waitForTimeout(1200);
  res["title" + w] = await page.textContent("[data-confirm-title]");
  res["sent" + w] = sent;
  await page.evaluate(() => document.getElementById("signup-confirm").scrollIntoView({ block: "center" }));
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(out, `form-${w}.png`) });
  await page.close();
}

if (run("nojs")) {
  for (const js of [false, true]) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: js });
    const page = await ctx.newPage();
    await page.goto(O + "?theme=light", { waitUntil: "networkidle" });
    res[js ? "withJs" : "noJs"] = await page.evaluate(() => {
      const vis = (s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return getComputedStyle(e).display !== "none" && r.width > 0; };
      const a = document.querySelector(".nojs-only");
      return { split: vis("#split"), main: vis("#setup-main"), caret: vis("#setup-caret"), link: vis(".nojs-only"), linkHref: a && a.href, linkText: a && a.textContent.trim() };
    });
    await page.screenshot({ path: join(tmp, (js ? "js" : "nojs") + "-1280.png"), clip: { x: 0, y: 0, width: 1280, height: 700 } });
    await ctx.close();
  }
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });
  const page = await ctx.newPage(); await page.goto(O + "?theme=dark", { waitUntil: "networkidle" });
  await page.screenshot({ path: join(tmp, "nojs-390.png") }); await ctx.close();
}

if (run("screens")) {
  for (const w of [1280, 390]) {
    const page = await browser.newPage({ viewport: { width: w, height: w > 900 ? 900 : 844 } });
    await page.goto(O + "?theme=light", { waitUntil: "networkidle" });
    for (const img of await page.$$("#screens .frame img")) await img.scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    res["shotWidths" + w] = await page.$$eval("#screens .frame img", (e) => e.map((x) => [Math.round(x.getBoundingClientRect().width), x.currentSrc.split("/").pop()]));
    await page.locator("#screens .shots").screenshot({ path: join(tmp, `screens-${w}.png`) });
    await page.close();
  }
}

if (run("contrast")) {
  res.contrast = {};
  const decode = await browser.newPage();
  for (const w of [1280, 390]) for (const scheme of ["light", "dark"]) for (const kind of ["pointer", "rest"]) {
    const page = await browser.newPage({ viewport: { width: w, height: w < 900 ? 844 : 800 }, deviceScaleFactor: 1 });
    await page.goto(O + `?theme=${scheme}`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const rects = await page.evaluate(() => ["h1", ".eyebrow", ".sub"].map((s) => { const el = document.querySelector(".copy " + s); const rg = document.createRange(); rg.selectNodeContents(el); const r = rg.getBoundingClientRect(); return { s, x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, color: getComputedStyle(el).color }; }));
    const h = rects[0];
    if (kind === "pointer") {
      for (let k = 0; k < 3; k++) for (let i = 0; i <= 24; i++) { await page.mouse.move(h.x + (h.w * i) / 24, h.y + h.h / 2 + (k - 1) * 20); await page.waitForTimeout(25); }
      await page.mouse.move(h.x + h.w / 2, h.y + h.h / 2);
      await page.waitForTimeout(60);
    } else await page.waitForTimeout(500);
    await page.evaluate(() => document.querySelectorAll(".copy h1,.copy .eyebrow,.copy .sub").forEach((e) => e.style.setProperty("color", "transparent", "important")));
    const buf = (await page.screenshot({ type: "png", fullPage: false })).toString("base64");
    const worst = await decode.evaluate(async ({ b64, rects }) => {
      const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
      const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      const lum = (r, gg, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(gg) + 0.0722 * f(b); };
      const out = {};
      for (const r of rects) {
        const col = r.color.match(/[\d.]+/g).map(Number); const lf = lum(col[0], col[1], col[2]);
        const x0 = Math.max(0, Math.floor(r.x)), y0 = Math.max(0, Math.floor(r.y)), w = Math.min(img.width - x0, Math.ceil(r.w)), hh = Math.min(img.height - y0, Math.ceil(r.h));
        const d = g.getImageData(x0, y0, w, hh).data; let min = 99;
        for (let i = 0; i < d.length; i += 4) { const lb = lum(d[i], d[i + 1], d[i + 2]); const ratio = (Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05); if (ratio < min) min = ratio; }
        out[r.s] = +min.toFixed(2);
      }
      return out;
    }, { b64: buf, rects });
    res.contrast[`${w} ${scheme} ${kind}`] = worst;
    await page.close();
  }
}
console.log(JSON.stringify(res, null, 1));
await browser.close(); server.close();
