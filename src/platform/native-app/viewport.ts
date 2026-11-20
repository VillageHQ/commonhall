import type { Viewport } from "next";

import { isNativeAppUserAgent } from "./bridge.ts";

// The store app's pages draw under the status bar (the site pads its own top bar with the safe area); a browser, or a
// request with no user agent, keeps the plain viewport.
export function toViewport(userAgent: string | null | undefined): Viewport {
  const viewport: Viewport = { width: "device-width", initialScale: 1 };
  return isNativeAppUserAgent(userAgent) ? { ...viewport, viewportFit: "cover" } : viewport;
}
