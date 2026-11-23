import * as Device from "expo-device";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, BackHandler, Easing, Keyboard, Platform, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { buildNavigateScript } from "../lib/bridge";
import { isSignedOutPath, toSafePath } from "../lib/links";
import {
  buildDarkScript,
  buildFrameScript,
  buildGoScript,
  buildHomeScript,
  buildReportScript,
  buildScrollTopScript,
  DEFAULT_TAB_PATHS,
  findTabFor,
  findTabRoot,
  HOME_TAB_PATH,
  LOW_MEMORY_BYTES,
  LOW_MEMORY_LIVE_TABS,
  MAXIMUM_LIVE_TABS,
  pickTabsToDrop,
  readSlideDirection,
  TAB_BAR_HEIGHT,
  type PageColors,
  type PageTab,
  type TabsMessage,
  type TabsState,
} from "../lib/tabs";
import { useColors } from "../theme";
import { NativeTabBar } from "./NativeTabBar";
import type { PortalHandle, PortalProps, PortalViewHandle } from "./portal-types";
import { PortalView } from "./PortalView";

const SLIDE_PX = 40;
const SLIDE_MS = 220;
const EASE_OUT = Easing.bezier(0.2, 0.8, 0.2, 1);
const useNativeDriver = Platform.OS !== "web";
const LIVE_TAB_LIMIT = Platform.OS === "android" && (Device.totalMemory ?? Infinity) < LOW_MEMORY_BYTES ? LOW_MEMORY_LIVE_TABS : MAXIMUM_LIVE_TABS;

// One web view: the tab it shows (`home`, which can change, see onState) and the page it first opened.
type TabView = { id: number; home: string; startUrl: string };

type PortalTabsProps = PortalProps & {
  // Docks right above the tab bar (above the home indicator where the bar is hidden): Part 6's mini player.
  bottomSlot?: ReactNode;
};

function readStartPath(startUrl: string) {
  try {
    const url = new URL(startUrl);
    return `${url.pathname}${url.search}`;
  } catch {
    return HOME_TAB_PATH;
  }
}

function useIsReducedMotion() {
  const [isReduced, setIsReduced] = useState(false);
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then(setIsReduced);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setIsReduced);
    return () => subscription.remove();
  }, []);
  return isReduced;
}

