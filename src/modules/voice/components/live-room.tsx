"use client";

import "./voice.css";

import { useMutation } from "@tanstack/react-query";
import { DisconnectReason, Room, RoomEvent, Track, type Participant, type RemoteTrack } from "livekit-client";
import { Hand, MessageCircle, Mic, MicOff, SmilePlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";

import { FlashNote, FLASH_KINDS } from "@/components/flash";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionLabel } from "@/components/ui/list-row";
import { Sheet } from "@/components/ui/sheet";
import { readNativeApp, ROOM_CLOSED_REASONS, subscribeToNativeApp, subscribeToRoomClosed, type RoomClosedReason } from "@/platform/native-app/bridge";

import { isModerator, isOnStage, NEVER_RECORDED, ROLE_ACTIONS, ROOM_ROLES, VOICE_ATTRIBUTES, VOICE_DATA_TOPICS, VOICE_LIMITS, VOICE_PAGE, VOICE_REACTIONS, type RoleAction, type RoomRole } from "../contract";
import { voiceRequests } from "../queries";
import { RoomHeader, RoomTitle, type RoomMoreItem } from "./room-header";
import { keepLeftMark, readLeftBeforeReload } from "./room-left-mark";

// Every face's role line in the grid (X Spaces): nobody is left without one.
const ROLE_WORDS: Record<RoomRole, string> = { host: "Host", cohost: "Co-host", speaker: "Speaker", listener: "Listener" };
const ROLE_ORDER: Record<RoomRole, number> = { host: 0, cohost: 1, speaker: 2, listener: 3 };
const REACTION_MS = 2400;
const CHAT_KEEP = 100;
// Raise hand is one tap; this line confirms it, with Undo (council, 23 Nov). Long enough to reach Undo.
const HAND_TOAST_MS = 4000;
// Brought on stage by a host: the banner says so for this long.
const STAGE_BANNER_MS = 6000;
const WIDE_QUERY = "(min-width: 1000px)";

const PHASES = { connecting: "connecting", live: "live", ended: "ended", left: "left", elsewhere: "elsewhere", failed: "failed" } as const;
type Phase = (typeof PHASES)[keyof typeof PHASES];

type Person = { id: string; name: string; role: RoomRole; isHandRaised: boolean; faceUrl: string | null; isSpeaking: boolean; isMuted: boolean; isMe: boolean };
type ChatLine = { id: number; name: string; text: string };

function readRole(participant: Participant): RoomRole {
  const role = participant.attributes[VOICE_ATTRIBUTES.role];
  return role === ROOM_ROLES.host || role === ROOM_ROLES.cohost || role === ROOM_ROLES.speaker ? role : ROOM_ROLES.listener;
}

function toPerson(participant: Participant, isMe: boolean): Person {
  return {
    id: participant.identity,
    name: participant.name || "A member",
    role: readRole(participant),
    isHandRaised: participant.attributes[VOICE_ATTRIBUTES.hand] === "1",
    faceUrl: participant.attributes[VOICE_ATTRIBUTES.face] || null,
    isSpeaking: participant.isSpeaking,
    isMuted: !participant.isMicrophoneEnabled,
    isMe,
  };
}

