import { describe, expect, it } from "vitest";

// The landing page's live tour (tour/) is built from the app's own components into site/, and the built files are
// committed so the site deploys as it is. A change to the app's screens must come with a rebuild (pnpm tour:build).
describe("the landing page's live tour", () => {
  it("is built from the current sources", async () => {
    const { findStaleFiles } = await import("../../tour/build.mjs");
    expect(await findStaleFiles()).toEqual([]);
  }, 180_000);
});