function useIsKeyboardShown() {
  const [isShown, setIsShown] = useState(false);
  useEffect(() => {
    // iOS says so before the keyboard moves; Android only once it is up.
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setIsShown(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setIsShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return isShown;
}

// The store app's tabs (ui-polish Part 7): a native tab bar over one web view per tab. A tab loads on its first visit
// and then stays alive (its scroll, its typed text), so coming back to it is instant; the new tab slides in 40 px from
// its side. Links to another tab's page, alerts and commonhall:// links open in the tab they belong to. All web views
// share the app's cookie store, so one sign-in signs in every tab.
export const PortalTabs = forwardRef<PortalHandle, PortalTabsProps>(function PortalTabs({ origin, startUrl, pushToken, onOpenRoom, onAppAction, onPageLoaded, onFailed, bottomSlot }, ref) {
  const theme = useColors();
  const insets = useSafeAreaInsets();
  const isReducedMotion = useIsReducedMotion();
  const isKeyboardShown = useIsKeyboardShown();
  const [views, setViews] = useState<TabView[]>(() => [{ id: 1, home: findTabFor(readStartPath(startUrl), DEFAULT_TAB_PATHS) ?? HOME_TAB_PATH, startUrl }]);
  const [activeId, setActiveId] = useState(1);
  const [tabs, setTabs] = useState<PageTab[]>([]);
  const [pageColors, setPageColors] = useState<PageColors>({});
  const [bar, setBar] = useState({ isShown: false, isOverlayOpen: false });
  const [barHeight, setBarHeight] = useState(TAB_BAR_HEIGHT);
  const [slotHeight, setSlotHeight] = useState(0);
  // The open tab slides in from `from` px (0: no slide); `at` starts each slide once the tab is drawn.
  const [slideIn, setSlideIn] = useState({ from: 0, at: 0 });
  const slide = useRef(new Animated.Value(1)).current;
  // Tabs whose page has said hello: until then a tab shows a spinner on the paper.
  const [readyIds, setReadyIds] = useState<ReadonlySet<number>>(() => new Set());

  const viewsRef = useRef(views);
  viewsRef.current = views;
  const activeIdRef = useRef(activeId);
  activeIdRef.current = activeId;
  const tabsRef = useRef(tabs);
  tabsRef.current = tabs;
  const handles = useRef(new Map<number, PortalViewHandle>());
  const states = useRef(new Map<number, TabsState>());
  const recent = useRef<number[]>([1]);
  // The site's dark mode once a member has switched it in a tab (null until then: every page loads it from the cookie).
  const isDarkRef = useRef<boolean | null>(null);
  const nextId = useRef(2);

  const tabHrefs = useCallback(() => (tabsRef.current.length ? tabsRef.current.map((tab) => tab.href) : [...DEFAULT_TAB_PATHS]), []);
  const activeHandle = useCallback(() => handles.current.get(activeIdRef.current) ?? handles.current.values().next().value ?? null, []);
  const homeOf = useCallback((id: number) => viewsRef.current.find((view) => view.id === id)?.home ?? null, []);

  const showBarOf = useCallback((state: TabsState | undefined) => {
    if (!state) return;
    if (state.tabs.length) setTabs(state.tabs);
    setPageColors(state.colors);
    setBar({ isShown: state.isShown, isOverlayOpen: state.isOverlayOpen });
  }, []);

  const activate = useCallback(
    (id: number) => {
      const fromId = activeIdRef.current;
      if (id === fromId) return;
      const to = homeOf(id);
      const direction = to ? readSlideDirection(homeOf(fromId), to, tabHrefs()) : 0;
      activeIdRef.current = id;
      setActiveId(id);
      recent.current = [...recent.current.filter((other) => other !== id), id];
      const state = states.current.get(id);
      showBarOf(state);
      if (state && isDarkRef.current !== null && state.isDark !== isDarkRef.current) handles.current.get(id)?.runInPage(buildDarkScript(isDarkRef.current));
      handles.current.get(id)?.runInPage(buildReportScript());
      // A tab's first visit doesn't slide: there is nothing on it yet to slide.
      const isLoaded = states.current.has(id);
      setSlideIn({ from: isReducedMotion || !isLoaded ? 0 : direction * SLIDE_PX, at: Date.now() });
    },
    [homeOf, tabHrefs, showBarOf, isReducedMotion],
  );

  // Before the new tab is painted: it starts 40 px to its side and see-through, and comes in over 220 ms.
  useLayoutEffect(() => {
    slide.stopAnimation();
    if (!slideIn.from) {
      slide.setValue(1);
      return;
    }
    slide.setValue(0);
    Animated.timing(slide, { toValue: 1, duration: SLIDE_MS, easing: EASE_OUT, useNativeDriver }).start();
  }, [slideIn, slide]);

  // Opens a tab, loading it on its first visit (at `path` when given); a tab already alive goes to `path` itself.
  const openTab = useCallback(
    (href: string, path?: string) => {
      const existing = viewsRef.current.find((view) => view.home === href);
      if (existing) {
        if (path) handles.current.get(existing.id)?.runInPage(path === href ? buildGoScript(path) : buildNavigateScript(path));
        activate(existing.id);
        return;
      }
      const view: TabView = { id: nextId.current++, home: href, startUrl: `${origin}${path ?? href}` };
      recent.current = [...recent.current, view.id];
      const dropped = pickTabsToDrop(recent.current, view.id, LIVE_TAB_LIMIT);
      recent.current = recent.current.filter((id) => !dropped.includes(id));
      for (const id of dropped) {
        handles.current.delete(id);
        states.current.delete(id);
      }
      viewsRef.current = [...viewsRef.current.filter((other) => !dropped.includes(other.id)), view];
      setViews(viewsRef.current);
      activate(view.id);
    },
    [origin, activate],
  );

  // A tap on the open tab scrolls it to the top, or back to its own page from a page under it.
  const onTabPress = useCallback(
    (href: string) => {
      const active = viewsRef.current.find((view) => view.id === activeIdRef.current);
      if (active?.home !== href) {
        openTab(href);
        return;
      }
      const path = states.current.get(active.id)?.path ?? href;
      handles.current.get(active.id)?.runInPage(findTabRoot(path, [href]) && !path.includes("?") ? buildScrollTopScript() : buildGoScript(href));
    },
    [openTab],
  );

  // Signed out in one tab means signed out in all: the others go (they load again, signed in, after the next sign-in).
  const keepOnly = useCallback(
    (id: number) => {
      if (viewsRef.current.length === 1) return;
      for (const other of [...handles.current.keys()]) if (other !== id) handles.current.delete(other);
      for (const other of [...states.current.keys()]) if (other !== id) states.current.delete(other);
      recent.current = [id];
      viewsRef.current = viewsRef.current.filter((view) => view.id === id);
      setViews(viewsRef.current);
      if (activeIdRef.current !== id) {
        activeIdRef.current = id;
        setActiveId(id);
        setSlideIn({ from: 0, at: Date.now() });
      }
    },
    [],
  );

  const onState = useCallback(
    (id: number, state: TabsState) => {
      const before = states.current.get(id);
      states.current.set(id, state);
      // Dark mode switched in this tab: every other live tab follows now (a page loaded later reads the cookie).
      if (before && !state.isFirst && before.isDark !== state.isDark) {
        isDarkRef.current = state.isDark;
        for (const [otherId, handle] of handles.current) if (otherId !== id) handle.runInPage(buildDarkScript(state.isDark));
      }
      if (isSignedOutPath(state.path)) keepOnly(id);
      // A page moved itself to another tab's own page (after posting, after signing in): if that tab isn't open
      // anywhere yet, this web view becomes it, so the bar shows where the member is.
      const hrefs = state.tabs.length ? state.tabs.map((tab) => tab.href) : tabHrefs();
      const root = findTabRoot(state.path, hrefs);
      const view = viewsRef.current.find((other) => other.id === id);
      if (view && root && root !== view.home && !viewsRef.current.some((other) => other.home === root)) {
        viewsRef.current = viewsRef.current.map((other) => (other.id === id ? { ...other, home: root } : other));
        setViews(viewsRef.current);
        handles.current.get(id)?.runInPage(buildHomeScript(root));
      }
      if (id === activeIdRef.current) showBarOf(state);
    },
    [keepOnly, tabHrefs, showBarOf],
  );

  const isBarShown = bar.isShown && !bar.isOverlayOpen && !isKeyboardShown && tabs.length > 0;
  const isSlotShown = !bar.isOverlayOpen && !isKeyboardShown;
  const frame = useMemo(
    () => ({ tab: isKeyboardShown ? 0 : barHeight, mini: bottomSlot && isSlotShown ? slotHeight : 0, ...(Platform.OS === "android" ? { bottomInset: insets.bottom } : {}) }),
    [isKeyboardShown, barHeight, bottomSlot, isSlotShown, slotHeight, insets.bottom],
  );
  const frameRef = useRef(frame);
  frameRef.current = frame;

  // The page lays out around the bar and the slot: every live tab gets the same frame, and a freshly loaded page too.
  useEffect(() => {
    for (const handle of handles.current.values()) handle.runInPage(buildFrameScript(frame));
  }, [frame, views]);

  const onTabsMessage = useCallback(
    (id: number, message: TabsMessage) => {
      if (message.type === "tabs.open") {
        const href = findTabFor(message.path, tabHrefs());
        if (href) openTab(href, message.path);
        return;
      }
      if (message.isFirst) handles.current.get(id)?.runInPage(buildFrameScript(frameRef.current));
      setReadyIds((ready) => (ready.has(id) ? ready : new Set(ready).add(id)));
      onState(id, message);
    },
    [tabHrefs, openTab, onState],
  );

  // A tab that failed while hidden goes, and loads again when it is next opened; the open tab's failure is the app's.
  const onViewFailed = useCallback(
    (id: number, message: string) => {
      if (id === activeIdRef.current) {
        onFailed(message);
        return;
      }
      handles.current.delete(id);
      states.current.delete(id);
      recent.current = recent.current.filter((other) => other !== id);
      viewsRef.current = viewsRef.current.filter((view) => view.id !== id);
      setViews(viewsRef.current);
    },
    [onFailed],
  );

  // Android's back button: back in the open tab first, then to Today, then out of the app.
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      const handle = handles.current.get(activeIdRef.current);
      if (handle?.canGoBack()) {
        handle.goBack();
        return true;
      }
      if (homeOf(activeIdRef.current) !== HOME_TAB_PATH && tabHrefs().includes(HOME_TAB_PATH)) {
        openTab(HOME_TAB_PATH);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [homeOf, tabHrefs, openTab]);

  useImperativeHandle(
    ref,
    () => ({
      call: (method, path, body) => activeHandle()?.call(method, path, body) ?? Promise.resolve({ status: 0, json: null }),
      // An alert or a link: the tab the page belongs to opens it; a page of no tab opens in the open tab.
      navigate: (path) => {
        const safePath = toSafePath(path);
        if (!safePath) return;
        const href = findTabFor(safePath, tabHrefs());
        if (href) openTab(href, safePath);
        else activeHandle()?.navigate(safePath);
      },
      reload: () => activeHandle()?.reload(),
      setPushToken: (token) => {
        for (const handle of handles.current.values()) handle.setPushToken(token);
      },
      // The room page is in whichever tab opened it: every tab hears it (the others ignore another room's close).
      roomClosed: (roomId, reason) => {
        for (const handle of handles.current.values()) handle.roomClosed(roomId, reason);
      },
    }),
    [activeHandle, tabHrefs, openTab],
  );

  const onSlotLayout = (event: LayoutChangeEvent) => setSlotHeight(Math.round(event.nativeEvent.layout.height));
  const translateX = slide.interpolate({ inputRange: [0, 1], outputRange: [slideIn.from, 0] });
  const activeHome = homeOf(activeId);

  return (
    <View style={[styles.screen, { backgroundColor: theme.paper }]}>
      {views.map((view) => {
        const isActive = view.id === activeId;
        return (
          <Animated.View
            key={view.id}
            pointerEvents={isActive ? "auto" : "none"}
            accessibilityElementsHidden={!isActive}
            importantForAccessibility={isActive ? "auto" : "no-hide-descendants"}
            testID={`portal-tab-${view.home.slice(1)}`}
            // Hidden tabs keep their full size (so their page keeps its layout and scroll), drawn under the open one.
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.paper }, isActive ? { zIndex: 1, opacity: slide, transform: [{ translateX }] } : { zIndex: 0, opacity: 0 }]}
          >
            <PortalView
              ref={(handle) => {
                if (handle) handles.current.set(view.id, handle);
              }}
              origin={origin}
              startUrl={view.startUrl}
              home={view.home}
              pushToken={pushToken}
              onOpenRoom={onOpenRoom}
              onAppAction={onAppAction}
              onPageLoaded={onPageLoaded}
              onFailed={(message) => onViewFailed(view.id, message)}
              onTabsMessage={(message) => onTabsMessage(view.id, message)}
            />
            {readyIds.has(view.id) ? null : (
              <View pointerEvents="none" style={[styles.loading, { backgroundColor: theme.paper }]} testID="portal-tab-loading">
                <ActivityIndicator color={theme.muted} />
              </View>
            )}
          </Animated.View>
        );
      })}
      {bottomSlot && isSlotShown ? (
        <View onLayout={onSlotLayout} style={[styles.slot, { bottom: isBarShown ? insets.bottom + barHeight : insets.bottom }]} testID="tab-bar-slot">
          {bottomSlot}
        </View>
      ) : null}
      {isBarShown ? <NativeTabBar tabs={tabs} activeHref={activeHome} pageColors={pageColors} bottomInset={insets.bottom} isReducedMotion={isReducedMotion} onPress={onTabPress} onHeight={setBarHeight} /> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: "hidden" },
  slot: { position: "absolute", left: 0, right: 0, zIndex: 2 },
  loading: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, alignItems: "center", justifyContent: "center" },
});
