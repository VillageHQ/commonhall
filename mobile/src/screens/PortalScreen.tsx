import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PortalHandle } from "../components/portal-types";
import { PortalView } from "../components/PortalView";
import type { Community } from "../lib/community";
import { toPortalUrl } from "../lib/links";
import { setUpPush } from "../push/push";
import { SANS, SERIF, useColors, type Colors } from "../theme";
import { RoomScreen } from "../voice/RoomScreen";

// Pages a signed-out visitor sees: no alerts to register there, and arriving on one means whoever signs in next
// gets this phone's alerts registered again.
const SIGNED_OUT_PATHS = /^\/(signin|auth|sign-up|invite|i\/|setup|forgot-password|reset-password|recover-admin|confirm-email)/;

type PortalScreenProps = {
  community: Community;
  startPath: string | null;
  // An alert tapped while this community is open: { path, at } so the same path twice still moves.
  openRequest: { path: string; at: number } | null;
  onSwitchCommunity: () => void;
};

type OpenRoom = { roomId: string; title: string };

export function PortalScreen({ community, startPath, openRequest, onSwitchCommunity }: PortalScreenProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const portalRef = useRef<PortalHandle>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [room, setRoom] = useState<OpenRoom | null>(null);
  const [isRoomShown, setIsRoomShown] = useState(false);
  const [roomStatus, setRoomStatus] = useState("Joining…");
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
    }),
    [],
  );

  useEffect(() => {
    if (openRequest) portal.navigate(openRequest.path);
  }, [openRequest, portal]);

  const onPageLoaded = useCallback(
    (path: string) => {
      setFailure(null);
      if (SIGNED_OUT_PATHS.test(path)) {
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

  const onOpenRoom = useCallback((roomId: string, title: string) => {
    setRoom((current) => (current?.roomId === roomId ? current : { roomId, title: title || "Voice room" }));
    setIsRoomShown(true);
  }, []);

  const closeRoom = useCallback(() => {
    setRoom(null);
    setIsRoomShown(false);
  }, []);

  return (
    <View style={styles.screen}>
      <View style={[styles.bar, { paddingTop: insets.top + 6 }]}>
        <Text style={styles.barTitle} numberOfLines={1} accessibilityRole="header">
          {community.name}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="More" testID="portal-menu" onPress={() => setIsMenuOpen((value) => !value)} hitSlop={10} style={styles.barButton}>
          <Text style={styles.barButtonText}>•••</Text>
        </Pressable>
      </View>
      {isMenuOpen ? (
        <View style={styles.menu}>
          <Pressable
            accessibilityRole="button"
            style={styles.menuRow}
            onPress={() => {
              setIsMenuOpen(false);
              setFailure(null);
              portal.reload();
            }}
          >
            <Text style={styles.menuText}>Reload</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={styles.menuRow}
            onPress={() => {
              setIsMenuOpen(false);
              void Linking.openURL(startUrl);
            }}
          >
            <Text style={styles.menuText}>Open in the browser</Text>
          </Pressable>
          <Pressable accessibilityRole="button" testID="switch-community" style={styles.menuRow} onPress={onSwitchCommunity}>
            <Text style={styles.menuText}>Switch community</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.portal}>
        <PortalView key={attempt} ref={portalRef} origin={community.origin} startUrl={startUrl} pushToken={pushToken} onOpenRoom={onOpenRoom} onPageLoaded={onPageLoaded} onFailed={setFailure} />
        {failure ? (
          <View style={styles.failure} testID="portal-failure">
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

      {room && !isRoomShown ? (
        <Pressable accessibilityRole="button" testID="room-mini-bar" accessibilityLabel={`Back to ${room.title}`} onPress={() => setIsRoomShown(true)} style={[styles.miniBar, { paddingBottom: insets.bottom + 10 }]}>
          <View style={styles.liveDot} />
          <Text style={styles.miniTitle} numberOfLines={1}>
            {room.title}
          </Text>
          <Text style={styles.miniStatus}>{roomStatus}</Text>
        </Pressable>
      ) : null}
      {room ? (
        <RoomScreen
          key={room.roomId}
          portal={portal}
          origin={community.origin}
          roomId={room.roomId}
          title={room.title}
          isShown={isRoomShown}
          onMinimize={() => setIsRoomShown(false)}
          onClose={closeRoom}
          onStatus={setRoomStatus}
        />
      ) : null}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.paper },
    bar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.paper },
    barTitle: { flex: 1, color: colors.ink, fontFamily: SERIF, fontSize: 19, fontWeight: "500" },
    barButton: { paddingHorizontal: 6, paddingVertical: 4 },
    barButtonText: { color: colors.ink, fontFamily: SANS, fontSize: 16, fontWeight: "700", letterSpacing: 1 },
    menu: { position: "absolute", right: 12, top: 56, zIndex: 10, minWidth: 220, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.sheet, borderRadius: 8, paddingVertical: 4, elevation: 6, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    menuRow: { paddingVertical: 12, paddingHorizontal: 16 },
    menuText: { color: colors.ink, fontFamily: SANS, fontSize: 15 },
    portal: { flex: 1 },
    failure: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.paper, padding: 24, justifyContent: "center" },
    failureTitle: { color: colors.ink, fontFamily: SERIF, fontSize: 24, fontWeight: "500" },
    failureBody: { color: colors.muted, fontFamily: SANS, fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 20 },
    button: { height: 48, borderRadius: 6, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center" },
    buttonText: { color: colors.paper, fontFamily: SANS, fontSize: 15, fontWeight: "600" },
    linkButton: { paddingVertical: 14, alignItems: "center" },
    linkText: { color: colors.ink, fontFamily: SANS, fontSize: 15, textDecorationLine: "underline" },
    miniBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.ink },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live },
    miniTitle: { flex: 1, color: colors.paper, fontFamily: SANS, fontSize: 15, fontWeight: "600" },
    miniStatus: { color: colors.paper, opacity: 0.75, fontFamily: SANS, fontSize: 13 },
  });
}
