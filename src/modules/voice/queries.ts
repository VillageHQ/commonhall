import { z } from "zod";

import { postRequest } from "../../platform/http/post-request.ts";
import {
  VOICE_API_ROUTES,
  type CreateRoomBody,
  type HandBody,
  type RemindBody,
  type RenameBody,
  type RoleBody,
  type RoomAlertsBody,
  type RoomJoin,
  type RoomsPageData,
  type VoiceSettingsBody,
  type VoiceSettingsView,
} from "./contract.ts";

// Client requests for Rooms. The server's answers are trusted shapes; only the fields the screens use are checked.
const okSchema = z.object({ ok: z.boolean() });
const startedSchema = z.object({ roomId: z.string(), isQuiet: z.boolean() });
const roomsSchema = z.custom<RoomsPageData>((value) => typeof value === "object" && value !== null);
const joinSchema = z.custom<RoomJoin>((value) => typeof value === "object" && value !== null && "token" in value);
const settingsSchema = z.custom<VoiceSettingsView>((value) => typeof value === "object" && value !== null && "source" in value);

export const VOICE_QUERY_KEYS = { rooms: ["voice", "rooms"] as const };
export const ROOMS_POLL_MS = 15_000;

export const voiceRequests = {
  rooms: () => postRequest(VOICE_API_ROUTES.rooms, {}, roomsSchema),
  create: (body: CreateRoomBody) => postRequest(VOICE_API_ROUTES.create, body, startedSchema),
  rename: (body: RenameBody) => postRequest(VOICE_API_ROUTES.rename, body, okSchema),
  roomAlerts: (body: RoomAlertsBody) => postRequest(VOICE_API_ROUTES.alerts, body, okSchema),
  join: (roomId: string) => postRequest(VOICE_API_ROUTES.join, { roomId }, joinSchema),
  start: (roomId: string) => postRequest(VOICE_API_ROUTES.start, { roomId }, startedSchema),
  hand: (body: HandBody) => postRequest(VOICE_API_ROUTES.hand, body, okSchema),
  role: (body: RoleBody) => postRequest(VOICE_API_ROUTES.role, body, okSchema),
  leave: (roomId: string) => postRequest(VOICE_API_ROUTES.leave, { roomId }, okSchema),
  end: (roomId: string) => postRequest(VOICE_API_ROUTES.end, { roomId }, okSchema),
  remind: (body: RemindBody) => postRequest(VOICE_API_ROUTES.remind, body, okSchema),
  saveSettings: (body: VoiceSettingsBody) => postRequest(VOICE_API_ROUTES.adminSettings, body, settingsSchema),
};
