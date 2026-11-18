// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { beforeAll, describe, expect, it } from "vitest";

// The website (site/, its own folder, never deployed from here): its sign-up form names the managed plan that fits.
const SITE = resolve(import.meta.dirname, "../../site");

function typeMembers(count: string) {
  const field = document.getElementById("f-members") as HTMLInputElement;
  field.value = count;
  field.dispatchEvent(new Event("input"));
  return document.querySelector("[data-plan-price]")?.textContent;
}

describe("the website's sign-up form", () => {
  beforeAll(() => {
    const html = readFileSync(resolve(SITE, "index.html"), "utf8");
    document.body.innerHTML = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? "";
    // The page's own script, as the browser runs it.
    new Function(readFileSync(resolve(SITE, "assets/site.js"), "utf8"))();
  });

  it("names the Enterprise plan up to 500 members", () => {
    expect(typeMembers("120")).toBe("$50k+ a year, 7,500 credits a month");
    expect(typeMembers("500")).toBe("$50k+ a year, 7,500 credits a month");
  });

  it("offers a quote above 500 members, never the 500-member price", () => {
    const price = typeMembers("5000");
    expect(price).not.toContain("$50k+");
    expect(price).toBe("above 500 members, Village quotes a plan with you");
  });
});
