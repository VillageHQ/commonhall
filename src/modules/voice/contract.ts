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
  rename: "/api/voice/rename",
  alerts: "/api/voice/alerts",
  join: "/api/voice/join",
  start: "/api/voice/start",
  hand: "/api/voice/hand",
  role: "/api/voice/role",
  leave: "/api/voice/leave",
  end: "/api/voice/end",
  remind: "/api/voice/remind",
  adminSettings: "/api/admin/voice",
} as const;

// Who is in a live room, the same words on Today's Live now card and the Rooms cards: "Maya + 3", "Maya is in",
// "Nobody in yet". `faces` leaves the viewer out; `count` is everyone in, the viewer too.
export function describeRoomPeople<Face extends { name: string }>({ faces, count }: { faces: readonly Face[]; count: number }) {
  if (count <= 0) return "Nobody in yet";
  const first = faces[0];
  if (!first) return `${count} in`;
  const firstName = first.name.trim().split(/\s+/)[0] || first.name;
  return count > 1 ? `${firstName} + ${count - 1}` : `${firstName} is in`;
}

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

export const VOICE_LIMITS = {
  titleLength: 120,
  // Room starts a member's alerts go out for in 24 hours; a start past that opens the room quietly.
  broadcastsPerDay: 3,
  // Room alerts a member may get from other people's starts in 24 hours; past that they're skipped.
  notifiesReceivedPerDay: 5,
  // Notify receipts are kept this long.
  receiptDays: 7,
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
  notInRoom: "voice_not_in_room",
  notLive: "voice_room_not_live",
  needsTitle: "voice_needs_title",
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
  notInRoom: "Join the room first.",
  needsTitle: "Give the room a title.",
  notLive: "This room hasn't started yet.",
  badSchedule: "Pick a time in the future, within the next two months.",
  badTarget: "That person isn't in this room.",
} as const;

// Said in the line under every room's title (a live room's "Maya Ortiz · 3 in the room · Never recorded"), on the
// server's pages and the client's alike; the store app's room sheet says it the same way.
export const NEVER_RECORDED = "Never recorded";

// The one line a host sees, once, after a start past the day's alerting starts.
export const QUIET_START_LINE = `People weren't alerted this time: ${VOICE_LIMITS.broadcastsPerDay} rooms a day alert everyone.`;
// The room page's address after a quiet start carries this, so the line shows once.
export const QUIET_START_PARAM = "quiet";

// A room started with one tap is named after its host: "Sam's room" ("James's room").
export function toAutoRoomTitle(name: string) {
  const first = name.trim().split(/\s+/)[0] || "A member";
  return `${first}'s room`;
}

// The alert's words: "Maya started “Pricing”". Joining a room never alerts anyone.
export function toRoomNotifyTitle(name: string, title: string) {
  return `${name} started “${title}”`;
}
export const ROOM_NOTIFY_BODY = "Tap to listen.";

const roomIdSchema = z.string().uuid();

const roomTitleSchema = z.string().trim().min(1, VOICE_MESSAGES.needsTitle).max(VOICE_LIMITS.titleLength);

// Start a room now (no title: "<first name>'s room") or schedule one (a title and a time). Every new room is open to
// every member, and starting it alerts everyone (the members choose what reaches them).
export const createRoomBodySchema = z
  .object({
    title: z.string().trim().max(VOICE_LIMITS.titleLength).optional(),
    // ISO time for a scheduled room; null or left out starts it now.
    scheduledFor: z.string().datetime({ offset: true }).nullable().optional(),
  })
  .strict();
export type CreateRoomBody = z.input<typeof createRoomBodySchema>;
export type CreateRoomInput = z.output<typeof createRoomBodySchema>;

// What starting a room answers: the room, and whether it started quietly (past the day's alerting starts).
export type StartedRoom = { roomId: string; isQuiet: boolean };

// Where a start opens: the room, telling its host once when nobody was alerted.
export function toStartedRoomHref({ roomId, isQuiet }: StartedRoom) {
  return isQuiet ? `${toRoomHref(roomId)}?${QUIET_START_PARAM}=1` : toRoomHref(roomId);
}

// The host renames their room, from inside it.
export const renameBodySchema = z.object({ roomId: roomIdSchema, title: roomTitleSchema }).strict();
export type RenameBody = z.infer<typeof renameBodySchema>;

// The Rooms page's "Room alerts" switch. `timeZone` (the browser's) is kept only by a member who never saved alerts.
export const roomAlertsBodySchema = z.object({ isOn: z.boolean(), timeZone: z.string().min(1).max(100).optional() }).strict();
export type RoomAlertsBody = z.infer<typeof roomAlertsBodySchema>;

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
};

// The Rooms page: live rooms and rooms coming up.
export type RoomsPageData = { live: RoomCard[]; scheduled: RoomCard[]; isConfigured: boolean };

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
