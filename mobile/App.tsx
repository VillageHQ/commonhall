import * as Linking from "expo-linking";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { readAddress, type Community } from "./src/lib/community";
import { readAlertPath, readJoinLink } from "./src/lib/links";
import { forgetLastCommunity, readCommunities, rememberCommunity } from "./src/lib/storage";
import { listenForAlertTaps, listenForPreviewAlerts, tapPreviewAlert, type PreviewAlert } from "./src/push/push";
import type { AlertTap } from "./src/push/types";
import { JoinScreen } from "./src/screens/JoinScreen";
import { PortalScreen } from "./src/screens/PortalScreen";
import { SANS, useColors } from "./src/theme";

type Opened = { community: Community; startPath: string | null };

// The app: pick a community (remembered), then its portal. Alerts and join links decide where it opens.
export default function App() {
  const colors = useColors();
  const [isReady, setIsReady] = useState(false);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [opened, setOpened] = useState<Opened | null>(null);
  const [joinAddress, setJoinAddress] = useState("");
  const [openRequest, setOpenRequest] = useState<{ path: string; at: number } | null>(null);
  const [previewAlert, setPreviewAlert] = useState<PreviewAlert | null>(null);
  const openedRef = useRef<Opened | null>(null);
  const communitiesRef = useRef<Community[]>([]);
  // An alert or link that arrives before the remembered communities are read waits here.
  const waitingTap = useRef<AlertTap | null>(null);
  const isReadyRef = useRef(false);

  useEffect(() => {
    openedRef.current = opened;
    communitiesRef.current = communities;
  }, [opened, communities]);

  const open = useCallback(async (community: Community, startPath: string | null) => {
    setOpened({ community, startPath });
    setCommunities(await rememberCommunity(community));
  }, []);

  // A tapped alert opens its page in the community that sent it (`origin`), else in the one that is open.
  const handleTap = useCallback(
    (tap: AlertTap) => {
      const path = readAlertPath(tap.data);
      if (!path) return;
      const origin = typeof tap.data?.origin === "string" ? tap.data.origin : null;
      const current = openedRef.current;
      const sender = origin ? communitiesRef.current.find((community) => community.origin === origin) : undefined;
      if (sender && sender.origin !== current?.community.origin) {
        void open(sender, path);
        return;
      }
      if (current) setOpenRequest({ path, at: Date.now() });
      else if (communitiesRef.current[0]) void open(communitiesRef.current[0], path);
    },
    [open],
  );

  const handleLink = useCallback((url: string | null) => {
    const join = url ? readJoinLink(url) : null;
    if (!join) return;
    const read = readAddress(join.address);
    if (!read.ok) return;
    setOpened(null);
    setJoinAddress(`${read.origin}${join.path ?? ""}`);
  }, []);

  useEffect(() => {
    void (async () => {
      const { communities: remembered, lastOrigin } = await readCommunities();
      communitiesRef.current = remembered;
      setCommunities(remembered);
      const last = remembered.find(({ origin }) => origin === lastOrigin);
      if (last) {
        openedRef.current = { community: last, startPath: null };
        setOpened(openedRef.current);
      }
      isReadyRef.current = true;
      setIsReady(true);
      if (waitingTap.current) handleTap(waitingTap.current);
      waitingTap.current = null;
      handleLink(await Linking.getInitialURL());
    })();
  }, [handleTap, handleLink]);

  useEffect(() => {
    const stopTaps = listenForAlertTaps((tap) => {
      if (isReadyRef.current) handleTap(tap);
      else waitingTap.current = tap;
    });
    const stopPreview = listenForPreviewAlerts(setPreviewAlert);
    const linkSubscription = Linking.addEventListener("url", ({ url }) => handleLink(url));
    return () => {
      stopTaps();
      stopPreview();
      linkSubscription.remove();
    };
  }, [handleTap, handleLink]);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      {!isReady ? (
        <View style={[styles.loading, { backgroundColor: colors.paper }]}>
          <ActivityIndicator color={colors.ink} />
        </View>
      ) : opened ? (
        <PortalScreen
          key={`${opened.community.origin}|${opened.startPath ?? ""}`}
          community={opened.community}
          startPath={opened.startPath}
          openRequest={openRequest}
          onSwitchCommunity={() => {
            void forgetLastCommunity();
            setOpened(null);
          }}
        />
      ) : (
        <JoinScreen key={joinAddress} communities={communities} initialAddress={joinAddress} onJoined={(community, path) => void open(community, path)} />
      )}
      {previewAlert ? (
        <Pressable
          accessibilityRole="button"
          testID="preview-alert"
          onPress={() => {
            tapPreviewAlert(previewAlert);
            setPreviewAlert(null);
          }}
          style={[styles.banner, { backgroundColor: colors.sheet, borderColor: colors.line }]}
        >
          <Text style={[styles.bannerApp, { color: colors.muted }]}>COMMONHALL · now</Text>
          <Text style={[styles.bannerTitle, { color: colors.ink }]}>{previewAlert.title}</Text>
          <Text style={[styles.bannerBody, { color: colors.ink }]} numberOfLines={2}>
            {previewAlert.body}
          </Text>
        </Pressable>
      ) : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: "center", justifyContent: "center" },
  banner: { position: "absolute", top: 12, left: 12, right: 12, borderWidth: 1, borderRadius: 14, padding: 14, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  bannerApp: { fontFamily: SANS, fontSize: 11, fontWeight: "600", letterSpacing: 0.6 },
  bannerTitle: { fontFamily: SANS, fontSize: 15, fontWeight: "600", marginTop: 4 },
  bannerBody: { fontFamily: SANS, fontSize: 14, marginTop: 2 },
});
