import "server-only";

import type { Database } from "@/platform/database/client";
import { isKnownTimeZone, withRoomAlerts } from "@/platform/notifications/contract";
import { readPreferences, readPreferenceSaved } from "@/platform/notifications/reads";
import { savePreferences } from "@/platform/notifications/service";

import type { RoomAlertsBody } from "./contract";

// The Rooms page's "Room alerts" switch: turns both room kinds on or off and keeps every other choice (quiet times, a
// pause, the other kinds). A member who never saved alerts keeps the browser's zone, as a first save on Alerts does.
export async function setRoomAlerts(database: Database, memberId: string, { isOn, timeZone }: RoomAlertsBody) {
  const [{ pausedUntil: _pause, ...preferences }, isSaved] = await Promise.all([readPreferences(database, memberId), readPreferenceSaved(database, memberId)]);
  const zone = !isSaved && timeZone && isKnownTimeZone(timeZone) ? timeZone : preferences.timeZone;
  await savePreferences(database, memberId, { ...preferences, timeZone: zone, offKinds: withRoomAlerts(preferences.offKinds, isOn) });
}
