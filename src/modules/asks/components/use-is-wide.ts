"use client";

import { useSyncExternalStore } from "react";

// From this width the composer opens in place; under it, a full-screen sheet (the shared Sheet's breakpoint). Its own
// file, so the landing page's tour (which draws the app in a box) can always open it in place.
const WIDE_QUERY = "(min-width: 1000px)";

function subscribeToWidth(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function useIsWide() {
  return useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}