function readPeople(room: Room) {
  const people = [toPerson(room.localParticipant, true), ...[...room.remoteParticipants.values()].map((participant) => toPerson(participant, false))];
  return people.sort((first, second) => ROLE_ORDER[first.role] - ROLE_ORDER[second.role] || first.name.localeCompare(second.name));
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// What the viewer may do to someone else, by their two roles (the server checks the same rules).
function readActions(viewer: RoomRole, target: Person): { action: RoleAction; label: string }[] {
  if (target.isMe || target.role === ROOM_ROLES.host || !isModerator(viewer)) return [];
  const isHost = viewer === ROOM_ROLES.host;
  const actions: { action: RoleAction; label: string }[] = [];
  if (target.role === ROOM_ROLES.listener) actions.push({ action: ROLE_ACTIONS.inviteUp, label: "Invite to speak" });
  if (target.role === ROOM_ROLES.speaker || (isHost && target.role === ROOM_ROLES.cohost)) actions.push({ action: ROLE_ACTIONS.moveDown, label: "Move to audience" });
  if (isHost && target.role !== ROOM_ROLES.cohost) actions.push({ action: ROLE_ACTIONS.makeCohost, label: "Make co-host" });
  if (isHost && target.role === ROOM_ROLES.cohost) actions.push({ action: ROLE_ACTIONS.removeCohost, label: "Remove as co-host" });
  return actions;
}

function subscribeToWidth(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useIsWide() {
  return useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}

// One face of the grid: a 64 px face with its badges, the name, and the role line (or "Hand up").
function PersonTile({ person, reaction, onSelect }: { person: Person; reaction: string | null; onSelect: (() => void) | null }) {
  const isTalking = person.isSpeaking && !person.isMuted;
  const body = (
    <>
      <span className="vr-face" data-speaking={isTalking}>
        <Avatar stableId={person.id} name={person.name} imageUrl={person.faceUrl} sizePx={64} />
        {isOnStage(person.role) && person.isMuted ? (
          <span className="vr-badge" data-testid="muted-badge">
            <MicOff aria-hidden="true" strokeWidth={1.75} />
          </span>
        ) : null}
        {reaction ? (
          <span className="vr-reaction" aria-hidden="true">
            {reaction}
          </span>
        ) : null}
      </span>
      <span className="vr-person-name">{person.isMe ? `${person.name} (you)` : person.name}</span>
      {person.isHandRaised ? (
        <span className="vr-person-role vr-person-hand">
          <Hand aria-hidden="true" strokeWidth={1.75} />
          Hand up
        </span>
      ) : (
        <span className="vr-person-role">{ROLE_WORDS[person.role]}</span>
      )}
      {isOnStage(person.role) && person.isMuted ? <span className="sr-only">, muted</span> : null}
    </>
  );
  if (!onSelect) {
    return (
      <div className="vr-person" data-testid="room-person" data-role={person.role}>
        {body}
      </div>
    );
  }
  return (
    <button type="button" className="vr-person" data-testid="room-person" data-role={person.role} onClick={onSelect}>
      {body}
    </button>
  );
}

// notice: a line the host reads with the room (the quiet start), shown on the app's room screen too. hostName: the
// room's host as the page read it (a co-host may take over; the room's own people win once it connects). isHost:
// the viewer started it, so the page offers Rename. children: what the page shows under the title (the quiet start).
type LiveRoomProps = { roomId: string; title: string; hostName: string; isHost: boolean; notice?: string; children?: ReactNode };

const SERVER_SNAPSHOT = "unknown";

function readWhere() {
  return readNativeApp() ? "app" : "browser";
}

// In the phone app the room plays in the app's own player (it keeps going with the screen locked); in a browser it
// plays here. Nothing connects until the page knows which (the server can't tell).
export function LiveRoom(props: LiveRoomProps) {
  const where = useSyncExternalStore(subscribeToNativeApp, readWhere, () => SERVER_SNAPSHOT);
  if (where === SERVER_SNAPSHOT) {
    return (
      <>
        <RoomHeader />
        <RoomTitle title={props.title} line={`Joining ${props.title}…`} />
      </>
    );
  }
  if (where === "app") return <AppRoomHandoff {...props} />;
  return <BrowserRoom {...props} />;
}

const APP_CLOSED_WORDS: Record<RoomClosedReason, string> = {
  [ROOM_CLOSED_REASONS.left]: "You left the room.",
  [ROOM_CLOSED_REASONS.ended]: "This room has ended.",
  [ROOM_CLOSED_REASONS.elsewhere]: "You joined this room on another device, so it continues there.",
  [ROOM_CLOSED_REASONS.failed]: "The room didn't open in the app.",
};

// The app plays the room; this page says so until the app closes its room screen, then says why and offers Join again.
// A reload after leaving says it again instead of opening the room (room-left-mark.ts).
// `hasNotified` is always true: "Tell people I'm here" is gone, and app builds from before round 7 (TestFlight 3, the
// Android test APK) hide their Tell people button only on that flag.
function AppRoomHandoff({ roomId, title, hostName, isHost, notice, children }: LiveRoomProps) {
  const router = useRouter();
  const [closedReason, setClosedReason] = useState<RoomClosedReason | null>(() => readLeftBeforeReload(roomId));
  const isLeftBeforeReload = useRef(closedReason !== null);
  // The latest title (the host may rename the room), without opening the room again when it changes.
  const titleRef = useRef(title);
  useEffect(() => {
    titleRef.current = title;
  }, [title]);
  // The notice goes with the first opening only: Join again doesn't repeat it.
  const noticeRef = useRef(notice);
  const handOff = useCallback(() => {
    readNativeApp()?.openRoom(roomId, titleRef.current, { hasNotified: true, ...(noticeRef.current ? { notice: noticeRef.current } : {}) });
    noticeRef.current = undefined;
  }, [roomId]);
  function joinAgain() {
    setClosedReason(null);
    handOff();
  }

  useEffect(() => {
    if (!isLeftBeforeReload.current) handOff();
  }, [handOff]);

  useEffect(() => (closedReason ? keepLeftMark(roomId, closedReason) : undefined), [roomId, closedReason]);

  useEffect(
    () =>
      subscribeToRoomClosed(roomId, (reason) => {
        setClosedReason(reason);
        // Read the room again: an ended room's head stops saying Live.
        router.refresh();
      }),
    [roomId, router],
  );

  const head = (
    <>
      <RoomHeader rename={isHost && closedReason !== ROOM_CLOSED_REASONS.ended ? { roomId, title } : null} />
      <RoomTitle title={title} line={`${hostName} · ${NEVER_RECORDED}`} />
      {children}
    </>
  );

  if (closedReason) {
    return (
      <div className="vr-room" data-testid="room-closed" data-reason={closedReason}>
        {head}
        <FlashNote kind={closedReason === ROOM_CLOSED_REASONS.failed ? FLASH_KINDS.needs : FLASH_KINDS.ok}>{APP_CLOSED_WORDS[closedReason]}</FlashNote>
        <div className="fh-btn-row mt-4">
          {closedReason === ROOM_CLOSED_REASONS.ended ? null : (
            <Button variant="ink" onClick={joinAgain}>
              Join again
            </Button>
          )}
          <Button asChild variant={closedReason === ROOM_CLOSED_REASONS.ended ? "ink" : "secondary"}>
            <Link href={VOICE_PAGE}>Back to Rooms</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="vr-room" data-testid="room-in-app">
      {head}
      <p className="fh-small fh-muted">Playing in the app.</p>
      <div className="fh-btn-row mt-4">
        <Button variant="ink" onClick={handOff}>
          Open the room
        </Button>
        <Button asChild variant="secondary">
          <Link href={VOICE_PAGE}>Back to Rooms</Link>
        </Button>
      </div>
    </div>
  );
}

function BrowserRoom({ roomId, title, hostName, children }: LiveRoomProps) {
  const router = useRouter();
  const isWide = useIsWide();
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>(PHASES.connecting);
  const [failure, setFailure] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [canHear, setCanHear] = useState(true);
  // "Tap for sound" only once there is something to hear: LiveKit reports audio as blocked for a moment while it starts.
  const [hasAudio, setHasAudio] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isHandsOpen, setIsHandsOpen] = useState(false);
  const [isHandToast, setIsHandToast] = useState(false);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [isReacting, setIsReacting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const chatId = useRef(0);
  // From 1000 px the chat and reactions open as panels at the end of the room: brought into view above the pinned bar.
  const chatPanelRef = useRef<HTMLDivElement>(null);
  const reactPanelRef = useRef<HTMLDivElement>(null);

  const [isBroughtUp, setIsBroughtUp] = useState(false);
  // The member's own role the last time the room named it: a host's Invite to speak puts a listener on stage at once
  // (as before), and the banner only says so and offers the two next steps. Joining as the host doesn't count.
  const lastRole = useRef<RoomRole | null>(null);

  const refresh = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const next = readPeople(room);
    setPeople(next);
    const mine = next.find(({ isMe }) => isMe);
    if (!mine) return;
    const before = lastRole.current;
    lastRole.current = mine.role;
    if (before === ROOM_ROLES.listener && isOnStage(mine.role)) {
      setIsBroughtUp(true);
      // On stage now: the hand's line (and its Undo) no longer applies.
      setIsHandToast(false);
    }
    if (!isOnStage(mine.role)) setIsBroughtUp(false);
    // The raised-hands sheet closes once nobody's hand is up, so a later hand doesn't open it by itself.
    if (!next.some((person) => !isOnStage(person.role) && person.isHandRaised)) setIsHandsOpen(false);
  }, []);

  const showReaction = useCallback((identity: string, emoji: string) => {
    setReactions((current) => ({ ...current, [identity]: emoji }));
    setTimeout(() => setReactions((current) => (current[identity] === emoji ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== identity)) : current)), REACTION_MS);
  }, []);

  const addChat = useCallback((name: string, text: string) => {
    chatId.current += 1;
    const line = { id: chatId.current, name, text: text.slice(0, VOICE_LIMITS.chatLength) };
    setChat((current) => [...current.slice(-CHAT_KEEP + 1), line]);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const room = new Room({ adaptiveStream: false, dynacast: false });
    roomRef.current = room;
    const audioBox = audioRef.current;

    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind !== Track.Kind.Audio) return;
        const element = track.attach();
        element.dataset.voice = "remote";
        audioBox?.appendChild(element);
        setHasAudio(true);
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        for (const element of track.detach()) element.remove();
      })
      .on(RoomEvent.ParticipantConnected, refresh)
      .on(RoomEvent.ParticipantDisconnected, refresh)
      .on(RoomEvent.ParticipantAttributesChanged, refresh)
      .on(RoomEvent.ActiveSpeakersChanged, refresh)
      .on(RoomEvent.TrackMuted, refresh)
      .on(RoomEvent.TrackUnmuted, refresh)
      .on(RoomEvent.TrackPublished, refresh)
      .on(RoomEvent.TrackUnpublished, refresh)
      .on(RoomEvent.LocalTrackPublished, refresh)
      .on(RoomEvent.LocalTrackUnpublished, refresh)
      .on(RoomEvent.ParticipantPermissionsChanged, refresh)
      .on(RoomEvent.AudioPlaybackStatusChanged, () => setCanHear(room.canPlaybackAudio))
      .on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
        const sender = participant ? toPerson(participant, false) : null;
        if (!sender) return;
        const text = decoder.decode(payload);
        if (topic === VOICE_DATA_TOPICS.reaction && (VOICE_REACTIONS as readonly string[]).includes(text)) showReaction(sender.id, text);
        if (topic === VOICE_DATA_TOPICS.chat) addChat(sender.name, text);
      })
      .on(RoomEvent.Disconnected, (reason) => {
        if (isCancelled) return;
        if (reason === DisconnectReason.ROOM_DELETED) {
          setPhase(PHASES.ended);
          // The page head says "Live" until the server renders it again.
          router.refresh();
        } else if (reason === DisconnectReason.DUPLICATE_IDENTITY) setPhase(PHASES.elsewhere);
        else setPhase(PHASES.left);
      });

    voiceRequests
      .join(roomId)
      .then(async (joined) => {
        if (isCancelled) return;
        await room.connect(joined.serverUrl, joined.token);
        if (isCancelled) {
          await room.disconnect();
          return;
        }
        setCanHear(room.canPlaybackAudio);
        setPhase(PHASES.live);
        refresh();
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        setFailure(error instanceof Error ? error.message : "We couldn't connect to the room. Try again.");
        setPhase(PHASES.failed);
      });

    return () => {
      isCancelled = true;
      void room.disconnect();
      roomRef.current = null;
    };
  }, [roomId, refresh, showReaction, addChat, router]);

  const me = people.find(({ isMe }) => isMe) ?? null;
  const myRole = me?.role ?? ROOM_ROLES.listener;
  const host = people.find((person) => person.role === ROOM_ROLES.host);
  const hostWords = host?.name ?? hostName;

  // Someone moved off the stage loses the microphone; LiveKit unpublishes it, this keeps the button honest.
  useEffect(() => {
    const room = roomRef.current;
    if (room && !isOnStage(myRole) && room.localParticipant.isMicrophoneEnabled) void room.localParticipant.setMicrophoneEnabled(false).then(refresh, refresh);
  }, [myRole, refresh]);

  useEffect(() => {
    if (!isBroughtUp) return;
    const timer = setTimeout(() => setIsBroughtUp(false), STAGE_BANNER_MS);
    return () => clearTimeout(timer);
  }, [isBroughtUp]);
  useEffect(() => {
    if (!isHandToast) return;
    const timer = setTimeout(() => setIsHandToast(false), HAND_TOAST_MS);
    return () => clearTimeout(timer);
  }, [isHandToast]);

  useEffect(() => {
    if (isWide && isChatOpen) chatPanelRef.current?.scrollIntoView({ block: "nearest" });
  }, [isWide, isChatOpen]);
  useEffect(() => {
    if (isWide && isReacting) reactPanelRef.current?.scrollIntoView({ block: "nearest" });
  }, [isWide, isReacting]);

  const role = useMutation({ mutationFn: voiceRequests.role, onSuccess: () => setSelectedId(null) });
  const hand = useMutation({
    mutationFn: voiceRequests.hand,
    onSuccess: (_answer, body) => setIsHandToast(body.isRaised),
  });
  const end = useMutation({ mutationFn: () => voiceRequests.end(roomId) });
  const [micError, setMicError] = useState<string | null>(null);

  async function toggleMic() {
    const room = roomRef.current;
    if (!room) return;
    setMicError(null);
    try {
      await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
    } catch {
      setMicError("Your browser didn't let us use the microphone. Allow it in the address bar, then try again.");
    }
    refresh();
  }

  async function leave() {
    try {
      await voiceRequests.leave(roomId);
    } finally {
      await roomRef.current?.disconnect();
      router.push(VOICE_PAGE);
    }
  }

  function stepDown() {
    setIsBroughtUp(false);
    if (me) role.mutate({ roomId, memberId: me.id, action: ROLE_ACTIONS.moveDown });
  }

  function react(emoji: string) {
    const room = roomRef.current;
    if (!room) return;
    void room.localParticipant.publishData(encoder.encode(emoji), { reliable: false, topic: VOICE_DATA_TOPICS.reaction });
    showReaction(room.localParticipant.identity, emoji);
    setIsReacting(false);
  }

  function sendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const room = roomRef.current;
    const text = draft.trim();
    if (!room || !text) return;
    void room.localParticipant.publishData(encoder.encode(text.slice(0, VOICE_LIMITS.chatLength)), { reliable: true, topic: VOICE_DATA_TOPICS.chat });
    addChat(`${me?.name ?? "You"} (you)`, text);
    setDraft("");
  }

  const isHostNow = myRole === ROOM_ROLES.host;
  const isClosed = phase === PHASES.ended || phase === PHASES.left || phase === PHASES.elsewhere || phase === PHASES.failed;

  // The header: Leave in the live colour; for the host, End room takes its place and Leave moves into More.
  const more: RoomMoreItem[] = [];
  if (!isClosed && isOnStage(myRole) && !isHostNow) more.push({ label: "Back to listening", onSelect: stepDown, isDisabled: role.isPending, testId: "step-down" });
  if (!isClosed && isHostNow) more.push({ label: "Leave", onSelect: () => void leave(), testId: "leave" });
  const headerEnd = isClosed ? null : isHostNow ? (
    <button type="button" className="vr-header-text" disabled={end.isPending} onClick={() => end.mutate()} data-testid="end-room">
      End room
    </button>
  ) : (
    <button type="button" className="vr-header-text" onClick={() => void leave()} data-testid="leave">
      Leave
    </button>
  );
  const peopleWords = people.length === 1 ? "1 in the room" : `${people.length} in the room`;
  const head = (
    <>
      <RoomHeader end={headerEnd} rename={isHostNow && !isClosed ? { roomId, title } : null} more={more} />
      <RoomTitle title={title} line={phase === PHASES.live ? `${hostWords} · ${peopleWords} · ${NEVER_RECORDED}` : phase === PHASES.connecting ? `Joining ${title}…` : `${hostWords} · ${NEVER_RECORDED}`} />
      {children}
    </>
  );

  if (isClosed) {
    const CLOSED_WORDS: Record<string, string> = {
      [PHASES.ended]: "This room has ended.",
      [PHASES.left]: "You left the room.",
      [PHASES.elsewhere]: "You joined this room in another tab or on another device, so it continues there.",
    };
    const words = CLOSED_WORDS[phase] ?? failure ?? "We couldn't connect to the room.";
    return (
      <div className="vr-room" data-testid="room-closed">
        {head}
        <FlashNote kind={phase === PHASES.failed ? FLASH_KINDS.needs : FLASH_KINDS.ok}>{words}</FlashNote>
        <div className="fh-btn-row mt-4">
          <Button asChild variant="ink">
            <Link href={VOICE_PAGE}>Back to Rooms</Link>
          </Button>
        </div>
      </div>
    );
  }

  const stage = people.filter((person) => isOnStage(person.role));
  const audience = people.filter((person) => !isOnStage(person.role));
  const hands = audience.filter((person) => person.isHandRaised);
  const selected = people.find(({ id }) => id === selectedId) ?? null;
  const selectedActions = selected ? readActions(myRole, selected) : [];
  const canSelect = isModerator(myRole);
  const selectFor = (person: Person) => (canSelect && readActions(myRole, person).length > 0 ? () => setSelectedId(person.id) : null);

  const reactionButtons = (
    <div className="vr-reactions" role="group" aria-label="Reactions">
      {VOICE_REACTIONS.map((emoji) => (
        <button key={emoji} type="button" onClick={() => react(emoji)} aria-label={`React ${emoji}`}>
          {emoji}
        </button>
      ))}
    </div>
  );
  const chatBody = (
    <div className="vr-chat" data-testid="room-chat">
      <div className="vr-chat-list" aria-live="polite">
        {chat.length === 0 ? <p className="fh-muted">No messages yet.</p> : null}
        {chat.map((line) => (
          <p key={line.id}>
            <b>{line.name}</b> {line.text}
          </p>
        ))}
      </div>
      <form onSubmit={sendChat}>
        <Input aria-label="Message the room" value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={VOICE_LIMITS.chatLength} placeholder="Say something to the room" />
        <Button type="submit" variant="ink" disabled={!draft.trim()}>
          Send
        </Button>
      </form>
    </div>
  );

  const isMicOn = isOnStage(myRole) && me ? !me.isMuted : false;

  return (
    <div className="vr-room vr-room-live" data-testid="live-room-page" data-phase={phase} data-my-role={myRole}>
      <div ref={audioRef} hidden />
      {head}
      <p className="sr-only" role="status" data-testid="room-status">
        {phase === PHASES.connecting ? `Joining ${title}…` : `You’re in · ${isOnStage(myRole) ? (me?.isMuted ? "on stage, muted" : "on stage") : "listening"}`}
      </p>
      {!canHear && hasAudio ? (
        <Button variant="ink" className="mt-3" data-testid="tap-for-sound" onClick={() => void roomRef.current?.startAudio().then(() => setCanHear(true))}>
          Tap for sound
        </Button>
      ) : null}
      {micError ? (
        <FlashNote kind={FLASH_KINDS.needs} className="mt-2">
          {micError}
        </FlashNote>
      ) : null}
      {role.error || hand.error || end.error ? (
        <FlashNote kind={FLASH_KINDS.needs} className="mt-3">
          {(role.error ?? hand.error ?? end.error)?.message}
        </FlashNote>
      ) : null}

      <SectionLabel className="vr-section-label">On stage</SectionLabel>
      {stage.length === 0 && phase === PHASES.live ? <p className="vr-empty-stage">Nobody on stage yet.</p> : null}
      <div className="vr-grid" data-testid="stage">
        {stage.map((person) => (
          <PersonTile key={person.id} person={person} reaction={reactions[person.id] ?? null} onSelect={selectFor(person)} />
        ))}
      </div>

      {audience.length > 0 ? <SectionLabel className="vr-section-label">Listening</SectionLabel> : null}
      <div className="vr-grid" data-testid="audience">
        {audience.map((person) => (
          <PersonTile key={person.id} person={person} reaction={reactions[person.id] ?? null} onSelect={selectFor(person)} />
        ))}
      </div>

      {isWide && isChatOpen ? (
        <div className="vr-panel" ref={chatPanelRef}>
          <p className="fh-small font-semibold">Room chat</p>
          {chatBody}
        </div>
      ) : null}
      {isWide && isReacting ? (
        <div className="vr-panel vr-panel-reactions" ref={reactPanelRef}>
          {reactionButtons}
        </div>
      ) : null}

      <Sheet isOpen={Boolean(selected && selectedActions.length > 0)} onClose={() => setSelectedId(null)} title={selected?.name ?? ""}>
        <div className="vr-more" data-testid="person-actions">
          {selected
            ? selectedActions.map(({ action, label }) => (
                <button key={action} type="button" className="vr-more-item" disabled={role.isPending} onClick={() => role.mutate({ roomId, memberId: selected.id, action })}>
                  {label}
                </button>
              ))
            : null}
        </div>
      </Sheet>

      <Sheet isOpen={isHandsOpen && hands.length > 0} onClose={() => setIsHandsOpen(false)} title="Raised hands">
        <div className="vr-hands" data-testid="raised-hands">
          {hands.map((person) => (
            <div key={person.id} className="vr-hand-row">
              <Avatar stableId={person.id} name={person.name} imageUrl={person.faceUrl} sizePx={40} />
              <span className="vr-hand-name">{person.name}</span>
              <Button size="sm" variant="ink" disabled={role.isPending} onClick={() => role.mutate({ roomId, memberId: person.id, action: ROLE_ACTIONS.inviteUp })}>
                Invite to speak
              </Button>
            </div>
          ))}
        </div>
      </Sheet>

      {isWide ? null : (
        <>
          <Sheet isOpen={isReacting} onClose={() => setIsReacting(false)} title="React" className="vr-small-sheet">
            {reactionButtons}
          </Sheet>
          <Sheet isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} title="Room chat" className="vr-small-sheet">
            {chatBody}
          </Sheet>
        </>
      )}

      {isBroughtUp ? (
        <div className="vr-banner" role="status" data-testid="stage-banner">
          <p>{hostWords} brought you on stage. Your mic is off.</p>
          <div className="vr-banner-actions">
            <button
              type="button"
              className="vr-banner-main"
              onClick={() => {
                setIsBroughtUp(false);
                if (me?.isMuted) void toggleMic();
              }}
              data-testid="banner-unmute"
            >
              Unmute
            </button>
            <button type="button" className="vr-banner-quiet" onClick={stepDown} data-testid="banner-step-down">
              Back to listening
            </button>
          </div>
        </div>
      ) : null}

      {isHandToast && !isOnStage(myRole) ? (
        <div className="vr-toast" role="status" data-testid="hand-toast">
          <span>Hand raised. The host sees it.</span>
          <button
            type="button"
            className="vr-toast-undo"
            disabled={hand.isPending}
            onClick={() => {
              setIsHandToast(false);
              hand.mutate({ roomId, isRaised: false });
            }}
          >
            Undo
          </button>
        </div>
      ) : null}

      <div className="vr-dock">
        {isModerator(myRole) && hands.length > 0 ? (
          <button type="button" className="vr-hands-chip" onClick={() => setIsHandsOpen(true)} data-testid="raised-hands-chip">
            <Hand aria-hidden="true" strokeWidth={1.75} />
            Raised hands ({hands.length})
          </button>
        ) : null}
        <div className="vr-bar" data-testid="room-bar">
          {isOnStage(myRole) ? (
            <button type="button" className="vr-main" aria-pressed={isMicOn} aria-label={isMicOn ? "Mic on" : "Mic off"} onClick={() => void toggleMic()} data-testid="mic">
              <span className="vr-main-round" aria-hidden="true">
                {isMicOn ? <Mic strokeWidth={1.5} /> : <MicOff strokeWidth={1.5} />}
              </span>
              <span className="vr-main-caption" aria-hidden="true">
                {isMicOn ? "Mic on" : "Mic off"}
              </span>
            </button>
          ) : (
            <button
              type="button"
              className="vr-main"
              aria-pressed={Boolean(me?.isHandRaised)}
              aria-label={me?.isHandRaised ? "Lower hand" : "Raise hand"}
              disabled={hand.isPending || phase !== PHASES.live}
              onClick={() => hand.mutate({ roomId, isRaised: !me?.isHandRaised })}
              data-testid="hand"
            >
              <span className="vr-main-round" aria-hidden="true">
                <Hand strokeWidth={1.5} />
              </span>
              <span className="vr-main-caption" aria-hidden="true">
                {me?.isHandRaised ? "Lower hand" : "Raise hand"}
              </span>
            </button>
          )}
          <div className="vr-bar-end">
            <button type="button" className="vr-iconbtn vr-iconbtn-round" aria-label="React" aria-pressed={isReacting} onClick={() => setIsReacting((value) => !value)} data-testid="react">
              <SmilePlus aria-hidden="true" strokeWidth={1.5} />
            </button>
            <button type="button" className="vr-iconbtn vr-iconbtn-round" aria-label="Chat" aria-pressed={isChatOpen} onClick={() => setIsChatOpen((value) => !value)} data-testid="chat">
              <MessageCircle aria-hidden="true" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
