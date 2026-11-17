import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { LOGO_BACKDROPS } from "@/platform/branding/logo-rules";

import { LogoTile } from "./logo-tile";

const LOGO = "/api/branding/logo";

describe("a logo on the dark tile", () => {
  // A percentage padding resolves against the parent's width (the sidebar), not the tile: a 34 px tile got about 22 px
  // on each side and the logo shrank to 0 x 0, an empty black square.
  it.each([30, 34, 44])("keeps a pixel inset inside a %i px tile, never a percentage", (sizePx) => {
    const markup = renderToStaticMarkup(createElement(LogoTile, { name: "Example Fund", logo: { url: LOGO, backdrop: LOGO_BACKDROPS.dark }, sizePx }));

    expect(markup).not.toMatch(/p-\[\d+%\]/);
    expect(markup).toContain(`padding:${Math.round(sizePx / 10)}px`);
  });

  it("adds no inset on the light tile", () => {
    const markup = renderToStaticMarkup(createElement(LogoTile, { name: "Example Fund", logo: { url: LOGO, backdrop: LOGO_BACKDROPS.light }, sizePx: 34 }));

    expect(markup).not.toContain("padding");
  });
});
