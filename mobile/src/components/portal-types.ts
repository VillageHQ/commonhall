import type { ApiAnswer, ApiMethod, AppAction, RoomClosedReason } from "../lib/bridge";

// The portal web view, seen from the app: calls through the page (its cookie, its origin), and page moves.
export type PortalHandle = {
  call: (method: ApiMethod, path: string, body?: unknown) => Promise<ApiAnswer>;
  navigate: (path: string) => void;
  reload: () => void;
  setPushToken: (token: string) => void;
  // Tells the page the room screen closed, so the room page says why and offers Join again.
  roomClosed: (roomId: string, reason: RoomClosedReason) => void;
};

export type PortalViewProps = {
  origin: string;
  startUrl: string;
  pushToken: string | null;
  onOpenRoom: (roomId: string, title: string, hasNotified: boolean) => void;
  // The avatar menu's "This app" group: reload, open in the browser, switch community.
  onAppAction: (action: AppAction) => void;
  // A page of the community finished loading (its path), so the app may register for alerts.
  onPageLoaded: (path: string) => void;
  // The page couldn't load at all: the app shows its own error with Try again, never a blank view.
  onFailed: (message: string) => void;
};
