import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { readRoomAlertsState } from "@/components/alerts/room-alerts-state";
import { RoomsBoard } from "@/modules/voice/components/rooms-board";
import { VOICE_PAGE_TITLE } from "@/modules/voice/contract";
import { voiceManifest } from "@/modules/voice/manifest";
import { readRoomsPage } from "@/modules/voice/reads-rooms-page";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { modulePage } from "@/platform/modules/module-page";

export const metadata: Metadata = { title: VOICE_PAGE_TITLE };

// Rooms: Start a room (one tap, alerts everyone), the member's Room alerts switch, who is live now, and rooms coming up.
export default modulePage(voiceManifest, async function RoomsPage() {
  const member = await requireMember();
  const database = getDatabase();
  const [initial, alerts] = await Promise.all([readRoomsPage(database, process.env, member.id), readRoomAlertsState(database, member.id)]);
  return (
    <>
      <PageHeader title="Rooms" />
      <RoomsBoard initial={initial} viewerId={member.id} alerts={alerts} />
    </>
  );
});
