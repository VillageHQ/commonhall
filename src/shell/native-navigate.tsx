"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { NATIVE_NAVIGATE_EVENT, readNavigatePath } from "@/platform/native-app/bridge";

// In the store app, an alert for a tab that is alive moves that tab's page as a link would (no reload, so the list
// keeps its place); the app sends the event and loads the page itself when nothing answers. Elsewhere nothing sends it.
export function NativeNavigate() {
  const router = useRouter();
  useEffect(() => {
    function move(event: Event) {
      const path = readNavigatePath(event);
      if (!path) return;
      event.preventDefault();
      router.push(path);
    }
    window.addEventListener(NATIVE_NAVIGATE_EVENT, move);
    return () => window.removeEventListener(NATIVE_NAVIGATE_EVENT, move);
  }, [router]);
  return null;
}
