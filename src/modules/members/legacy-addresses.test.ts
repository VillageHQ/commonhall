import { createRequire } from "node:module";

import { describe, expect, it } from "vitest";

type PathToRegexp = {
  pathToRegexp: (source: string, keys: { name: string }[], options: object) => RegExp;
  compile: (path: string) => (params: object) => string;
};

type QueryCondition = { type: string; key: string };

// Next.js tries the redirects in order and takes the first match, with these path-to-regexp options. A rule with
// `missing` only matches when none of those query keys is in the address.
async function resolveRedirect(path: string, query: Record<string, string> = {}) {
  const { nextConfig } = await import("../../../next.config.mjs");
  const { pathToRegexp, compile } = createRequire(import.meta.url)("next/dist/compiled/path-to-regexp") as PathToRegexp;
  for (const rule of (await nextConfig.redirects()) as { source: string; destination: string; permanent: boolean; missing?: QueryCondition[] }[]) {
    if (rule.missing?.some(({ type, key }) => type === "query" && key in query)) continue;
    const keys: { name: string }[] = [];
    const match = pathToRegexp(rule.source, keys, { strict: true, sensitive: false, delimiter: "/" }).exec(path);
    if (!match) continue;
    const params = Object.fromEntries(keys.map((key, position) => [key.name, match[position + 1]]));
    // Next compiles the path; a query in the destination is kept as it is.
    const [destinationPath = "", destinationQuery] = rule.destination.split("?");
    return { destination: `${compile(destinationPath)(params)}${destinationQuery ? `?${destinationQuery}` : ""}`, permanent: rule.permanent };
  }
  return null;
}

describe("the old directory and profile addresses", () => {
  it.each([
    ["/members", "/people"],
    ["/members/card", "/me"],
    ["/members/data", "/me/data"],
    ["/members/ada-123", "/people/ada-123"],
  ])("%s moves for good to %s", async (path, destination) => {
    expect(await resolveRedirect(path)).toEqual({ destination, permanent: true });
  });
});

// Round 6, part 1: Search and Directory became People, and Intros moved into the Inbox. /ask is a page (where it goes
// depends on the modules that are on), and /search/candidates keeps its address.
describe("the round-6 member addresses", () => {
  it.each([
    ["/directory", "/people"],
    ["/search", "/people"],
    ["/network", "/people"],
    ["/search/ask", "/people"],
    ["/intros", "/inbox?show=intros"],
  ])("%s moves for good to %s", async (path, destination) => {
    expect(await resolveRedirect(path)).toEqual({ destination, permanent: true });
  });

  it("keeps the one-step intro ask from a network search, and the pages that stay", async () => {
    expect(await resolveRedirect("/search/ask", { target: "rosa", via: "m1" })).toBeNull();
    for (const path of ["/search/candidates", "/ask", "/people", "/inbox", "/intros/new", "/intros/abc"]) expect(await resolveRedirect(path)).toBeNull();
  });
});
