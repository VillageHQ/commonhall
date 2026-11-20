import { createElement, forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { BRIDGE_VERSION, isAllowedCall, NATIVE_APP_READY_EVENT, ROOM_CLOSED_EVENT, toApiAnswer } from "../lib/bridge";
import { toSafePath } from "../lib/links";
import type { PortalHandle, PortalViewProps } from "./portal-types";

const PREVIEW_ONLY_MESSAGE =
  "The web preview opens the portal on its own address. Start it with `node scripts/web-preview.mjs`, which serves the app and the portal together.";

type PortalWindow = Window & { CommonhallApp?: unknown };

// The web preview (`expo start --web` through scripts/web-preview.mjs): the portal in an iframe on the same address,
// so the app can reach into the page exactly as the phone's web view does: `window.CommonhallApp` in the page, and
// calls made with the page's own fetch (its cookie, its origin).
export const PortalView = forwardRef<PortalHandle, PortalViewProps>(function PortalView({ startUrl, pushToken, onOpenRoom, onPageLoaded, onFailed }, ref) {
  const frame = useRef<HTMLIFrameElement | null>(null);
  const token = useRef(pushToken);

  const readPage = useCallback((): PortalWindow | null => {
    try {
      const page = frame.current?.contentWindow as PortalWindow | null;
      // Throws on another origin.
      return page && page.location.href ? page : null;
    } catch {
      return null;
    }
  }, []);

  const describeApp = useCallback(
    (page: PortalWindow) => {
      page.CommonhallApp = {
        version: BRIDGE_VERSION,
        platform: "web",
        pushToken: token.current,
        openRoom: (roomId: string, title: string, facts?: { hasNotified?: unknown }) => onOpenRoom(String(roomId), String(title ?? ""), facts?.hasNotified === true),
      };
      page.dispatchEvent(new Event(NATIVE_APP_READY_EVENT));
    },
    [onOpenRoom],
  );

  useImperativeHandle(
    ref,
    () => ({
      call: async (method, path, body) => {
        const page = readPage();
        if (!page || !isAllowedCall(method, path)) return { status: 0, json: null };
        try {
          const response = await page.fetch(path, { method, credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
          return toApiAnswer(response.status, await response.text());
        } catch {
          return { status: 0, json: null };
        }
      },
      navigate: (path) => {
        const safePath = toSafePath(path);
        const page = readPage();
        if (safePath && page) page.location.assign(safePath);
      },
      reload: () => readPage()?.location.reload(),
      setPushToken: (next) => {
        token.current = next;
        const page = readPage();
        if (page?.CommonhallApp) (page.CommonhallApp as { pushToken: string | null }).pushToken = next;
      },
      roomClosed: (roomId, reason) => {
        const page = readPage() as (PortalWindow & { CustomEvent: typeof CustomEvent }) | null;
        page?.dispatchEvent(new page.CustomEvent(ROOM_CLOSED_EVENT, { detail: { roomId, reason } }));
      },
    }),
    [readPage],
  );

  const onLoad = useCallback(() => {
    const page = readPage();
    if (!page) {
      onFailed(PREVIEW_ONLY_MESSAGE);
      return;
    }
    describeApp(page);
    onPageLoaded(page.location.pathname);
  }, [readPage, describeApp, onPageLoaded, onFailed]);

  return createElement("iframe", {
    ref: frame,
    src: startUrl,
    title: "Your community",
    onLoad,
    "data-testid": "portal-frame",
    style: { border: 0, width: "100%", height: "100%", flex: 1, background: "transparent" },
  });
});
