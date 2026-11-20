"use client";

import "./voice.css";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { FlashNote, FLASH_KINDS } from "@/components/flash";
import { useIsInBrowser } from "@/components/use-is-in-browser";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { isRouteGone } from "@/platform/http/polling";

import { describeRoomPeople, ROOM_ACCESS, toRoomHref, type CardFace, type RoomCard, type RoomsPageData } from "../contract";
import { ROOMS_POLL_MS, VOICE_QUERY_KEYS, voiceRequests } from "../queries";
import { FollowToggle } from "./follow-toggle";
import { RoomComposer } from "./room-composer";

const TIME_FORMAT: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };
const CARD_TIME_FORMAT: Intl.DateTimeFormatOptions = { weekday: "short", hour: "numeric", minute: "2-digit" };
const FACES_SHOWN = 4;

// A room's time on the member's own clock. The server can't know the browser's zone or language, so while it renders
// and while the browser hydrates, both write UTC in one fixed language (the first paint matches, no hydration error);
// right after, the browser re-renders in its own zone and language.
export function useRoomTimeFormat() {
  const isInBrowser = useIsInBrowser();
  return (iso: string, options: Intl.DateTimeFormatOptions = TIME_FORMAT) =>
    isInBrowser ? new Date(iso).toLocaleString(undefined, options) : new Date(iso).toLocaleString("en-GB", { ...options, timeZone: "UTC" });
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

function Faces({ faces }: { faces: CardFace[] }) {
  return (
    <span className="vr-faces" aria-hidden="true">
      {faces.slice(0, FACES_SHOWN).map((face, index) => (
        <Avatar key={`${face.name}-${index}`} stableId={face.name} name={face.name} imageUrl={face.faceUrl} sizePx={32} />
      ))}
    </span>
  );
}


function InviteOnly() {
  return (
    <span title="Invite only">
      <Lock aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
      <span className="sr-only">Invite only</span>
    </span>
  );
}

function FollowHost({ room, viewerId }: { room: RoomCard; viewerId: string }) {
  return room.hostId === viewerId ? null : <FollowToggle memberId={room.hostId} memberName={room.hostName} isFollowing={room.isFollowingHost} isCompact />;
}

function LiveCard({ room, viewerId }: { room: RoomCard; viewerId: string }) {
  return (
    <div className="vr-card" data-testid="live-room">
      <span className="vr-card-top">
        <span className="vr-live-dot" data-pulse="true" aria-hidden="true" />
        <Link href={toRoomHref(room.id)} className="vr-card-title text-inherit no-underline">
          {room.title}
        </Link>
        {room.access === ROOM_ACCESS.invite ? <InviteOnly /> : null}
      </span>
      <span className="vr-card-foot">
        <span className="flex items-center gap-2.5" data-testid="room-faces">
          <Faces faces={room.faces} />
          <span>{describeRoomPeople(room)}</span>
        </span>
        <span className="fh-btn-row">
          <FollowHost room={room} viewerId={viewerId} />
          <Button asChild size="sm" variant="ink">
            <Link href={toRoomHref(room.id)} aria-label={`Join ${room.title}`}>
              Join
            </Link>
          </Button>
        </span>
      </span>
    </div>
  );
}

function ScheduledCard({ room, viewerId }: { room: RoomCard; viewerId: string }) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const remind = useMutation({
    mutationFn: (isOn: boolean) => voiceRequests.remind({ roomId: room.id, isOn }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: VOICE_QUERY_KEYS.rooms }),
  });
  const start = useMutation({ mutationFn: () => voiceRequests.start(room.id), onSuccess: () => router.push(toRoomHref(room.id)) });
  const isHost = room.hostId === viewerId;
  const formatTime = useRoomTimeFormat();
  return (
    <div className="vr-card" data-testid="scheduled-room">
      <span className="vr-card-top">
        {room.scheduledFor ? <time dateTime={room.scheduledFor} title={formatTime(room.scheduledFor)}>{formatTime(room.scheduledFor, CARD_TIME_FORMAT)}</time> : null}
        {room.access === ROOM_ACCESS.invite ? <InviteOnly /> : null}
      </span>
      <Link href={toRoomHref(room.id)} className="vr-card-title text-inherit no-underline">
        {room.title}
      </Link>
      <span className="vr-card-foot">
        <span className="flex items-center gap-2.5">
          <Faces faces={room.faces.slice(0, 1)} />
          <span>{firstName(room.hostName)}</span>
        </span>
        <span className="fh-btn-row">
          <FollowHost room={room} viewerId={viewerId} />
          {isHost ? (
            <Button size="sm" variant="ink" onClick={() => start.mutate()} disabled={start.isPending}>
              Start now
            </Button>
          ) : (
            <Button size="sm" variant="secondary" aria-pressed={room.hasReminder} onClick={() => remind.mutate(!room.hasReminder)} disabled={remind.isPending}>
              {room.hasReminder ? "Reminder on" : "Remind me"}
            </Button>
          )}
        </span>
      </span>
      {start.error || remind.error ? <p className="fh-hint fh-err">{(start.error ?? remind.error)?.message}</p> : null}
    </div>
  );
}

// Rooms: one "Start or schedule a room" (the re-study: 6 of 12 never found Schedule behind "Start a room"), then who is live (faces, Join) and what's coming up (Remind me).
export function RoomsBoard({ initial, viewerId }: { initial: RoomsPageData; viewerId: string }) {
  const [isComposing, setIsComposing] = useState(false);
  const rooms = useQuery({
    queryKey: VOICE_QUERY_KEYS.rooms,
    queryFn: voiceRequests.rooms,
    initialData: initial,
    refetchInterval: (query) => (isRouteGone(query.state.error) ? false : ROOMS_POLL_MS),
  });
  const { live, scheduled, isConfigured, notify } = rooms.data;

  return (
    <>
      <div className="fh-btn-row">
        <Button variant="ink" onClick={() => setIsComposing((value) => !value)} aria-expanded={isComposing} disabled={!isConfigured}>
          Start or schedule a room
        </Button>
      </div>
      {!isConfigured ? (
        <FlashNote kind={FLASH_KINDS.needs} className="mt-3">
          Rooms need a voice server. An admin sets it up in Set up.
        </FlashNote>
      ) : null}
      {isComposing ? <RoomComposer notify={notify} onClose={() => setIsComposing(false)} /> : null}

      {live.length > 0 ? (
        <section className="fh-section" aria-labelledby="rooms-live">
          <h2 id="rooms-live" className="fh-h2">
            Live now
          </h2>
          <div className="vr-cards">
            {live.map((room) => (
              <LiveCard key={room.id} room={room} viewerId={viewerId} />
            ))}
          </div>
        </section>
      ) : (
        <p className="fh-small fh-muted mt-4" data-testid="rooms-empty">
          Nobody is live right now.
        </p>
      )}

      {scheduled.length > 0 ? (
        <section className="fh-section" aria-labelledby="rooms-scheduled">
          <h2 id="rooms-scheduled" className="fh-h2">
            Coming up
          </h2>
          <div className="vr-cards">
            {scheduled.map((room) => (
              <ScheduledCard key={room.id} room={room} viewerId={viewerId} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
