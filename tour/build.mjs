// pnpm tour:build — bundles the landing page's live tour from the app's own components and CSS into site/tour/, and
// writes the tour's block (tabs, captions, a still of step 1) into site/index.html between the tour markers.
// pnpm tour:check — builds in memory and fails when anything committed under site/ differs (a stale build).
// How it works and how to add a step: tour/AGENTS.md.

import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import tailwind from "@tailwindcss/postcss";
import { analyzeMetafile, build } from "esbuild";
import postcss from "postcss";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SITE = path.join(ROOT, "site");
const OUT = path.join(SITE, "tour");
const INDEX = path.join(SITE, "index.html");
const SCRATCH = path.join(ROOT, ".ai", "tmp", "tour");
const START_MARK = "<!-- tour:start (written by pnpm tour:build; edit tour/src, not this block) -->";
const END_MARK = "<!-- tour:end -->";

// The app's modules the tour swaps for stand-ins: Next's router and links, the server guard, the requests, the
// sign-out and the module registry (the menu only needs the manifests).
const SHIMS = path.join(ROOT, "tour", "src", "shims");
const PACKAGE_SHIMS = {
  "next/link": "next-link.tsx",
  "next/navigation": "next-navigation.ts",
  "next/image": "next-image.tsx",
  "server-only": "empty.ts",
};
const FILE_SHIMS = {
  "src/platform/http/post-request": "post-request.ts",
  "src/platform/auth/sign-out": "sign-out.ts",
  "src/modules/registry": "registry.ts",
  "src/components/use-is-in-browser": "use-is-in-browser.ts",
};

function shimPlugin() {
  const byFile = new Map(Object.entries(FILE_SHIMS).map(([from, to]) => [path.join(ROOT, from), path.join(SHIMS, to)]));
  return {
    name: "tour-shims",
    setup(builder) {
      builder.onResolve({ filter: /^(next\/link|next\/navigation|next\/image|server-only)$/ }, (args) => ({ path: path.join(SHIMS, PACKAGE_SHIMS[args.path]) }));
      builder.onResolve({ filter: /(post-request|sign-out|registry|use-is-in-browser)(\.tsx?)?$/ }, (args) => {
        const bare = args.path.replace(/\.tsx?$/, "");
        const absolute = bare.startsWith("@/") ? path.join(ROOT, "src", bare.slice(2)) : path.resolve(args.resolveDir, bare);
        const shim = byFile.get(absolute);
        return shim && !args.importer.startsWith(SHIMS) ? { path: shim } : undefined;
      });
      // zod carries every language's error words; the app's are English. The others become empty.
      builder.onLoad({ filter: /zod[\\/]v4[\\/]locales[\\/][\w-]+\.js$/ }, (args) =>
        /[\\/](en|index)\.js$/.test(args.path) ? undefined : { contents: "export default function () { return { localeError: () => undefined }; }", loader: "js" },
      );
    },
  };
}

const COMMON = {
  bundle: true,
  jsx: "automatic",
  target: "es2022",
  tsconfig: path.join(ROOT, "tsconfig.json"),
  // The app's public settings read process.env; the tour has none, so they take their defaults.
  define: { "process.env.NODE_ENV": '"production"', "process.env": "{}" },
  plugins: [shimPlugin()],
  logLevel: "error",
  legalComments: "none",
  write: false,
};

async function bundleScript() {
  const result = await build({ ...COMMON, entryPoints: [path.join(ROOT, "tour", "src", "main.tsx")], format: "iife", platform: "browser", minify: true, metafile: true, outfile: path.join(OUT, "tour.js") });
  if (process.env.TOUR_ANALYZE) console.log(await analyzeMetafile(result.metafile));
  return result.outputFiles[0].text;
}

// The same screens on the server side, to write the still of step 1 into the page and list the pictures they use.
async function renderStills() {
  const result = await build({ ...COMMON, entryPoints: [path.join(ROOT, "tour", "src", "still.tsx")], format: "esm", platform: "node", packages: "external", outfile: path.join(SCRATCH, "still.mjs") });
  await mkdir(SCRATCH, { recursive: true });
  const file = path.join(SCRATCH, `still-${process.pid}-${Date.now()}.mjs`);
  await writeFile(file, result.outputFiles[0].text);
  try {
    return await import(pathToFileURL(file).href);
  } finally {
    await rm(file, { force: true });
  }
}

// ---------- CSS: the app's own globals.css, made to work inside the tour's box ----------

