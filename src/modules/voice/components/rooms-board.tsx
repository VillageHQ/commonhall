"use client";

import "./voice.css";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { FlashNote, FLASH_KINDS } from "@/components/flash";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { isRouteGone } from "@/platform/http/polling";

import { ROOM_ACCESS, toRoomHref, VOICE_LIMITS, type RoomCard } from "../contract";
import { ROOMS_POLL_MS, VOICE_QUERY_KEYS, voiceRequests } from "../queries";
import { RoomComposer } from "./room-composer";

type RoomsData = Awaited<ReturnType<typeof voiceRequests.rooms>>;

const TIME_FORMAT: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" };

export function formatRoomTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, TIME_FORMAT);
}

function Faces({ room }: { room: RoomCard }) {
  const faces = room.stage.slice(0, 4);
  return (
    <span className="vr-faces" aria-hidden="true">
      {faces.map((face) => (
        <Avatar key={face.id} stableId={face.id} name={face.name} imageUrl={face.faceUrl} sizePx={36} />
      ))}
    </span>
  );
}

function stageNames(room: RoomCard) {
  const names = room.stage.map(({ name }) => name);
  if (names.length <= 2) return names.join(" and ");
  return `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

function LiveCard({ room }: { room: RoomCard }) {
  return (
    <Link href={toRoomHref(room.id)} className="vr-card" data-testid="live-room">
      <span className="vr-card-top">
        <span className="vr-live-dot" data-pulse="true" aria-hidden="true" /> Live
        {room.access === ROOM_ACCESS.invite ? (
          <>
            {" · "}
            <Lock aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} /> Invite only
          </>
        ) : null}
      </span>
      <span className="vr-card-title">{room.title}</span>
      <span className="vr-card-foot">
        <span className="flex items-center gap-2.5">
          <Faces room={room} />
          <span>{stageNames(room)}</span>
        </span>
        <span>{room.listenerCount === 1 ? "1 in the room" : `${room.listenerCount} in the room`}</span>
      </span>
    </Link>
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
  return (
    <div className="vr-card" data-testid="scheduled-room">
      <span className="vr-card-top">
        {room.scheduledFor ? formatRoomTime(room.scheduledFor) : "Soon"}
        {room.access === ROOM_ACCESS.invite ? " · Invite only" : ""}
      </span>
      <Link href={toRoomHref(room.id)} className="vr-card-title text-inherit no-underline">
        {room.title}
      </Link>
      <span className="vr-card-foot">
        <span className="flex items-center gap-2.5">
          <Faces room={room} />
          <span>Hosted by {room.hostName}</span>
        </span>
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
      {start.error || remind.error ? <p className="fh-hint fh-err">{(start.error ?? remind.error)?.message}</p> : null}
    </div>
  );
}

export function RoomsBoard({ initial, viewerId }: { initial: RoomsData; viewerId: string }) {
  const router = useRouter();
  const [isComposing, setIsComposing] = useState(false);
  const rooms = useQuery({
    queryKey: VOICE_QUERY_KEYS.rooms,
    queryFn: voiceRequests.rooms,
    initialData: initial,
    refetchInterval: (query) => (isRouteGone(query.state.error) ? false : ROOMS_POLL_MS),
  });
  const available = useMutation({ mutationFn: voiceRequests.available, onSuccess: ({ roomId }) => router.push(toRoomHref(roomId)) });
  const { live, scheduled, broadcastsLeft, isConfigured } = rooms.data;

  return (
    <>
      <div className="fh-btn-row mt-3.5">
        <Button variant="ink" onClick={() => available.mutate()} disabled={available.isPending || !isConfigured || broadcastsLeft === 0}>
          I&rsquo;m available to talk
        </Button>
        <Button variant="secondary" onClick={() => setIsComposing((value) => !value)} aria-expanded={isComposing} disabled={!isConfigured}>
          Start a room
        </Button>
      </div>
      <p className="fh-hint">
        {broadcastsLeft === 0
          ? "You've said you're available 3 times today. Start a room instead, or try again tomorrow."
          : `Opens a room with you as host and alerts the community, except anyone in quiet hours or who muted you. ${broadcastsLeft} of ${VOICE_LIMITS.broadcastsPerDay} left today.`}
      </p>
      {available.error ? (
        <FlashNote kind={FLASH_KINDS.needs} className="mt-3">
          {available.error.message}
        </FlashNote>
      ) : null}
      {!isConfigured ? (
        <FlashNote kind={FLASH_KINDS.needs} className="mt-3">
          Voice rooms aren&rsquo;t set up on this server yet. An admin sets them up in Set up › Rooms.
        </FlashNote>
      ) : null}
      {isComposing ? <RoomComposer onClose={() => setIsComposing(false)} /> : null}

      <section className="fh-section" aria-labelledby="rooms-live">
        <h2 id="rooms-live" className="fh-h2">
          Live now
        </h2>
        {live.length === 0 ? (
          <div className="mt-3">
            <EmptyState title="Nobody is talking right now" description="Start a room, or say you're available and see who drops in." />
          </div>
        ) : (
          <div className="vr-cards">
            {live.map((room) => (
              <LiveCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </section>

      <section className="fh-section" aria-labelledby="rooms-scheduled">
        <h2 id="rooms-scheduled" className="fh-h2">
          Coming up
        </h2>
        {scheduled.length === 0 ? (
          <p className="fh-small fh-muted mt-2">No rooms scheduled. Schedule one with Start a room › Later.</p>
        ) : (
          <div className="vr-cards">
            {scheduled.map((room) => (
              <ScheduledCard key={room.id} room={room} viewerId={viewerId} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
