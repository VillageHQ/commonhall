import type { Metadata } from "next";

import { AlertsBell } from "@/components/alerts/alerts-bell";
import { PageHeader } from "@/components/page-header";
import { RoomsBoard } from "@/modules/voice/components/rooms-board";
import { VOICE_PAGE_TITLE } from "@/modules/voice/contract";
import { voiceManifest } from "@/modules/voice/manifest";
import { readRoomsPage } from "@/modules/voice/reads";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { modulePage } from "@/platform/modules/module-page";

export const metadata: Metadata = { title: VOICE_PAGE_TITLE };

// Rooms: live voice rooms now, rooms coming up, "I'm available to talk" and Start a room.
export default modulePage(voiceManifest, async function RoomsPage() {
  const member = await requireMember();
  const initial = await readRoomsPage(getDatabase(), process.env, member.id);
  return (
    <>
      <PageHeader title="Rooms" description="Talk live with your community: drop into a room, or say you're free to talk. Rooms are never recorded." />
      <AlertsBell memberId={member.id} />
      <RoomsBoard initial={initial} viewerId={member.id} />
    </>
  );
});
