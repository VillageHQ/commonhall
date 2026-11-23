"use client";

import { ArrowLeftRight, ExternalLink, RotateCw, type LucideIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { APP_ACTIONS, hasAppActions, runAppAction, subscribeToNativeApp, type AppAction } from "@/platform/native-app/bridge";

// The store app's own actions, in the avatar menu (smooth-app, Part C): the app has no top bar of its own any more,
// so Reload, Open in the browser and Switch community live here, as the "This app" group (user-menu.tsx draws it in
// the dropdown and in the phone's sheet). Only an app that takes them (`appActions`) shows the group; a browser, or an
// app build from before them, shows nothing.
export const APP_ACTION_ITEMS: readonly { action: AppAction; label: string; icon: LucideIcon }[] = [
  { action: APP_ACTIONS.reload, label: "Reload", icon: RotateCw },
  { action: APP_ACTIONS.browser, label: "Open in the browser", icon: ExternalLink },
  { action: APP_ACTIONS.switch, label: "Switch community", icon: ArrowLeftRight },
];

export const APP_ACTIONS_LABEL = "This app";

const isNotInApp = () => false;

// The group's items while the page is in an app that takes them; none elsewhere. The app may arrive after the page
// (the web preview), so this follows it.
export function useAppActionItems() {
  const isInApp = useSyncExternalStore(subscribeToNativeApp, hasAppActions, isNotInApp);
  return isInApp ? APP_ACTION_ITEMS : [];
}

export { runAppAction };