// The app's page-level selectors become the tour's box; its window-size rules become rules on the box's size, so the
// app lays out for the box (phone layout in a narrow box) whatever the window is.
function scopeToBox(registered) {
  const swapSelector = (selector) => {
    const trimmed = selector.trim();
    if (trimmed === "html" || trimmed === "body" || trimmed === ":root") return ".tour-app";
    return trimmed.replace(/^(html|body)(?=[\s.:[>])/, ".tour-app").replace(/:root\b/g, ".tour-app");
  };
  return {
    postcssPlugin: "tour-scope",
    Rule(rule) {
      if (rule.parent?.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
      const next = rule.selectors.map(swapSelector);
      const unique = [...new Set(next)];
      if (unique.join() !== rule.selectors.join()) rule.selectors = unique;
    },
    AtRule: {
      media(atRule) {
        if (!/width/.test(atRule.params) || /print/.test(atRule.params)) return;
        atRule.name = "container";
        atRule.params = atRule.params.replace(/^\s*(only\s+)?screen\s+and\s+/i, "");
      },
      // @property only registers at the page level (never inside a shadow root): it moves to page.css.
      property(atRule) {
        registered.push(atRule.toString());
        atRule.remove();
      },
    },
    Declaration(declaration) {
      if (/\d(dvh|svh|lvh|vh|dvw|svw|lvw|vw)\b/.test(declaration.value)) {
        declaration.value = declaration.value.replace(/(\d)(?:d|s|l)?vh\b/g, "$1cqh").replace(/(\d)(?:d|s|l)?vw\b/g, "$1cqw");
      }
    },
  };
}

async function buildStyles(stillClasses, accentCss) {
  const entry = path.join(ROOT, "tour", "src", "tour.css");
  const registered = [];
  const result = await postcss([tailwind({ base: path.join(ROOT, "src"), optimize: { minify: true } }), scopeToBox(registered)]).process(`${await readFile(entry, "utf8")}
${accentCss}
`, { from: entry });
  const still = stillClasses.map(([name, css]) => `.${name}{${css}}`).join("");
  return { tourCss: `${result.css}\n${still}\n`, propertyCss: registered.join("\n") };
}

// The fonts the app uses (src/app/_fonts), declared at the page level: a font declared inside a shadow root is ignored.
const FONTS = [
  { file: "IBMPlexSans.woff2", family: "Tour Plex Sans", weight: "100 700", style: "normal" },
  { file: "Newsreader-opsz-normal.woff2", family: "Tour Newsreader", weight: "200 800", style: "normal" },
  { file: "Newsreader-opsz-italic.woff2", family: "Tour Newsreader", weight: "200 800", style: "italic" },
];

function pageCss(propertyCss) {
  const faces = FONTS.map(({ file, family, weight, style }) => `@font-face{font-family:"${family}";font-style:${style};font-weight:${weight};font-display:swap;src:url("fonts/${file}") format("woff2")}`).join("\n");
  return `/* Written by pnpm tour:build. The tour's fonts and the app's registered properties, at the page level. */\n${faces}\n${propertyCss}\n`;
}

// ---------- the still: React's markup without style attributes (the page's CSP allows none) ----------

function moveStylesToClasses(html) {
  const classes = new Map();
  const out = html.replace(/<([a-zA-Z][\w-]*)(\s[^>]*?)?(\/?)>/g, (tag, name, attributes = "", selfClose) => {
    const styleMatch = attributes.match(/\sstyle="([^"]*)"/);
    if (!styleMatch) return tag;
    const css = styleMatch[1].replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&amp;/g, "&");
    if (!classes.has(css)) classes.set(css, `tour-s${classes.size + 1}`);
    let rest = attributes.replace(styleMatch[0], "");
    const className = classes.get(css);
    rest = /\sclass="/.test(rest) ? rest.replace(/\sclass="([^"]*)"/, (_all, value) => ` class="${value} ${className}"`) : `${rest} class="${className}"`;
    return `<${name}${rest}${selfClose}>`;
  });
  return { html: out, classes: [...classes].map(([css, name]) => [name, css]) };
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function tourBlock(steps, stillHtml) {
  const tabs = steps
    .map(
      (step, index) =>
        `          <button class="demo-tab${index === 0 ? " is-on" : ""}" type="button" role="tab" id="dt-${index + 1}" aria-controls="tour-screen" aria-selected="${index === 0}" data-step="${index}"${index === 0 ? "" : ' tabindex="-1"'}><span class="n" aria-hidden="true">${index + 1}</span>${escapeHtml(step.label)}</button>`,
    )
    .join("\n");
  const captions = steps.map((step, index) => `        <p class="tour-caption" data-step="${index}"${index === 0 ? "" : " hidden"}>${escapeHtml(step.caption)}</p>`).join("\n");
  return `${START_MARK}
      <div class="demo-stage">
        <div class="demo-bar">
        <div class="demo-tabs" role="tablist" aria-label="Steps of the tour">
${tabs}
        </div>
        <button class="tour-toggle" type="button" aria-pressed="false"><span class="tour-toggle-icon" aria-hidden="true"></span><span class="tour-toggle-words">Pause</span></button>
        </div>
        <div class="tour-frame">
          <div class="tour-screen" id="tour-screen" role="tabpanel" aria-labelledby="dt-1"><template shadowrootmode="open"><link rel="stylesheet" href="tour/tour.css"><div class="tour-app" inert><div class="tour-mount">${stillHtml}</div></div></template></div>
        </div>
${captions}
      </div>
      ${END_MARK}`;
}

function spliceIndex(index, block) {
  const start = index.indexOf(START_MARK);
  const end = index.indexOf(END_MARK);
  if (start < 0 || end < start) throw new Error(`site/index.html has no tour markers (${START_MARK} … ${END_MARK})`);
  return `${index.slice(0, start)}${block}${index.slice(end + END_MARK.length)}`;
}

// ---------- the whole build, in memory ----------

export async function buildTour() {
  const [script, stills] = await Promise.all([bundleScript(), renderStills()]);
  const { html: stillHtml, classes } = moveStylesToClasses(stills.renderFirstStill());
  const { tourCss, propertyCss } = await buildStyles(classes, stills.ACCENT_CSS);
  const files = new Map();
  files.set("tour/tour.js", script);
  files.set("tour/tour.css", tourCss);
  files.set("tour/page.css", pageCss(propertyCss));
  files.set("index.html", spliceIndex(await readFile(INDEX, "utf8"), tourBlock(stills.STEPS, stillHtml)));
  for (const font of FONTS) files.set(`tour/fonts/${font.file}`, await readFile(path.join(ROOT, "src", "app", "_fonts", font.file)));
  files.set("tour/fonts/OFL.txt", await readFile(path.join(ROOT, "src", "app", "_fonts", "OFL.txt")));
  // Only the pictures the screens show, from the demo's own (public/demo; credits in public/demo/CREDITS.md).
  for (const url of stills.listPictures()) {
    const match = url.match(/^tour\/(faces|logos)\/([\w-]+\.(?:webp|svg))$/);
    if (!match) throw new Error(`Unexpected picture address ${url}`);
    files.set(`tour/${match[1]}/${match[2]}`, await readFile(path.join(ROOT, "public", "demo", match[1], match[2])));
  }
  return files;
}

async function listFiles(directory, prefix) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const found = [];
  for (const entry of entries) {
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) found.push(...(await listFiles(path.join(directory, entry.name), relative)));
    else found.push(relative);
  }
  return found;
}

