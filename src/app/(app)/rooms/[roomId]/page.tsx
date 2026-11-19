import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { LiveRoom } from "@/modules/voice/components/live-room";
import { ScheduledRoom } from "@/modules/voice/components/scheduled-room";
import { ROOM_ACCESS, ROOM_STATUSES, VOICE_PAGE, VOICE_PAGE_TITLE } from "@/modules/voice/contract";
import { voiceManifest } from "@/modules/voice/manifest";
import { readRoomView } from "@/modules/voice/reads";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { modulePage } from "@/platform/modules/module-page";

export const metadata: Metadata = { title: VOICE_PAGE_TITLE };

type RoomPageProps = { params: Promise<{ roomId: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One room: live (the stage, the audience, the controls), coming up (Remind me / Start now), or ended. An invite-only
// room someone isn't on the list for is not found. A live room names its host on the stage, live, since a co-host can
// take over.
export default modulePage(voiceManifest, async function RoomPage({ params }: RoomPageProps) {
  const member = await requireMember();
  const { roomId } = await params;
  if (!UUID.test(roomId)) notFound();
  const room = await readRoomView(getDatabase(), member.id, roomId);
  if (!room) notFound();
  const isInviteOnly = room.access === ROOM_ACCESS.invite;
  const eyebrow = `${room.status === ROOM_STATUSES.live ? "Live" : room.status === ROOM_STATUSES.scheduled ? "Coming up" : "Ended"} · ${isInviteOnly ? "Invite only" : "Open to the community"} · Never recorded`;
  return (
    <>
      <PageHeader back={{ href: VOICE_PAGE, label: "Rooms" }} eyebrow={eyebrow} title={room.title} description={room.status === ROOM_STATUSES.live ? undefined : `Hosted by ${room.hostName}`} />
      {room.status === ROOM_STATUSES.live ? <LiveRoom roomId={room.id} title={room.title} isInviteOnly={isInviteOnly} /> : null}
      {room.status === ROOM_STATUSES.scheduled ? (
        <ScheduledRoom roomId={room.id} scheduledFor={room.scheduledFor} isHost={room.hostId === member.id} hasReminder={room.hasReminder} />
      ) : null}
      {room.status === ROOM_STATUSES.ended ? <p className="fh-small fh-muted">This room has ended. Nothing said in it was recorded.</p> : null}
    </>
  );
});
