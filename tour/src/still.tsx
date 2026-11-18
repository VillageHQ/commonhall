import { renderToString } from "react-dom/server";

import { renderAccentCss } from "@/platform/design/accent";
import { DEMO_COMMUNITY } from "@/platform/demo/people";

import { setTourAddress } from "./shims/next-navigation";
import { createTourQueryClient, TourScreens } from "./screens";
import { TOUR_STEPS } from "./steps";

// Run by the build (tour/build.mjs) in Node: the still of step 1, written into the page for visitors without
// JavaScript, and the pictures every step's screens show, so the build copies only those.

// The community colour the app writes into every page (src/app/layout.tsx), for the demo's colour.
export const ACCENT_CSS = renderAccentCss(DEMO_COMMUNITY.accentColor);

export const STEPS = TOUR_STEPS.map(({ id, label, caption }) => ({ id, label, caption }));

function render(href: string) {
  setTourAddress(href);
  return renderToString(<TourScreens client={createTourQueryClient()} />);
}

export function renderFirstStill() {
  return render(TOUR_STEPS[0]!.still);
}

export function listPictures() {
  const pictures = new Set<string>();
  for (const step of TOUR_STEPS) {
    for (const href of [step.start, step.still]) {
      for (const match of render(href).matchAll(/tour\/(?:faces|logos)\/[\w-]+\.(?:webp|svg)/g)) pictures.add(match[0]);
    }
  }
  return [...pictures].sort();
}
