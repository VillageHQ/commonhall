import { z } from "zod";

// Voice rooms, like Clubhouse and X Spaces. Client-safe: paths, kinds, limits, words and request shapes.

export const VOICE_PAGE = "/rooms";
export const VOICE_ADMIN_PAGE = "/admin/rooms";
export const VOICE_PAGE_TITLE = "Rooms";

export function toRoomHref(roomId: string) {
  return `${VOICE_PAGE}/${encodeURIComponent(roomId)}`;
}

export const VOICE_API_ROUTES = {
  base: "/api/voice",
  rooms: "/api/voice/rooms",
  create: "/api/voice/create",
  notify: "/api/voice/notify",
  follow: "/api/voice/follow",
  join: "/api/voice/join",
  start: "/api/voice/start",
  hand: "/api/voice/hand",
  role: "/api/voice/role",
  leave: "/api/voice/leave",
  end: "/api/voice/end",
  remind: "/api/voice/remind",
  invite: "/api/voice/invite",
  people: "/api/voice/people",
  adminSettings: "/api/admin/voice",
} as const;

export const ROOM_ACCESS = { open: "open", invite: "invite" } as const;
export type RoomAccess = (typeof ROOM_ACCESS)[keyof typeof ROOM_ACCESS];

export const ROOM_STATUSES = { scheduled: "scheduled", live: "live", ended: "ended" } as const;
export type RoomStatus = (typeof ROOM_STATUSES)[keyof typeof ROOM_STATUSES];

// host > cohost > speaker > listener. Host and co-hosts run the room; speakers may talk; listeners only listen.
export const ROOM_ROLES = { host: "host", cohost: "cohost", speaker: "speaker", listener: "listener" } as const;
export type RoomRole = (typeof ROOM_ROLES)[keyof typeof ROOM_ROLES];

export const STAGE_ROLES: readonly RoomRole[] = [ROOM_ROLES.host, ROOM_ROLES.cohost, ROOM_ROLES.speaker];
export const MODERATOR_ROLES: readonly RoomRole[] = [ROOM_ROLES.host, ROOM_ROLES.cohost];

export function isOnStage(role: RoomRole) {
  return STAGE_ROLES.includes(role);
}

export function isModerator(role: RoomRole) {
  return MODERATOR_ROLES.includes(role);
}

// What a moderator can do to someone in the room.
export const ROLE_ACTIONS = {
  inviteUp: "invite_up",
  moveDown: "move_down",
  makeCohost: "make_cohost",
  removeCohost: "remove_cohost",
} as const;
export type RoleAction = (typeof ROLE_ACTIONS)[keyof typeof ROLE_ACTIONS];

// "Notify others": who gets the alert. Everyone only when starting a room (the starter is its host).
export const NOTIFY_AUDIENCES = { followers: "followers", picked: "picked", everyone: "everyone" } as const;
export type NotifyAudience = (typeof NOTIFY_AUDIENCES)[keyof typeof NOTIFY_AUDIENCES];
// The sheet remembers the member's last choice, off included.
export const NOTIFY_OFF = "off";
export type NotifyChoice = NotifyAudience | typeof NOTIFY_OFF;

export const NOTIFY_AUDIENCE_LABELS: Record<NotifyAudience, string> = { followers: "My followers", picked: "People I pick", everyone: "Everyone" };

export const VOICE_LIMITS = {
  titleLength: 120,
  // Notifies a member may send in 24 hours, starting rooms and "Tell people I'm here" together.
  broadcastsPerDay: 3,
  // Room alerts a member may get from other people's notifies in 24 hours; past that they're skipped.
  notifiesReceivedPerDay: 5,
  // "People I pick": at most this many when joining ("Tell people I'm here"), and when starting.
  pickedOnJoin: 10,
  pickedOnStart: 50,
  // Notify receipts are kept this long.
  receiptDays: 7,
  inviteesPerRoom: 50,
  searchLength: 80,
  // Room tokens only let a member in for this long; LiveKit refreshes the token of a member already connected.
  tokenTtlSeconds: 10 * 60,
  // A room with nobody on stage for this long ends.
  emptyStageMs: 2 * 60_000,
  // A scheduled room may be set this far ahead at most.
  scheduleAheadDays: 60,
  chatLength: 500,
} as const;

