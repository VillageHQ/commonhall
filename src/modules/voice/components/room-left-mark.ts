// Browser-only. In the store app, a room page whose room screen closed because the member left (or because the room
// carries on on another device) keeps saying so after a reload, with Join again, instead of opening the room again.
// The page keeps a mark in the tab's sessionStorage while it shows those words (Join again or going to another page
// drops it), and only a reload reads it: coming to the room from a card or an alert opens it as before.
import { ROOM_CLOSED_REASONS, type RoomClosedReason } from "@/platform/native-app/bridge";

const MARK_PREFIX = "commonhall-room-left:";
const KEPT_REASONS: ReadonlySet<string> = new Set([ROOM_CLOSED_REASONS.left, ROOM_CLOSED_REASONS.elsewhere]);

function isReload() {
  const [entry] = window.performance?.getEntriesByType?.("navigation") ?? [];
  return (entry as PerformanceNavigationTiming | undefined)?.type === "reload";
}

// The reason this room's page showed before the reload, or null (not a reload, no mark, or storage blocked).
export function readLeftBeforeReload(roomId: string): RoomClosedReason | null {
  try {
    if (!isReload()) return null;
    const reason = window.sessionStorage.getItem(MARK_PREFIX + roomId);
    return reason !== null && KEPT_REASONS.has(reason) ? (reason as RoomClosedReason) : null;
  } catch {
    return null;
  }
}

// Marks the page while it shows the reason; the returned function drops the mark (an effect's cleanup).
export function keepLeftMark(roomId: string, reason: RoomClosedReason): () => void {
  if (!KEPT_REASONS.has(reason)) return () => {};
  const key = MARK_PREFIX + roomId;
  try {
    window.sessionStorage.setItem(key, reason);
  } catch {
    return () => {};
  }
  return () => {
    try {
      window.sessionStorage.removeItem(key);
    } catch {}
  };
}
