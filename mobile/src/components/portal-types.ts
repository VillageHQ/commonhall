import type { ApiAnswer, ApiMethod } from "../lib/bridge";

// The portal web view, seen from the app: calls through the page (its cookie, its origin), and page moves.
export type PortalHandle = {
  call: (method: ApiMethod, path: string, body?: unknown) => Promise<ApiAnswer>;
  navigate: (path: string) => void;
  reload: () => void;
  setPushToken: (token: string) => void;
};

export type PortalViewProps = {
  origin: string;
  startUrl: string;
  pushToken: string | null;
  onOpenRoom: (roomId: string, title: string) => void;
  // A page of the community finished loading (its path), so the app may register for alerts.
  onPageLoaded: (path: string) => void;
  // The page couldn't load at all: the app shows its own error with Try again, never a blank view.
  onFailed: (message: string) => void;
};