// Data messages travel through LiveKit only: room chat and reactions are never stored.
export const VOICE_DATA_TOPICS = { chat: "chat", reaction: "reaction" } as const;
export const VOICE_REACTIONS = ["👏", "😂", "❤️", "🔥", "💯", "🙏"] as const;

// LiveKit participant attributes the server sets; a member can't change their own.
export const VOICE_ATTRIBUTES = { role: "role", hand: "hand", face: "face" } as const;

export const VOICE_ERROR_CODES = {
  notFound: "voice_room_not_found",
  notInvited: "voice_not_invited",
  ended: "voice_room_ended",
  notModerator: "voice_not_moderator",
  notConfigured: "voice_not_configured",
  broadcastLimit: "voice_broadcast_limit",
  notifiedAlready: "voice_notified_already",
  notInRoom: "voice_not_in_room",
  notLive: "voice_room_not_live",
  badSchedule: "voice_bad_schedule",
  badTarget: "voice_bad_target",
} as const;

export const VOICE_MESSAGES = {
  notFound: "This room isn't here anymore.",
  notInvited: "This room is invite only, and you're not on the list.",
  ended: "This room has ended.",
  notModerator: "Only the host or a co-host can do that.",
  notHost: "Only the host can do that.",
  notConfigured: "Voice rooms aren't set up on this server yet. An admin sets them up in Set up › Rooms.",
  broadcastLimit: `You've notified people ${VOICE_LIMITS.broadcastsPerDay} times today. Start without notifying, or try again tomorrow.`,
  notifiedAlready: "You've told people about this room already.",
  notInRoom: "Join the room first.",
  pickSomeone: "Pick someone to notify.",
  notLive: "This room hasn't started yet.",
  badSchedule: "Pick a time in the future, within the next two months.",
  badTarget: "That person isn't in this room.",
} as const;

// What a member may still notify today, and when the oldest of today's notifies stops counting.
export type NotifyAllowance = { left: number; resetsAt: string | null };

// The one line shown at the limit, beside the switched-off Notify.
export function describeNotifyReset({ left, resetsAt }: NotifyAllowance, formatTime: (iso: string) => string) {
  if (left > 0) return null;
  return resetsAt ? `${VOICE_LIMITS.broadcastsPerDay} notifies a day. Back at ${formatTime(resetsAt)}.` : `${VOICE_LIMITS.broadcastsPerDay} notifies a day. Back tomorrow.`;
}

// The alert's words (the room notify spec).
export function toRoomNotifyTitle(name: string, title: string, isStart: boolean) {
  return `${name} ${isStart ? "started" : "is in"} “${title}”`;
}
export const ROOM_NOTIFY_BODY = "Tap to listen.";

const roomIdSchema = z.string().uuid();

export const createRoomBodySchema = z
  .object({
    title: z.string().trim().min(1, "Give the room a title.").max(VOICE_LIMITS.titleLength),
    access: z.enum([ROOM_ACCESS.open, ROOM_ACCESS.invite]),
    // ISO time for a scheduled room; null starts it now.
    scheduledFor: z.string().datetime({ offset: true }).nullable(),
    inviteeIds: z.array(z.string().min(1).max(64)).max(VOICE_LIMITS.inviteesPerRoom).default([]),
    // "Notify others"; null (or left out) notifies nobody.
    notify: z
      .object({
        audience: z.enum([NOTIFY_AUDIENCES.followers, NOTIFY_AUDIENCES.picked, NOTIFY_AUDIENCES.everyone]),
        memberIds: z.array(z.string().min(1).max(64)).max(VOICE_LIMITS.pickedOnStart).optional(),
      })
      .strict()
      .nullable()
      .default(null),
  })
  .strict();
export type CreateRoomBody = z.input<typeof createRoomBodySchema>;
export type CreateRoomInput = z.output<typeof createRoomBodySchema>;
export type RoomNotify = NonNullable<CreateRoomInput["notify"]>;

