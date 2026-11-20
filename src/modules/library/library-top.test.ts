import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

import { LIBRARY_PAGES, LIBRARY_TOP_PAGE } from "./contract";
import { parseLibraryFilters } from "./rules-page";

type PathToRegexp = {
  pathToRegexp: (source: string, keys: { name: string }[], options: object) => RegExp;
  compile: (path: string) => (params: object) => string;
};

// Next.js tries the redirects in order and takes the first match, with these path-to-regexp options. It fills the
// destination's path and keeps its query as written.
async function resolveRedirect(path: string) {
  const { nextConfig } = await import("../../../next.config.mjs");
  const { pathToRegexp, compile } = createRequire(import.meta.url)("next/dist/compiled/path-to-regexp") as PathToRegexp;
  for (const rule of await nextConfig.redirects()) {
    const keys: { name: string }[] = [];
    const match = pathToRegexp(rule.source, keys, { strict: true, sensitive: false, delimiter: "/" }).exec(path);
    if (!match) continue;
    const [pathname = "", query] = rule.destination.split("?");
    const filled = compile(pathname)(Object.fromEntries(keys.map((key, position) => [key.name, match[position + 1]])));
    return { destination: query ? `${filled}?${query}` : filled, permanent: rule.permanent };
  }
  return null;
}

describe("the library's Top sort", () => {
  it("is where the old leaderboard address lands, for good", async () => {
    expect(await resolveRedirect(LIBRARY_PAGES.leaderboard)).toEqual({ destination: LIBRARY_TOP_PAGE, permanent: true });
  });

  it("reads ?sort=top, and keeps reading the role from the old ?job=", () => {
    expect(parseLibraryFilters({ sort: "top", job: "sales" })).toMatchObject({ top: true, job: "sales" });
    expect(parseLibraryFilters({ sort: "newest" }).top).toBe(false);
  });
});
