import "server-only";

import type { ModuleIntegration } from "@/platform/modules/integration";

import { voiceManifest } from "./manifest";
import { endRoomsHostedBy, tickVoiceRooms } from "./service";

export const voiceModule: ModuleIntegration = {
  manifest: voiceManifest,
  onMemberRemoved: (transaction, removal) => endRoomsHostedBy(transaction, removal.memberId),
  // Hands a room to a co-host when its host is gone, and ends a room with nobody connected for a minute or nobody on
  // stage for 2 minutes.
  jobs: [{ name: "voice-rooms", intervalMs: 60_000, run: (database, environment) => tickVoiceRooms(database, environment) }],
};
