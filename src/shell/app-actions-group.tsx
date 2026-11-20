"use client";

import { ArrowLeftRight, ExternalLink, RotateCw, type LucideIcon } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useSyncExternalStore } from "react";

import { APP_ACTIONS, hasAppActions, runAppAction, subscribeToNativeApp, type AppAction } from "@/platform/native-app/bridge";

// The store app's own actions, in the avatar menu (smooth-app, Part C): the app has no top bar of its own any more,
// so Reload, Open in the browser and Switch community live here. Only an app that takes them (`appActions`) shows
// the group; a browser, or an app build from before them, shows nothing.
const ITEMS: readonly { action: AppAction; label: string; icon: LucideIcon }[] = [
  { action: APP_ACTIONS.reload, label: "Reload", icon: RotateCw },
  { action: APP_ACTIONS.browser, label: "Open in the browser", icon: ExternalLink },
  { action: APP_ACTIONS.switch, label: "Switch community", icon: ArrowLeftRight },
];

// The avatar menu's own looks (user-menu.tsx: MENU_ITEM, MENU_LABEL, MENU_RULE), repeated so that file keeps one line
// for this group.
const MENU_ITEM =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-[7px] px-3 text-[15px] leading-5 font-medium text-[var(--ink)] no-underline outline-none select-none data-[highlighted]:bg-[var(--vellum)] [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-[var(--graphite)]";
const MENU_LABEL = "px-3 pt-2 pb-1 text-xs font-semibold text-[var(--graphite)]";
const MENU_RULE = "my-1.5 h-px bg-[var(--rule)]";

const isNotInApp = () => false;

export function AppActionsGroup() {
  const isInApp = useSyncExternalStore(subscribeToNativeApp, hasAppActions, isNotInApp);
  if (!isInApp) return null;
  return (
    <DropdownMenu.Group data-slot="app-actions">
      <DropdownMenu.Separator className={MENU_RULE} />
      <DropdownMenu.Label className={MENU_LABEL}>This app</DropdownMenu.Label>
      {ITEMS.map(({ action, label, icon: Icon }) => (
        <DropdownMenu.Item key={action} className={MENU_ITEM} onSelect={() => runAppAction(action)}>
          <Icon aria-hidden="true" strokeWidth={1.5} />
          {label}
        </DropdownMenu.Item>
      ))}
    </DropdownMenu.Group>
  );
}
