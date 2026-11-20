import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { LiveRoom } from "@/modules/voice/components/live-room";
import { QuietStartNote } from "@/modules/voice/components/quiet-start-note";
import { RenameRoom } from "@/modules/voice/components/rename-room";
import { ScheduledRoom } from "@/modules/voice/components/scheduled-room";
import { QUIET_START_PARAM, ROOM_ACCESS, ROOM_STATUSES, VOICE_PAGE, VOICE_PAGE_TITLE } from "@/modules/voice/contract";
import { voiceManifest } from "@/modules/voice/manifest";
import { readRoomView } from "@/modules/voice/reads";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { modulePage } from "@/platform/modules/module-page";

export const metadata: Metadata = { title: VOICE_PAGE_TITLE };

type RoomPageProps = { params: Promise<{ roomId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One room: live (the stage, the audience, the controls), coming up (Remind me / Start now), or ended. An invite-only
// room (made before round 7) someone isn't on the list for is not found. A live room names its host on the stage,
// live, since a co-host can take over. The host renames the room here. "Never recorded" shows here, once. An alert's
// address is this page: it joins on open. After a quiet start (past 3 a day) the host sees one line, once.
export default modulePage(voiceManifest, async function RoomPage({ params, searchParams }: RoomPageProps) {
  const member = await requireMember();
  const [{ roomId }, query] = await Promise.all([params, searchParams]);
  if (!UUID.test(roomId)) notFound();
  const room = await readRoomView(getDatabase(), member.id, roomId);
  if (!room) notFound();
  const isInviteOnly = room.access === ROOM_ACCESS.invite;
  const isHost = room.hostId === member.id;
  const isOpen = room.status !== ROOM_STATUSES.ended;
  const status = room.status === ROOM_STATUSES.live ? "Live" : room.status === ROOM_STATUSES.scheduled ? "Coming up" : "Ended";
  const eyebrow = [status, isInviteOnly ? "Invite only" : null, "Never recorded"].filter(Boolean).join(" · ");
  return (
    <>
      <PageHeader
        back={{ href: VOICE_PAGE, label: "Rooms" }}
        eyebrow={eyebrow}
        title={room.title}
        description={room.status === ROOM_STATUSES.live ? undefined : `Hosted by ${room.hostName}`}
        action={isHost && isOpen ? <RenameRoom key={room.title} roomId={room.id} title={room.title} /> : undefined}
      />
      {isHost && room.status === ROOM_STATUSES.live && query[QUIET_START_PARAM] && !room.hasAlerted ? <QuietStartNote /> : null}
      {room.status === ROOM_STATUSES.live ? <LiveRoom roomId={room.id} title={room.title} /> : null}
      {room.status === ROOM_STATUSES.scheduled ? (
        <ScheduledRoom roomId={room.id} scheduledFor={room.scheduledFor} isHost={isHost} hasReminder={room.hasReminder} />
      ) : null}
      {room.status === ROOM_STATUSES.ended ? <p className="fh-small fh-muted">This room has ended.</p> : null}
    </>
  );
});
