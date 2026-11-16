"use client";

import { useSyncExternalStore } from "react";

function subscribeToNothing() {
  return () => {};
}

// False while the server renders and while the browser hydrates, true after. A request to this site's own API must
// wait for true: on the server its relative fetch has no site to reach.
export function useIsInBrowser() {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}
