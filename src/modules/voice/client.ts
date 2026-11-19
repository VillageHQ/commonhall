import "server-only";

import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";

import { logError } from "@/platform/observability/route-logging";

import { isOnStage, VOICE_ATTRIBUTES, VOICE_LIMITS, type RoomRole } from "./contract";

// The only code that talks to LiveKit. It issues tokens and changes who may speak; it never starts a recording or an
// egress: there is no egress client in this app, and no token carries roomRecord or roomAdmin.

export type VoiceConfig = { serverUrl: string; apiUrl: string; apiKey: string; apiSecret: string };

export type ParticipantFacts = { role: RoomRole; isHandRaised: boolean; faceUrl: string | null };

function toAttributes({ role, isHandRaised, faceUrl }: ParticipantFacts) {
  return { [VOICE_ATTRIBUTES.role]: role, [VOICE_ATTRIBUTES.hand]: isHandRaised ? "1" : "", [VOICE_ATTRIBUTES.face]: faceUrl ?? "" };
}

// Listeners may only listen and send chat and reactions; people on stage may also publish their microphone, never
// a camera or a screen.
function toPermission(role: RoomRole) {
  const canSpeak = isOnStage(role);
  return {
    canSubscribe: true,
    canPublish: canSpeak,
    canPublishSources: canSpeak ? [TrackSource.MICROPHONE] : [],
    canPublishData: true,
    canUpdateMetadata: false,
  };
}

export async function createRoomToken(config: VoiceConfig, roomName: string, identity: string, name: string, facts: ParticipantFacts) {
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity,
    name,
    ttl: VOICE_LIMITS.tokenTtlSeconds,
    attributes: toAttributes(facts),
  });
  const permission = toPermission(facts.role);
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canSubscribe: permission.canSubscribe,
    canPublish: permission.canPublish,
    canPublishSources: permission.canPublishSources,
    canPublishData: permission.canPublishData,
    canUpdateOwnMetadata: false,
  });
  return token.toJwt();
}

function client(config: VoiceConfig) {
  return new RoomServiceClient(config.apiUrl, config.apiKey, config.apiSecret);
}

// LiveKit answers "not found" for a room nobody joined yet and for a member who isn't connected. Neither is a fault:
// the next token carries the same facts.
function isNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const { status, code } = error as { status?: unknown; code?: unknown };
  return status === 404 || code === "not_found";
}

async function tolerateAbsence<Result>(scope: string, run: () => Promise<Result>, fallback: Result) {
  try {
    return await run();
  } catch (error) {
    if (!isNotFound(error)) logError(scope, error);
    return fallback;
  }
}

// Pushes a member's role and hand to everyone in the room at once, and what they may publish.
export async function pushParticipantFacts(config: VoiceConfig, roomName: string, identity: string, facts: ParticipantFacts) {
  await tolerateAbsence(
    "voice-update-participant",
    () => client(config).updateParticipant(roomName, identity, { attributes: toAttributes(facts), permission: toPermission(facts.role) }),
    null,
  );
}

// Who is connected to a room now, by member id. Null when LiveKit can't be reached, so a caller never mistakes an
// outage for an empty room.
export async function readConnectedIdentities(config: VoiceConfig, roomName: string): Promise<string[] | null> {
  try {
    return (await client(config).listParticipants(roomName)).map(({ identity }) => identity);
  } catch (error) {
    if (isNotFound(error)) return [];
    logError("voice-list-participants", error);
    return null;
  }
}

// How many people are in each room, for the Rooms list.
export async function readParticipantCounts(config: VoiceConfig, roomNames: string[]) {
  if (roomNames.length === 0) return new Map<string, number>();
  const rooms = await tolerateAbsence("voice-list-rooms", () => client(config).listRooms(roomNames), []);
  return new Map(rooms.map((room) => [room.name, room.numParticipants]));
}

// Ends the room for everyone connected.
export async function closeLiveRoom(config: VoiceConfig, roomName: string) {
  await tolerateAbsence("voice-delete-room", () => client(config).deleteRoom(roomName), undefined);
}

export async function removeFromRoom(config: VoiceConfig, roomName: string, identity: string) {
  await tolerateAbsence("voice-remove-participant", () => client(config).removeParticipant(roomName, identity), undefined);
}
