"use client";

import "./voice.css";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AudioLines, Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { FlashNote, FLASH_KINDS } from "@/components/flash";
import { useIsInBrowser } from "@/components/use-is-in-browser";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SectionLabel } from "@/components/ui/list-row";
import { isRouteGone } from "@/platform/http/polling";

import { describeRoomPeople, ROOM_ACCESS, toRoomHref, toStartedRoomHref, type CardFace, type RoomCard, type RoomsPageData } from "../contract";
import { ROOMS_POLL_MS, VOICE_QUERY_KEYS, voiceRequests } from "../queries";
import { RoomAlertsSwitch, type RoomAlertsState } from "./room-alerts-switch";
import { RoomsHead } from "./room-start";

const TIME_FORMAT: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };
const CARD_TIME_FORMAT: Intl.DateTimeFormatOptions = { weekday: "short", hour: "numeric", minute: "2-digit" };
const FACES_SHOWN = 4;
// The room card's faces (ui-polish SPEC, "The room card"): the first 40 px, the rest 28 px.
const FIRST_FACE_PX = 40;
const FACE_PX = 28;

// A room's time on the member's own clock. The server can't know the browser's zone or language, so while it renders
// and while the browser hydrates, both write UTC in one fixed language (the first paint matches, no hydration error);
// right after, the browser re-renders in its own zone and language.
export function useRoomTimeFormat() {
  const isInBrowser = useIsInBrowser();
  return (iso: string, options: Intl.DateTimeFormatOptions = TIME_FORMAT) =>
    isInBrowser ? new Date(iso).toLocaleString(undefined, options) : new Date(iso).toLocaleString("en-GB", { ...options, timeZone: "UTC" });
}

function Faces({ faces }: { faces: CardFace[] }) {
  return (
    <span className="vr-faces" aria-hidden="true">
      {faces.slice(0, FACES_SHOWN).map((face, index) => (
        <Avatar key={`${face.name}-${index}`} stableId={face.name} name={face.name} imageUrl={face.faceUrl} sizePx={index === 0 ? FIRST_FACE_PX : FACE_PX} />
      ))}
    </span>
  );
}

function InviteOnly() {
  return (
    <span title="Invite only" className="vr-card-lock">
      <Lock aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
      <span className="sr-only">Invite only</span>
    </span>
  );
}

// The room card (X Spaces, Clubhouse): Live · the host, the title, the faces and Join. The whole card joins: the
// title's link stretches over it, under the button, so no control sits inside another.
function LiveCard({ room }: { room: RoomCard }) {
  return (
    <div className="vr-card" data-testid="live-room">
      <span className="vr-card-top">
        <span className="vr-live-dot" data-pulse="true" aria-hidden="true" />
        <span className="vr-card-live">Live</span>
        <span aria-hidden="true">·</span>
        <span className="vr-card-host">{room.hostName}</span>
        {room.access === ROOM_ACCESS.invite ? <InviteOnly /> : null}
      </span>
      <Link href={toRoomHref(room.id)} className="vr-card-title vr-stretch" data-testid="room-card-link">
        {room.title}
      </Link>
      <span className="vr-card-foot">
        <span className="vr-card-people" data-testid="room-faces">
          <Faces faces={room.faces} />
          <span>{describeRoomPeople(room)}</span>
        </span>
        <Button asChild size="sm" className="vr-over">
          <Link href={toRoomHref(room.id)} aria-label={`Join ${room.title}`}>
            Join
          </Link>
        </Button>
      </span>
    </div>
  );
}

// A room coming up, in the same frame: its time in Live's place, the title, the host's face and name, and Remind me
// (for its host, Start now).
function ScheduledCard({ room, viewerId }: { room: RoomCard; viewerId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const remind = useMutation({
    mutationFn: (isOn: boolean) => voiceRequests.remind({ roomId: room.id, isOn }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VOICE_QUERY_KEYS.rooms }),
  });
  const start = useMutation({ mutationFn: () => voiceRequests.start(room.id), onSuccess: (started) => router.push(toStartedRoomHref(started)) });
  const isHost = room.hostId === viewerId;
  const formatTime = useRoomTimeFormat();
  const host = room.faces[0] ?? { name: room.hostName, faceUrl: null };
  return (
    <div className="vr-card" data-testid="scheduled-room">
      <span className="vr-card-top">
        {room.scheduledFor ? (
          <time className="vr-card-time" dateTime={room.scheduledFor} title={formatTime(room.scheduledFor)}>
            {formatTime(room.scheduledFor, CARD_TIME_FORMAT)}
          </time>
        ) : null}
        {room.access === ROOM_ACCESS.invite ? <InviteOnly /> : null}
      </span>
      <Link href={toRoomHref(room.id)} className="vr-card-title vr-stretch">
        {room.title}
      </Link>
      <span className="vr-card-foot">
        <span className="vr-card-people">
          <Avatar stableId={host.name} name={host.name} imageUrl={host.faceUrl} sizePx={FACE_PX} />
          <span>{room.hostName}</span>
        </span>
        {isHost ? (
          <Button size="sm" className="vr-over" onClick={() => start.mutate()} disabled={start.isPending}>
            Start now
          </Button>
        ) : (
          <Button size="sm" variant="secondary" className="vr-over" aria-pressed={room.hasReminder} onClick={() => remind.mutate(!room.hasReminder)} disabled={remind.isPending}>
            {room.hasReminder ? "Reminder on" : "Remind me"}
          </Button>
        )}
      </span>
      {start.error || remind.error ? <p className="fh-hint fh-err">{(start.error ?? remind.error)?.message}</p> : null}
    </div>
  );
}

// Rooms: the title with "Start a room" (one tap, alerts everyone) and "Schedule for later" under it, then who is live
// (the room cards) and what's coming up (Remind me), and last the member's own Room alerts row.
export function RoomsBoard({ initial, viewerId, alerts }: { initial: RoomsPageData; viewerId: string; alerts: RoomAlertsState }) {
  const rooms = useQuery({
    queryKey: VOICE_QUERY_KEYS.rooms,
    queryFn: voiceRequests.rooms,
    initialData: initial,
    refetchInterval: (query) => (isRouteGone(query.state.error) ? false : ROOMS_POLL_MS),
  });
  const { live, scheduled, isConfigured } = rooms.data;

  return (
    <>
      <RoomsHead isConfigured={isConfigured} />
      {!isConfigured ? (
        <FlashNote kind={FLASH_KINDS.needs} className="mt-3">
          Rooms need a voice server. An admin sets it up in Set up.
        </FlashNote>
      ) : null}

      {live.length > 0 ? (
        <section aria-labelledby="rooms-live">
          <SectionLabel id="rooms-live">Live now</SectionLabel>
          <div className="vr-cards">
            {live.map((room) => (
              <LiveCard key={room.id} room={room} />
            ))}
          </div>
        </section>
      ) : null}

      {scheduled.length > 0 ? (
        <section aria-labelledby="rooms-scheduled">
          <SectionLabel id="rooms-scheduled">Coming up</SectionLabel>
          <div className="vr-cards">
            {scheduled.map((room) => (
              <ScheduledCard key={room.id} room={room} viewerId={viewerId} />
            ))}
          </div>
        </section>
      ) : null}

      {live.length === 0 && scheduled.length === 0 ? (
        <div data-testid="rooms-empty">
          <EmptyState icon={AudioLines} title="No one's in a room right now" description="Start one and everyone hears about it." />
        </div>
      ) : null}

      <RoomAlertsSwitch state={alerts} />
    </>
  );
}
