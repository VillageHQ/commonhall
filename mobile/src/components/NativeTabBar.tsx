import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";
import { SvgXml } from "react-native-svg";

import { TAB_BAR_HEIGHT, withStroke, type PageColors, type PageTab } from "../lib/tabs";
import { SANS, useColors } from "../theme";

const INDICATOR_WIDTH = 28;
const MOVE_MS = 220;
const EASE_OUT = Easing.bezier(0.2, 0.8, 0.2, 1);

type NativeTabBarProps = {
  tabs: readonly PageTab[];
  activeHref: string | null;
  pageColors: PageColors;
  bottomInset: number;
  isReducedMotion: boolean;
  onPress: (href: string) => void;
  // The bar's visible height (56 at normal text sizes; more with large text), for the page's layout.
  onHeight: (height: number) => void;
};

// The app's tab bar (ui-polish Part 7), drawn as the site's own (Part 2): 56 px over the home indicator, a hairline on
// top, 24 px line icons 9 px under it, an 11 px label, the open tab in ink and 600 with a 3×28 px line on the top edge
// that slides to a tapped tab, and the badge and the live dot at one place. Its tabs, icons and colours are the page's.
export function NativeTabBar({ tabs, activeHref, pageColors, bottomInset, isReducedMotion, onPress, onHeight }: NativeTabBarProps) {
  const theme = useColors();
  const colors = {
    bar: pageColors.bar ?? theme.sheet,
    rule: pageColors.rule ?? theme.line,
    active: pageColors.active ?? theme.ink,
    inactive: pageColors.inactive ?? theme.muted,
    badge: pageColors.badge ?? theme.ink,
    badgeText: pageColors.badgeText ?? theme.paper,
    live: pageColors.live ?? theme.live,
  };
  const [width, setWidth] = useState(0);
  const indicator = useRef(new Animated.Value(0)).current;
  const isPlaced = useRef(false);
  const activeIndex = tabs.findIndex((tab) => tab.href === activeHref);
  const tabWidth = tabs.length ? width / tabs.length : 0;

  useEffect(() => {
    if (activeIndex < 0 || !tabWidth) return;
    const left = activeIndex * tabWidth + (tabWidth - INDICATOR_WIDTH) / 2;
    if (isReducedMotion || !isPlaced.current) {
      isPlaced.current = true;
      indicator.setValue(left);
      return;
    }
    Animated.timing(indicator, { toValue: left, duration: MOVE_MS, easing: EASE_OUT, useNativeDriver: Platform.OS !== "web" }).start();
  }, [activeIndex, tabWidth, isReducedMotion, indicator]);

  const onLayout = (event: LayoutChangeEvent) => {
    const { width: nextWidth, height } = event.nativeEvent.layout;
    setWidth(nextWidth);
    onHeight(Math.round(height - bottomInset));
  };

  return (
    <View
      accessibilityRole="tablist"
      testID="native-tab-bar"
      onLayout={onLayout}
      style={[styles.bar, { backgroundColor: colors.bar, borderTopColor: colors.rule, paddingBottom: bottomInset }]}
    >
      {tabs.map((tab) => {
        const isActive = tab.href === activeHref;
        const color = isActive ? colors.active : colors.inactive;
        const hasBadge = tab.isLive || tab.count > 0;
        return (
          <Pressable
            key={tab.href}
            accessibilityRole="tab"
            aria-selected={isActive}
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={tab.badgeLabel ? `${tab.label}, ${tab.badgeLabel}` : tab.label}
            testID={`native-tab-${tab.href.slice(1)}`}
            onPress={() => onPress(tab.href)}
            style={({ pressed }) => [styles.tab, pressed ? styles.pressed : null]}
          >
            <View style={styles.icon}>{tab.icon ? <SvgXml xml={withStroke(tab.icon, isActive ? 2 : 1.5)} width={24} height={24} color={color} /> : null}</View>
            <Text numberOfLines={1} maxFontSizeMultiplier={1.6} style={[styles.label, { color, fontWeight: isActive ? "600" : "500" }]}>
              {tab.label}
            </Text>
            {hasBadge ? (
              tab.isLive ? (
                <View style={[styles.dot, { backgroundColor: colors.live, borderColor: colors.bar }]} />
              ) : (
                <View style={[styles.count, { backgroundColor: colors.badge, borderColor: colors.bar }]}>
                  <Text maxFontSizeMultiplier={1.3} style={[styles.countText, { color: colors.badgeText }]}>
                    {tab.count}
                  </Text>
                </View>
              )
            ) : null}
          </Pressable>
        );
      })}
      {activeIndex >= 0 && tabWidth ? (
        <Animated.View pointerEvents="none" testID="native-tab-indicator" style={[styles.indicator, { backgroundColor: colors.active, transform: [{ translateX: indicator }] }]} />
      ) : null}
    </View>
  );
}

const RING = 2;

const styles = StyleSheet.create({
  bar: { position: "absolute", left: 0, right: 0, bottom: 0, flexDirection: "row", borderTopWidth: 1, zIndex: 3 },
  tab: { flex: 1, minHeight: TAB_BAR_HEIGHT - 1, alignItems: "center", paddingTop: 9, paddingBottom: 6, paddingHorizontal: 2 },
  pressed: { opacity: 0.6 },
  icon: { width: 24, height: 24 },
  label: { marginTop: 3, fontFamily: SANS, fontSize: 11, lineHeight: 13, maxWidth: "100%" },
  // The badge and the dot sit at the same place: 6 px from the top, 7 px right of the tab's middle, with a ring.
  count: { position: "absolute", top: 6 - RING, left: "50%", marginLeft: 7 - RING, minWidth: 16 + RING * 2, height: 16 + RING * 2, paddingHorizontal: 4, borderRadius: 10, borderWidth: RING, alignItems: "center", justifyContent: "center" },
  countText: { fontFamily: SANS, fontSize: 10, lineHeight: 14, fontWeight: "600" },
  dot: { position: "absolute", top: 6 - RING, left: "50%", marginLeft: 7 - RING, width: 8 + RING * 2, height: 8 + RING * 2, borderRadius: 6, borderWidth: RING },
  indicator: { position: "absolute", top: -1, left: 0, width: INDICATOR_WIDTH, height: 3, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
});
