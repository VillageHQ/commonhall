// The room's roles and who may do what, as in the web app's voice contract (src/modules/voice/contract.ts). The
// server checks the same rules; these only decide which buttons to show.

export type RoomRole = "host" | "cohost" | "speaker" | "listener";
export type RoleAction = "invite_up" | "move_down" | "make_cohost" | "remove_cohost";

export const ROLE_WORDS: Record<RoomRole, string> = { host: "Host", cohost: "Co-host", speaker: "Speaker", listener: "" };
export const ROLE_ORDER: Record<RoomRole, number> = { host: 0, cohost: 1, speaker: 2, listener: 3 };
// The server's answer to a second "Tell people I'm here" in one room (VOICE_ERROR_CODES.notifiedAlready).
export const NOTIFIED_ALREADY = "voice_notified_already";
export const REACTIONS = ["👏", "😂", "❤️", "🔥", "💯", "🙏"] as const;

export function readRole(value: string | undefined): RoomRole {
  return value === "host" || value === "cohost" || value === "speaker" ? value : "listener";
}

export function isOnStage(role: RoomRole) {
  return role !== "listener";
}

export function isModerator(role: RoomRole) {
  return role === "host" || role === "cohost";
}

export function readActions(viewer: RoomRole, target: { role: RoomRole; isMe: boolean }): { action: RoleAction; label: string }[] {
  if (target.isMe || target.role === "host" || !isModerator(viewer)) return [];
  const isHost = viewer === "host";
  const actions: { action: RoleAction; label: string }[] = [];
  if (target.role === "listener") actions.push({ action: "invite_up", label: "Invite to speak" });
  if (target.role === "speaker" || (isHost && target.role === "cohost")) actions.push({ action: "move_down", label: "Move to audience" });
  if (isHost && target.role !== "cohost") actions.push({ action: "make_cohost", label: "Make co-host" });
  if (isHost && target.role === "cohost") actions.push({ action: "remove_cohost", label: "Remove as co-host" });
  return actions;
}
