import type { ApiAnswer, ApiMethod, AppAction, RoomClosedReason } from "../lib/bridge";
import type { TabsMessage } from "../lib/tabs";

// The portal, seen from the app: calls through the page (its cookie, its origin), and page moves. PortalTabs gives one
// for all its tabs (the open tab answers); each tab's web view has its own (PortalViewHandle).
export type PortalHandle = {
  call: (method: ApiMethod, path: string, body?: unknown) => Promise<ApiAnswer>;
  navigate: (path: string) => void;
  reload: () => void;
  setPushToken: (token: string) => void;
  // Tells the page the room screen closed, so the room page says why and offers Join again.
  roomClosed: (roomId: string, reason: RoomClosedReason) => void;
};

// One tab's web view: also runs the tab scripts (lib/tabs.ts) and steps back in its own history.
export type PortalViewHandle = PortalHandle & {
  runInPage: (script: string) => void;
  canGoBack: () => boolean;
  goBack: () => void;
};

// What PortalScreen gives the portal (PortalTabs), whatever number of web views it keeps.
export type PortalProps = {
  origin: string;
  startUrl: string;
  pushToken: string | null;
  // notice: a line the page asks the room screen to show its host ("People weren't alerted this time…"), or "".
  onOpenRoom: (roomId: string, title: string, notice: string) => void;
  // The avatar menu's "This app" group: reload, open in the browser, switch community.
  onAppAction: (action: AppAction) => void;
  // A page of the community finished loading (its path), so the app may register for alerts.
  onPageLoaded: (path: string) => void;
  // The page couldn't load at all: the app shows its own error with Try again, never a blank view.
  onFailed: (message: string) => void;
};

export type PortalViewProps = PortalProps & {
  // The tab this web view shows (its first page): the page sends links to other tabs to the app.
  home: string;
  // The page's tab messages (lib/tabs.ts), from the community's own pages only.
  onTabsMessage: (message: TabsMessage) => void;
};
