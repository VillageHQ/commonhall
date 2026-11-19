import { z } from "zod";

// Alerts: the kinds other parts send, device registration and a member's choices. Client-safe and loaded outside
// Next (schema.ts imports it), so relative imports only.

export const NOTIFICATION_KINDS = {
  intro: "intro",
  answer: "answer",
  message: "message",
  voiceRoom: "voice_room",
  voiceBroadcast: "voice_broadcast",
  library: "library",
} as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[keyof typeof NOTIFICATION_KINDS];

export const NOTIFICATION_KIND_VALUES = Object.values(NOTIFICATION_KINDS) as [NotificationKind, ...NotificationKind[]];

// Only broadcasts can be muted per person; every other kind still comes from a muted member.
export const MUTABLE_KINDS: readonly NotificationKind[] = [NOTIFICATION_KINDS.voiceBroadcast];

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  intro: "Intro asks",
  answer: "Answers to your asks",
  message: "Messages",
  voice_room: "Voice rooms opening",
  voice_broadcast: "“I’m available” broadcasts",
  library: "New in the AI library",
};

// The service worker (public/sw.js) and its offline page (public/offline.html).
export const SERVICE_WORKER_PATH = "/sw.js";

export const DEVICE_TYPES = { webpush: "webpush", expo: "expo" } as const;

export type DeviceType = (typeof DEVICE_TYPES)[keyof typeof DEVICE_TYPES];

export const NOTIFICATION_API_ROUTES = {
  base: "/api/notifications",
  devices: "/api/notifications/devices",
  preferences: "/api/notifications/preferences",
  mutes: "/api/notifications/mutes",
  test: "/api/notifications/test",
  icon: "/api/notifications/icon",
} as const;

const MAXIMUM_ENDPOINT_LENGTH = 2000;
const MAXIMUM_KEY_LENGTH = 200;
const EXPO_TOKEN_PATTERN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{10,200}\]$/;

export const webPushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https?$/ }).max(MAXIMUM_ENDPOINT_LENGTH),
  keys: z.object({ p256dh: z.string().min(1).max(MAXIMUM_KEY_LENGTH), auth: z.string().min(1).max(MAXIMUM_KEY_LENGTH) }),
});

export type WebPushSubscription = z.infer<typeof webPushSubscriptionSchema>;

export const registerDeviceBodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal(DEVICE_TYPES.webpush), subscription: webPushSubscriptionSchema }),
  z.object({ type: z.literal(DEVICE_TYPES.expo), token: z.string().regex(EXPO_TOKEN_PATTERN, "That is not an Expo push token.") }),
]);

export type RegisterDeviceBody = z.infer<typeof registerDeviceBodySchema>;

// Forgetting a device: the browser's endpoint or the app's token.
export const removeDeviceBodySchema = z.object({ address: z.string().min(1).max(MAXIMUM_ENDPOINT_LENGTH) });

const clockTimeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 22:00.");
const DAYS_IN_WEEK = 7;
const SAME_TIME_MESSAGE = "Pick different times for the start and the end.";

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function isKnownTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export const quietHoursSchema = z
  .object({
    isOn: z.boolean(),
    from: clockTimeSchema,
    to: clockTimeSchema,
    // The days a quiet spell starts on (0 = Sunday). An overnight spell started on Friday covers Saturday morning.
    days: z.array(z.int().min(0).max(DAYS_IN_WEEK - 1)).max(DAYS_IN_WEEK),
    timeZone: z.string().min(1).max(100).refine(isKnownTimeZone, "Pick a time zone from the list."),
  })
  .refine(({ from, to }) => from !== to, { message: SAME_TIME_MESSAGE, path: ["to"] });

export type QuietHours = z.infer<typeof quietHoursSchema>;

export const DEFAULT_QUIET_HOURS: QuietHours = { isOn: false, from: "22:00", to: "07:00", days: [...ALL_DAYS], timeZone: "UTC" };

export const preferencesBodySchema = z.object({
  isOn: z.boolean(),
  offKinds: z.array(z.enum(NOTIFICATION_KIND_VALUES)).max(NOTIFICATION_KIND_VALUES.length),
  quietHours: quietHoursSchema,
});

export type AlertPreferences = z.infer<typeof preferencesBodySchema>;

export const DEFAULT_PREFERENCES: AlertPreferences = { isOn: true, offKinds: [], quietHours: DEFAULT_QUIET_HOURS };

export const muteBodySchema = z.object({ userId: z.string().min(1).max(200), isMuted: z.boolean() });

export const testAlertBodySchema = z.object({}).strict();
