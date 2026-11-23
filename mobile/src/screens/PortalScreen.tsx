import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PortalHandle } from "../components/portal-types";
import { PortalTabs } from "../components/PortalTabs";
import { useAppFonts } from "../fonts";
import type { AppAction } from "../lib/bridge";
import type { Community } from "../lib/community";
import { isSignedOutPath, toPortalUrl } from "../lib/links";
import { setUpPush } from "../push/push";
import { FONTS, useColors, type Colors } from "../theme";
import { useRoomDock } from "../voice/RoomDock";

type PortalScreenProps = {
  community: Community;
  startPath: string | null;
  // An alert tapped while this community is open: { path, at } so the same path twice still moves.
  openRequest: { path: string; at: number } | null;
  onSwitchCommunity: () => void;
};

export function PortalScreen({ community, startPath, openRequest, onSwitchCommunity }: PortalScreenProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const portalRef = useRef<PortalHandle>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const isRegistered = useRef(false);
  const startUrl = useMemo(() => toPortalUrl(community.origin, startPath), [community.origin, startPath]);

  // One stable handle for the room screen, whatever the web view does underneath.
  const portal = useMemo<PortalHandle>(
    () => ({
      call: (method, path, body) => portalRef.current?.call(method, path, body) ?? Promise.resolve({ status: 0, json: null }),
      navigate: (path) => portalRef.current?.navigate(path),
      reload: () => portalRef.current?.reload(),
      setPushToken: (token) => portalRef.current?.setPushToken(token),
      roomClosed: (roomId, reason) => portalRef.current?.roomClosed(roomId, reason),
    }),
    [],
  );

  useEffect(() => {
    if (openRequest) portal.navigate(openRequest.path);
  }, [openRequest, portal]);

  useAppFonts();
  // The live room: its sheet over everything, and its mini bar in the tabs' slot above the tab bar. The page still
  // sends `hasNotified` (always true since round 7) and this build ignores it; `notice` is the page's line for the host.
  const dock = useRoomDock({ portal, origin: community.origin, onRenamed: portal.reload });

  const onPageLoaded = useCallback(
    (path: string) => {
      setFailure(null);
      // Arriving on a signed-out page means whoever signs in next gets this phone's alerts registered again.
      if (isSignedOutPath(path)) {
        isRegistered.current = false;
        return;
      }
      if (isRegistered.current) return;
      isRegistered.current = true;
      void (async () => {
        const setup = await setUpPush();
        if (!setup.token) return;
        setPushToken(setup.token);
        portal.setPushToken(setup.token);
        const answer = await portal.call("POST", "/api/notifications/devices", { type: "expo", token: setup.token });
        // Signed out (401) or offline: try again on the next page.
        if (answer.status !== 200) isRegistered.current = false;
      })();
    },
    [portal],
  );

  // The avatar menu's "This app" group on the page.
  const onAppAction = useCallback(
    (action: AppAction) => {
      if (action === "reload") {
        setFailure(null);
        portal.reload();
      } else if (action === "browser") void Linking.openURL(startUrl);
      else onSwitchCommunity();
    },
    [portal, startUrl, onSwitchCommunity],
  );

  return (
    <View style={styles.screen}>
      {/* No native top bar: the web views reach the top edge and the site pads its own bar under the status bar
          (smooth-app; the viewport is viewport-fit=cover for the app). The tab bar is native (PortalTabs). Reload, Open
          in the browser and Switch community are the avatar menu's "This app" group, arriving through onAppAction. */}
      <View style={styles.portal}>
        <PortalTabs key={attempt} ref={portalRef} origin={community.origin} startUrl={startUrl} pushToken={pushToken} onOpenRoom={dock.openRoom} onAppAction={onAppAction} onPageLoaded={onPageLoaded} onFailed={setFailure} bottomSlot={dock.miniBar} communityName={community.name} />
        {failure ? (
          <View style={[styles.failure, { paddingTop: insets.top + 24 }]} testID="portal-failure">
            <Text style={styles.failureTitle}>We couldn&apos;t open {community.name}</Text>
            <Text style={styles.failureBody}>{failure}</Text>
            <Pressable
              accessibilityRole="button"
              style={styles.button}
              onPress={() => {
                setFailure(null);
                setAttempt((value) => value + 1);
              }}
            >
              <Text style={styles.buttonText}>Try again</Text>
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.linkButton} onPress={onSwitchCommunity}>
              <Text style={styles.linkText}>Choose another community</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      {dock.sheet}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.paper },
    portal: { flex: 1 },
    failure: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.paper, padding: 24, justifyContent: "center" },
    failureTitle: { color: colors.ink, fontFamily: FONTS.serif, fontSize: 24 },
    failureBody: { color: colors.muted, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 20 },
    button: { height: 48, borderRadius: 6, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
    buttonText: { color: colors.paper, fontFamily: FONTS.sansSemiBold, fontSize: 15 },
    linkButton: { paddingVertical: 14, alignItems: "center" },
    linkText: { color: colors.ink, fontFamily: FONTS.sans, fontSize: 15, textDecorationLine: "underline" },
  });
}
