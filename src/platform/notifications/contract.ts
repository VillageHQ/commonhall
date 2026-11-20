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

// Sent straight to the member: these still come during quiet times while "Let through" is on. Every other kind,
// and any kind added later, is a portfolio kind that quiet times hold back. A pause holds back both.
export const DIRECT_KINDS: readonly NotificationKind[] = [NOTIFICATION_KINDS.intro, NOTIFICATION_KINDS.message, NOTIFICATION_KINDS.answer];

export function isDirectKind(kind: NotificationKind) {
  return DIRECT_KINDS.includes(kind);
}

export const NOTIFICATION_KIND_LABELS: Record<NotificationKind, string> = {
  intro: "Intro asks",
  answer: "Answers",
  message: "Messages",
  voice_room: "Rooms you asked to be reminded of",
  voice_broadcast: "People starting or joining rooms",
  library: "New in the library",
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
  pause: "/api/notifications/pause",
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

export const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
export const MAXIMUM_QUIET_TIMES = 3;
export const QUIET_TIMES_FULL = `Up to ${MAXIMUM_QUIET_TIMES} quiet times. Remove one first.`;
export const DEFAULT_TIME_ZONE = "UTC";

export function isKnownTimeZone(timeZone: string) {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const timeZoneSchema = z.string().min(1).max(100).refine(isKnownTimeZone, "Pick a time zone from the list.");

// A time the portfolio stays quiet: from–to on each chosen day (0 = Sunday), or all day on them. An overnight time
// started on Friday covers Saturday morning. `from` and `to` are kept, unread, while `allDay` is on.
export const quietTimeSchema = z
  .object({
    from: clockTimeSchema,
    to: clockTimeSchema,
    allDay: z.boolean(),
    days: z.array(z.int().min(0).max(DAYS_IN_WEEK - 1)).min(1, "Pick at least one day.").max(DAYS_IN_WEEK),
  })
  .refine(({ from, to, allDay }) => allDay || from !== to, { message: "Pick different times for the start and the end.", path: ["to"] });

export type QuietTime = z.infer<typeof quietTimeSchema>;

export const QUIET_TIME_PRESETS = [
  { label: "Working hours", quietTime: { from: "09:00", to: "18:00", allDay: false, days: [1, 2, 3, 4, 5] } },
  { label: "Evenings", quietTime: { from: "19:00", to: "08:00", allDay: false, days: [...ALL_DAYS] } },
  { label: "Weekends", quietTime: { from: "00:00", to: "00:00", allDay: true, days: [0, 6] } },
] as const satisfies readonly { label: string; quietTime: QuietTime }[];

export const preferencesBodySchema = z.object({
  isOn: z.boolean(),
  offKinds: z.array(z.enum(NOTIFICATION_KIND_VALUES)).max(NOTIFICATION_KIND_VALUES.length),
  quietTimes: z.array(quietTimeSchema).max(MAXIMUM_QUIET_TIMES, QUIET_TIMES_FULL),
  timeZone: timeZoneSchema,
  // During quiet times, alerts sent straight to the member (DIRECT_KINDS) still come.
  letDirectThrough: z.boolean(),
});

export type AlertPreferences = z.infer<typeof preferencesBodySchema>;

export const DEFAULT_PREFERENCES: AlertPreferences = { isOn: true, offKinds: [], quietTimes: [], timeZone: DEFAULT_TIME_ZONE, letDirectThrough: true };

// A pause holds back every alert: for an hour, or until 08:00 tomorrow in the member's time zone. null resumes.
// `timeZone` (the browser's) becomes the member's zone when nothing was saved yet, as a first save does.
export const PAUSE_CHOICES = { hour: "1h", tomorrow: "tomorrow" } as const;

export const pauseBodySchema = z.object({
  until: z.enum([PAUSE_CHOICES.hour, PAUSE_CHOICES.tomorrow]).nullable(),
  timeZone: timeZoneSchema.optional(),
});

export type PauseBody = z.infer<typeof pauseBodySchema>;

export const muteBodySchema = z.object({ userId: z.string().min(1).max(200), isMuted: z.boolean() });

export const testAlertBodySchema = z.object({}).strict();
