import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { AlertTap, PushSetup } from "./types";

// Native alerts through Expo's push service: each community's own server sends them (notify() in the web app) to
// the token this phone registers there.

const CHANNEL_ID = "default";

Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

function readProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? undefined;
}

// Asks once (the phone remembers the answer) and returns the Expo token, or why there is none.
export async function setUpPush(): Promise<PushSetup> {
  if (!Device.isDevice) return { token: null, reason: "Alerts need a real phone; a simulator can't receive them." };
  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, { name: "Alerts", importance: Notifications.AndroidImportance.HIGH });
  }
  let { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
  if (status !== "granted") return { token: null, reason: "Alerts are off for Commonhall in the phone's settings." };
  const projectId = readProjectId();
  if (!projectId) return { token: null, reason: "This build has no EAS project id, so Expo can't address it." };
  try {
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: data, reason: null };
  } catch {
    return { token: null, reason: "Expo's push service didn't answer. Alerts start next time the app opens." };
  }
}

function toTap(response: Notifications.NotificationResponse | null): AlertTap | null {
  if (!response) return null;
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  return { data: data ?? null };
}

// A tap on an alert: the one that opened the app, then each one while it runs.
export function listenForAlertTaps(onTap: (tap: AlertTap) => void) {
  const first = toTap(Notifications.getLastNotificationResponse());
  if (first) {
    onTap(first);
    Notifications.clearLastNotificationResponse();
  }
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const tap = toTap(response);
    if (tap) onTap(tap);
  });
  return () => subscription.remove();
}

// Only the web preview has preview alerts (push.ts).
export type PreviewAlert = { title: string; body: string; data: Record<string, unknown> };

export function listenForPreviewAlerts(_onAlert: (alert: PreviewAlert) => void) {
  return () => undefined;
}

export function tapPreviewAlert(_alert: PreviewAlert) {}