// "Tell people I'm here", once per room after joining.
export const notifyBodySchema = z.object({ roomId: z.string().uuid(), memberIds: z.array(z.string().min(1).max(64)).min(1).max(VOICE_LIMITS.pickedOnJoin) }).strict();
export type NotifyBody = z.infer<typeof notifyBodySchema>;

export const followBodySchema = z.object({ memberId: z.string().min(1).max(64), isFollowing: z.boolean() }).strict();
export type FollowBody = z.infer<typeof followBodySchema>;

export const roomBodySchema = z.object({ roomId: roomIdSchema }).strict();
export type RoomBody = z.infer<typeof roomBodySchema>;

export const handBodySchema = z.object({ roomId: roomIdSchema, isRaised: z.boolean() }).strict();
export type HandBody = z.infer<typeof handBodySchema>;

export const roleBodySchema = z
  .object({
    roomId: roomIdSchema,
    memberId: z.string().min(1).max(64),
    action: z.enum([ROLE_ACTIONS.inviteUp, ROLE_ACTIONS.moveDown, ROLE_ACTIONS.makeCohost, ROLE_ACTIONS.removeCohost]),
  })
  .strict();
export type RoleBody = z.infer<typeof roleBodySchema>;

export const remindBodySchema = z.object({ roomId: roomIdSchema, isOn: z.boolean() }).strict();
export type RemindBody = z.infer<typeof remindBodySchema>;

export const inviteBodySchema = z.object({ roomId: roomIdSchema, memberIds: z.array(z.string().min(1).max(64)).min(1).max(VOICE_LIMITS.inviteesPerRoom) }).strict();
export type InviteBody = z.infer<typeof inviteBodySchema>;

export const peopleBodySchema = z.object({ search: z.string().trim().max(VOICE_LIMITS.searchLength) }).strict();

export const emptyBodySchema = z.object({}).strict();

// What a member needs to connect: the LiveKit address, a short-lived token, and who they are in the room.
export type RoomJoin = { serverUrl: string; token: string; roomName: string; role: RoomRole; identity: string };

export type RoomFace = { id: string; name: string; faceUrl: string | null; role: RoomRole };

export type CardFace = { name: string; faceUrl: string | null };

export type RoomCard = {
  id: string;
  title: string;
  access: RoomAccess;
  status: RoomStatus;
  scheduledFor: string | null;
  startedAt: string | null;
  hostId: string;
  hostName: string;
  // A live room: the people in it now (stage first). A scheduled room: its host and speakers.
  faces: CardFace[];
  // A live room: how many are in it now.
  count: number;
  hasReminder: boolean;
  isInvited: boolean;
  isFollowingHost: boolean;
};

// The Rooms page: live rooms, rooms coming up, and what "Start a room"'s Notify needs.
export type RoomsPageData = { live: RoomCard[]; scheduled: RoomCard[]; isConfigured: boolean; notify: NotifyAllowance & { choice: NotifyChoice } };

export type RoomPeople = { id: string; name: string; faceUrl: string | null }[];

// Settings an admin may save for LiveKit Cloud (or any LiveKit server); the server's own env wins when both exist.
export const VOICE_SETTING_KEYS = { url: "voice_livekit_url", apiKey: "voice_livekit_api_key", apiSecret: "voice_livekit_api_secret" } as const;

export const voiceSettingsBodySchema = z
  .object({
    url: z
      .string()
      .trim()
      .max(300)
      .refine((value) => value === "" || /^wss?:\/\/[^\s]+$/.test(value), "Paste the LiveKit address, starting with wss://"),
    apiKey: z.string().trim().max(200),
    // Empty keeps the saved secret.
    apiSecret: z.string().trim().max(500),
  })
  .strict();
export type VoiceSettingsBody = z.infer<typeof voiceSettingsBodySchema>;

export const VOICE_SOURCES = { server: "server", saved: "saved", none: "none" } as const;
export type VoiceSource = (typeof VOICE_SOURCES)[keyof typeof VOICE_SOURCES];
export type VoiceSettingsView = { source: VoiceSource; url: string | null; apiKey: string | null; hasSecret: boolean; secretStorage: "sealed" | "unencrypted" | "refused" };
