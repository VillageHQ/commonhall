import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, type ComponentType, type Ref } from "react";
import { BackHandler, Linking, Platform } from "react-native";
import { WebView, type WebViewMessageEvent, type WebViewProps } from "react-native-webview";
import type { ShouldStartLoadRequest } from "react-native-webview/lib/WebViewTypes";

import { buildBootstrapScript, buildCallScript, buildNavigateScript, buildPushTokenScript, buildRoomClosedScript, isAllowedCall, isRoomId, readPortalMessage, toApiAnswer, type ApiAnswer } from "../lib/bridge";
import { isSameOrigin, opensInPortal, toSafePath } from "../lib/links";
import type { PortalHandle, PortalViewProps } from "./portal-types";

const CALL_TIMEOUT_MS = 15_000;
const USER_AGENT_SUFFIX = "CommonhallApp/1";

// The web view's own handle (its published types leave the ref out).
type WebViewHandle = { injectJavaScript: (script: string) => void; reload: () => void; goBack: () => void };
const PortalWebView = WebView as unknown as ComponentType<WebViewProps & { ref?: Ref<WebViewHandle> }>;

type Pending = { resolve: (answer: ApiAnswer) => void; timer: ReturnType<typeof setTimeout> };

// The whole portal, in a web view: the member's session lives in its cookie store, so it stays signed in between
// launches. Other sites open in the phone's browser.
export const PortalView = forwardRef<PortalHandle, PortalViewProps>(function PortalView({ origin, startUrl, pushToken, onOpenRoom, onAppAction, onPageLoaded, onFailed }, ref) {
  const webView = useRef<WebViewHandle | null>(null);
  const pending = useRef(new Map<number, Pending>());
  const nextId = useRef(1);
  const canGoBack = useRef(false);
  const currentUrl = useRef(startUrl);
  // Runs before every page of the portal; a token that arrives mid-page is also set at once with setPushToken.
  const bootstrap = useMemo(() => buildBootstrapScript({ platform: Platform.OS, pushToken }), [pushToken]);

  useImperativeHandle(
    ref,
    () => ({
      call: (method, path, body) =>
        new Promise<ApiAnswer>((resolve) => {
          if (!isAllowedCall(method, path) || !isSameOrigin(currentUrl.current, origin)) {
            resolve({ status: 0, json: null });
            return;
          }
          const id = nextId.current++;
          const timer = setTimeout(() => {
            pending.current.delete(id);
            resolve({ status: 0, json: null });
          }, CALL_TIMEOUT_MS);
          pending.current.set(id, { resolve, timer });
          webView.current?.injectJavaScript(buildCallScript(id, method, path, body));
        }),
      navigate: (path) => {
        const safePath = toSafePath(path);
        if (safePath) webView.current?.injectJavaScript(buildNavigateScript(safePath));
      },
      reload: () => webView.current?.reload(),
      setPushToken: (token) => webView.current?.injectJavaScript(buildPushTokenScript(token)),
      roomClosed: (roomId, reason) => {
        if (isRoomId(roomId) && isSameOrigin(currentUrl.current, origin)) webView.current?.injectJavaScript(buildRoomClosedScript(roomId, reason));
      },
    }),
    [origin],
  );

  // Android's back button goes back in the portal first.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (!canGoBack.current) return false;
      webView.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, []);

  useEffect(
    () => () => {
      for (const { resolve, timer } of pending.current.values()) {
        clearTimeout(timer);
        resolve({ status: 0, json: null });
      }
      pending.current.clear();
    },
    [],
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      // Only the community's own pages speak to the app.
      const message = readPortalMessage(event.nativeEvent.data, event.nativeEvent.url, origin);
      if (!message) return;
      if (message.type === "voice.open") {
        onOpenRoom(message.roomId, message.title, message.hasNotified);
        return;
      }
      if (message.type === "app.action") {
        onAppAction(message.action);
        return;
      }
      const waiting = pending.current.get(message.id);
      if (!waiting) return;
      pending.current.delete(message.id);
      clearTimeout(waiting.timer);
      waiting.resolve(toApiAnswer(message.status, message.body));
    },
    [origin, onOpenRoom, onAppAction],
  );

  const onShouldStartLoad = useCallback(
    (request: ShouldStartLoadRequest) => {
      // Frames inside a page (the Perks catalogue) load where they are; only the page itself may leave for the browser.
      if (request.isTopFrame === false || opensInPortal(request.url, origin)) return true;
      if (/^(https?|mailto|tel):/i.test(request.url)) void Linking.openURL(request.url);
      return false;
    },
    [origin],
  );

  return (
    <PortalWebView
      ref={webView}
      source={{ uri: startUrl }}
      originWhitelist={["http://*", "https://*", "about:*"]}
      injectedJavaScriptBeforeContentLoaded={bootstrap}
      injectedJavaScriptBeforeContentLoadedForMainFrameOnly
      applicationNameForUserAgent={USER_AGENT_SUFFIX}
      sharedCookiesEnabled
      thirdPartyCookiesEnabled={false}
      domStorageEnabled
      setSupportMultipleWindows={false}
      allowsBackForwardNavigationGestures
      pullToRefreshEnabled
      allowsInlineMediaPlayback
      webviewDebuggingEnabled={__DEV__}
      onShouldStartLoadWithRequest={onShouldStartLoad}
      onMessage={onMessage}
      onNavigationStateChange={(state) => {
        canGoBack.current = state.canGoBack;
        currentUrl.current = state.url;
      }}
      onLoadEnd={(event) => {
        const { url } = event.nativeEvent;
        if (!isSameOrigin(url, origin)) return;
        // Android may run the before-load script too early for a page; the bootstrap is guarded, so running it again
        // here only fills in a page that missed it (the page listens for the ready event).
        webView.current?.injectJavaScript(bootstrap);
        onPageLoaded(new URL(url).pathname);
      }}
      onError={(event) => onFailed(event.nativeEvent.description || "The page didn't load.")}
      onHttpError={(event) => {
        if (event.nativeEvent.statusCode >= 500) onFailed(`Your community answered with an error (${event.nativeEvent.statusCode}).`);
      }}
      onRenderProcessGone={() => webView.current?.reload()}
      onContentProcessDidTerminate={() => webView.current?.reload()}
    />
  );
});
