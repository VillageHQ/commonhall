import "server-only";

import type { Database } from "@/platform/database/client";
import { areRoomAlertsOn } from "@/platform/notifications/contract";
import { readPreferences } from "@/platform/notifications/reads";
import { isPaused, readQuietUntil } from "@/platform/notifications/rules";
import { describeUntil } from "./alert-words";

// What Rooms' "Room alerts" switch shows: room alerts on or off, all alerts off, and a pause or quiet time holding
// alerts now in a few words ("Paused until 14:30", "Quiet until 18:00").
export async function readRoomAlertsState(database: Database, memberId: string, now = new Date()) {
  const state = await readPreferences(database, memberId);
  const quietUntil = readQuietUntil(state.quietTimes, state.timeZone, now);
  const heldWords =
    state.pausedUntil && isPaused(state.pausedUntil, now)
      ? `Paused until ${describeUntil(state.pausedUntil, state.timeZone, now)}`
      : quietUntil
        ? `Quiet until ${describeUntil(quietUntil, state.timeZone, now)}`
        : null;
  return { isOn: areRoomAlertsOn(state.offKinds), isAllOff: !state.isOn, heldWords };
}
