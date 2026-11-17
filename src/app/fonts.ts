import localFont from "next/font/local";

// Three faces, self-hosted so no page calls a font service (licence: src/app/_fonts/OFL.txt).
// Body and everything you click: IBM Plex Sans.
export const plexSans = localFont({
  src: "./_fonts/IBMPlexSans.woff2",
  weight: "100 700",
  style: "normal",
  display: "swap",
  variable: "--font-plex-sans",
});

// Codes (reply codes, keys, embed snippets): IBM Plex Mono.
export const plexMono = localFont({
  src: [
    { path: "./_fonts/IBMPlexMono-400.woff2", weight: "400", style: "normal" },
    { path: "./_fonts/IBMPlexMono-500.woff2", weight: "500", style: "normal" },
  ],
  display: "swap",
  preload: false,
  variable: "--font-plex-mono",
});

// Titles and people's names: Newsreader, the landing page's serif (Commonhall look, 17 November 2026). One variable
// file per style carries the weight and optical-size axes, so a 34 px title is set in the display cut.
export const newsreader = localFont({
  src: [
    { path: "./_fonts/Newsreader-opsz-normal.woff2", weight: "200 800", style: "normal" },
    { path: "./_fonts/Newsreader-opsz-italic.woff2", weight: "200 800", style: "italic" },
  ],
  display: "swap",
  variable: "--font-newsreader",
});

export const FONT_VARIABLES = [plexSans.variable, plexMono.variable, newsreader.variable].join(" ");
