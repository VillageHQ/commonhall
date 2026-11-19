import "server-only";

import { AvailableToTalk } from "@/modules/voice/components/available-to-talk";
import { voiceManifest } from "@/modules/voice/manifest";
import { readAvailableToTalk } from "@/modules/voice/reads";
import type { Database } from "@/platform/database/client";
import type { Environment } from "@/platform/environment";
import { isModuleEnabled } from "@/platform/modules/enablement";

// Rooms' "I'm available to talk" in chat (the Inbox and a conversation): the same button, route, 3-a-day limit and
// refusal words as the Rooms page. Nothing while Rooms is off or LiveKit isn't set up.
export async function readChatAvailableAction(database: Database, environment: Environment, memberId: string) {
  if (!(await isModuleEnabled(database, voiceManifest))) return null;
  const state = await readAvailableToTalk(database, environment, memberId);
  return state.isConfigured ? <AvailableToTalk initial={state} /> : null;
}
