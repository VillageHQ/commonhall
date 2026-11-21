import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { PortalHandle } from "../components/portal-types";
import { PortalView } from "../components/PortalView";
import type { AppAction, RoomClosedReason } from "../lib/bridge";
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

// The page still sends `hasNotified` (always true since round 7, for app builds that offered "Tell people I'm here");
// this build has no Tell people and ignores it. `notice` is the page's line for the host (a quiet start).
type OpenRoom = { roomId: string; title: string; notice: string };

export function PortalScreen({ community, startPath, openRequest, onSwitchCommunity }: PortalScreenProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const portalRef = useRef<PortalHandle>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [room, setRoom] = useState<OpenRoom | null>(null);
  const [isRoomShown, setIsRoomShown] = useState(false);
  const [roomStatus, setRoomStatus] = useState({ text: "Joining…", isLive: false });
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

  const roomRef = useRef<OpenRoom | null>(null);
  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  const onOpenRoom = useCallback(
    (roomId: string, title: string, notice: string) => {
      const current = roomRef.current;
      if (current?.roomId !== roomId) {
        // One room at a time: opening another leaves the one playing.
        if (current) void portal.call("POST", "/api/voice/leave", { roomId: current.roomId });
        roomRef.current = { roomId, title: title || "Voice room", notice };
        setRoom(roomRef.current);
      }
      setIsRoomShown(true);
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

  const onRoomStatus = useCallback((text: string, isLive: boolean) => setRoomStatus({ text, isLive }), []);

  // The host renamed the room on its screen: the mini bar follows, and the page under it reads the new title.
  const onRenamed = useCallback(
    (title: string) => {
      setRoom((current) => (current ? { ...current, title } : current));
      if (roomRef.current) roomRef.current = { ...roomRef.current, title };
      portal.reload();
    },
    [portal],
  );

  // The page under the room learns why it closed (it says so and offers Join again).
  const closeRoom = useCallback(
    (reason: RoomClosedReason) => {
      const closing = roomRef.current;
      roomRef.current = null;
      setRoom(null);
      setIsRoomShown(false);
      if (closing) portal.roomClosed(closing.roomId, reason);
    },
    [portal],
  );

  return (
    <View style={styles.screen}>
      {/* No native bar: the web view reaches the top edge and the site pads its own bar under the status bar
          (smooth-app; the viewport is viewport-fit=cover for the app). Reload, Open in the browser and Switch community
          are the avatar menu's "This app" group, arriving through onAppAction. */}
      <View style={styles.portal}>
        <PortalView key={attempt} ref={portalRef} origin={community.origin} startUrl={startUrl} pushToken={pushToken} onOpenRoom={onOpenRoom} onAppAction={onAppAction} onPageLoaded={onPageLoaded} onFailed={setFailure} />
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

      {room && !isRoomShown ? (
        <Pressable accessibilityRole="button" testID="room-mini-bar" accessibilityLabel={`Back to ${room.title}`} onPress={() => setIsRoomShown(true)} style={[styles.miniBar, { paddingBottom: insets.bottom + 10 }]}>
          <View style={[styles.liveDot, roomStatus.isLive ? null : styles.closedDot]} />
          <Text style={styles.miniTitle} numberOfLines={1}>
            {room.title}
          </Text>
          <Text style={styles.miniStatus}>{roomStatus.text}</Text>
        </Pressable>
      ) : null}
      {room ? (
        <RoomScreen
          key={room.roomId}
          portal={portal}
          origin={community.origin}
          roomId={room.roomId}
          title={room.title}
          notice={room.notice}
          isShown={isRoomShown}
          onMinimize={() => setIsRoomShown(false)}
          onClose={closeRoom}
          onStatus={onRoomStatus}
          onRenamed={onRenamed}
        />
      ) : null}
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.paper },
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
    closedDot: { backgroundColor: colors.muted },
    miniTitle: { flex: 1, color: colors.paper, fontFamily: SANS, fontSize: 15, fontWeight: "600" },
    miniStatus: { color: colors.paper, opacity: 0.75, fontFamily: SANS, fontSize: 13 },
  });
}