function same(onDisk, built) {
  return Buffer.isBuffer(built) ? onDisk.equals(built) : onDisk.toString("utf8").replace(/\r\n/g, "\n") === built.replace(/\r\n/g, "\n");
}

// The files under site/ that differ from a fresh build: missing, changed or left over.
export async function findStaleFiles() {
  const files = await buildTour();
  const stale = [];
  for (const [name, content] of files) {
    const onDisk = await readFile(path.join(SITE, name)).catch(() => null);
    if (!onDisk || !same(onDisk, content)) stale.push(name);
  }
  for (const name of await listFiles(OUT, "tour")) if (!files.has(name)) stale.push(name);
  return stale;
}

async function writeTour() {
  const files = await buildTour();
  await rm(OUT, { recursive: true, force: true });
  for (const [name, content] of files) {
    const target = path.join(SITE, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  const kilobytes = (name) => Math.round(Buffer.byteLength(files.get(name)) / 1024);
  console.log(`Tour built: tour.js ${kilobytes("tour/tour.js")} KB, tour.css ${kilobytes("tour/tour.css")} KB, ${files.size} files under site/.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) {
    const stale = await findStaleFiles();
    if (stale.length) {
      console.error(`The built tour is out of date. Run pnpm tour:build and commit site/. Stale: ${stale.join(", ")}`);
      process.exit(1);
    }
    console.log("The built tour matches its sources.");
  } else {
    await writeTour();
  }
}
