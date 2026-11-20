"use client";

import "./voice.css";

import { useMutation } from "@tanstack/react-query";
import { DisconnectReason, Room, RoomEvent, Track, type Participant, type RemoteTrack } from "livekit-client";
import { BellRing, Hand, LogOut, MessageSquare, Mic, MicOff, Smile } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";

import { FlashNote, FLASH_KINDS } from "@/components/flash";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { readNativeApp, subscribeToNativeApp } from "@/platform/native-app/bridge";

import {
  describeNotifyReset,
  isModerator,
  isOnStage,
  ROLE_ACTIONS,
  ROOM_ROLES,
  VOICE_ATTRIBUTES,
  VOICE_DATA_TOPICS,
  VOICE_LIMITS,
  VOICE_PAGE,
  VOICE_REACTIONS,
  type NotifyAllowance,
  type RoleAction,
  type RoomPeople,
  type RoomRole,
} from "../contract";
import { voiceRequests } from "../queries";
import { formatResetTime, PeoplePicker } from "./room-composer";

const ROLE_WORDS: Record<RoomRole, string> = { host: "Host", cohost: "Co-host", speaker: "Speaker", listener: "" };
const ROLE_ORDER: Record<RoomRole, number> = { host: 0, cohost: 1, speaker: 2, listener: 3 };
const REACTION_MS = 2400;
const CHAT_KEEP = 100;

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

function PersonTile({ person, reaction, isSelected, onSelect, size }: { person: Person; reaction: string | null; isSelected: boolean; onSelect: (() => void) | null; size: number }) {
  const body = (
    <>
      <span className="vr-ring" data-speaking={person.isSpeaking && !person.isMuted}>
        <Avatar stableId={person.id} name={person.name} imageUrl={person.faceUrl} sizePx={size} />
        {isOnStage(person.role) && person.isMuted ? (
          <span className="vr-badge" aria-label="Muted">
            <MicOff aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
          </span>
        ) : null}
        {person.isHandRaised ? (
          <span className="vr-badge vr-badge-hand" aria-label="Hand raised">
            ✋
          </span>
        ) : null}
        {reaction ? (
          <span className="vr-reaction" aria-hidden="true">
            {reaction}
          </span>
        ) : null}
      </span>
      <span className="vr-person-name">{person.name}</span>
      {ROLE_WORDS[person.role] || person.isMe ? (
        <span className="vr-person-role">{[ROLE_WORDS[person.role], person.isMe ? "You" : ""].filter(Boolean).join(" · ")}</span>
      ) : null}
    </>
  );
  if (!onSelect) return <div className="vr-person" data-testid="room-person" data-role={person.role}>{body}</div>;
  return (
    <button type="button" className="vr-person" data-testid="room-person" data-role={person.role} aria-pressed={isSelected} onClick={onSelect}>
      {body}
    </button>
  );
}

// `hasNotified` and `notify` are for "Tell people I'm here": once per room, within the day's notifies.
type LiveRoomProps = { roomId: string; title: string; isInviteOnly: boolean; hasNotified?: boolean; notify?: NotifyAllowance };

const SERVER_SNAPSHOT = "unknown";

function readWhere() {
  return readNativeApp() ? "app" : "browser";
}

// In the phone app the room plays in the app's own player (it keeps going with the screen locked); in a browser it
// plays here. Nothing connects until the page knows which (the server can't tell).
export function LiveRoom(props: LiveRoomProps) {
  const where = useSyncExternalStore(subscribeToNativeApp, readWhere, () => SERVER_SNAPSHOT);
  if (where === SERVER_SNAPSHOT) return <p className="fh-small fh-muted">Joining {props.title}…</p>;
  if (where === "app") return <AppRoomHandoff roomId={props.roomId} title={props.title} />;
  return <BrowserRoom {...props} />;
}

function AppRoomHandoff({ roomId, title }: { roomId: string; title: string }) {
  useEffect(() => {
    readNativeApp()?.openRoom(roomId, title);
  }, [roomId, title]);
  return (
    <div className="vr-room" data-testid="room-in-app">
      <p className="fh-small fh-muted">Playing in the app.</p>
      <div className="fh-btn-row mt-4">
        <Button variant="ink" onClick={() => readNativeApp()?.openRoom(roomId, title)}>
          Open the room
        </Button>
        <Button asChild variant="secondary">
          <Link href={VOICE_PAGE}>Back to Rooms</Link>
        </Button>
      </div>
    </div>
  );
}

type ToolProps = { icon: ReactNode; label: string; onClick: () => void; isPressed?: boolean; isDisabled?: boolean; testId?: string; accessibleName?: string };

// A labelled room control: an icon with its word under it.
function Tool({ icon, label, onClick, isPressed, isDisabled, testId, accessibleName }: ToolProps) {
  return (
    <button type="button" className="vr-tool" aria-pressed={isPressed} aria-label={accessibleName} disabled={isDisabled} onClick={onClick} data-testid={testId}>
      <span className="vr-round" aria-hidden="true">
        {icon}
      </span>
      <span className="vr-tool-label">{label}</span>
    </button>
  );
}

function BrowserRoom({ roomId, title, isInviteOnly, hasNotified = false, notify = { left: VOICE_LIMITS.broadcastsPerDay, resetsAt: null } }: LiveRoomProps) {
  const router = useRouter();
  const roomRef = useRef<Room | null>(null);
  const audioRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>(PHASES.connecting);
  const [failure, setFailure] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [canHear, setCanHear] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [isReacting, setIsReacting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chat, setChat] = useState<ChatLine[]>([]);
  const [draft, setDraft] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [isTelling, setIsTelling] = useState(false);
  const chatId = useRef(0);

  const refresh = useCallback(() => {
    const room = roomRef.current;
    if (room) setPeople(readPeople(room));
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
        }
        else if (reason === DisconnectReason.DUPLICATE_IDENTITY) setPhase(PHASES.elsewhere);
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

  // Someone moved off the stage loses the microphone; LiveKit unpublishes it, this keeps the button honest.
  useEffect(() => {
    const room = roomRef.current;
    if (room && !isOnStage(myRole) && room.localParticipant.isMicrophoneEnabled) void room.localParticipant.setMicrophoneEnabled(false).then(refresh, refresh);
  }, [myRole, refresh]);

  const role = useMutation({ mutationFn: voiceRequests.role, onSuccess: () => setSelectedId(null) });
  const hand = useMutation({ mutationFn: voiceRequests.hand });
  const end = useMutation({ mutationFn: () => voiceRequests.end(roomId) });
  const invite = useMutation({ mutationFn: (memberIds: string[]) => voiceRequests.invite(roomId, memberIds), onSuccess: () => setIsInviting(false) });
  const tell = useMutation({ mutationFn: (memberIds: string[]) => voiceRequests.notify({ roomId, memberIds }), onSuccess: () => setIsTelling(false) });
  const canTell = !hasNotified && !tell.isSuccess;
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

  if (phase === PHASES.ended || phase === PHASES.left || phase === PHASES.elsewhere || phase === PHASES.failed) {
    const CLOSED_WORDS: Record<string, string> = {
      [PHASES.ended]: "This room has ended.",
      [PHASES.left]: "You left the room.",
      [PHASES.elsewhere]: "You joined this room in another tab or on another device, so it continues there.",
    };
    const words = CLOSED_WORDS[phase] ?? failure ?? "We couldn't connect to the room.";
    return (
      <div className="vr-room" data-testid="room-closed">
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
  const selectFor = (person: Person) => (canSelect && readActions(myRole, person).length > 0 ? () => setSelectedId((current) => (current === person.id ? null : person.id)) : null);

  return (
    <div className="vr-room" data-testid="live-room-page" data-phase={phase} data-my-role={myRole}>
      <div ref={audioRef} hidden />
      <p className="fh-small fh-muted" role="status" data-testid="room-status">
        {phase === PHASES.connecting ? `Joining ${title}…` : `You’re in · ${isOnStage(myRole) ? (me?.isMuted ? "on stage, muted" : "on stage") : "listening"}`}
      </p>
      {!canHear ? (
        <Button variant="ink" className="mt-3" data-testid="tap-for-sound" onClick={() => void roomRef.current?.startAudio().then(() => setCanHear(true))}>
          Tap for sound
        </Button>
      ) : null}
      {micError ? (
        <FlashNote kind={FLASH_KINDS.needs} className="mt-2">
          {micError}
        </FlashNote>
      ) : null}

      <h2 className="vr-section-label">On stage</h2>
      {stage.length === 0 && phase === PHASES.live ? <p className="fh-small fh-muted mt-2">Nobody on stage. It ends in 2 minutes.</p> : null}
      <div className="vr-grid" data-stage="true" data-testid="stage">
        {stage.map((person) => (
          <PersonTile key={person.id} person={person} reaction={reactions[person.id] ?? null} isSelected={selectedId === person.id} onSelect={selectFor(person)} size={64} />
        ))}
      </div>

      <h2 className="vr-section-label">{audience.length === 1 ? "1 listening" : `${audience.length} listening`}</h2>
      <div className="vr-grid" data-testid="audience">
        {audience.map((person) => (
          <PersonTile key={person.id} person={person} reaction={reactions[person.id] ?? null} isSelected={selectedId === person.id} onSelect={selectFor(person)} size={48} />
        ))}
      </div>

      {selected && selectedActions.length > 0 ? (
        <div className="vr-panel" data-testid="person-actions">
          <p className="fh-small font-semibold">{selected.name}</p>
          <div className="fh-btn-row mt-2">
            {selectedActions.map(({ action, label }) => (
              <Button key={action} size="sm" variant={action === ROLE_ACTIONS.inviteUp ? "ink" : "secondary"} disabled={role.isPending} onClick={() => role.mutate({ roomId, memberId: selected.id, action })}>
                {label}
              </Button>
            ))}
          </div>
        </div>
      ) : null}

      {isModerator(myRole) && hands.length > 0 ? (
        <div className="vr-panel" data-testid="raised-hands">
          <p className="fh-small font-semibold">Raised hands</p>
          <div className="vr-hands">
            {hands.map((person) => (
              <div key={person.id} className="vr-hand-row">
                <Avatar stableId={person.id} name={person.name} imageUrl={person.faceUrl} sizePx={28} />
                <span className="vr-hand-name">{person.name}</span>
                <Button size="sm" variant="ink" disabled={role.isPending} onClick={() => role.mutate({ roomId, memberId: person.id, action: ROLE_ACTIONS.inviteUp })}>
                  Invite to speak
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {role.error || hand.error || end.error || invite.error || tell.error ? (
        <FlashNote kind={FLASH_KINDS.needs} className="mt-3">
          {(role.error ?? hand.error ?? end.error ?? invite.error ?? tell.error)?.message}
        </FlashNote>
      ) : null}
      {tell.isSuccess ? (
        <FlashNote kind={FLASH_KINDS.ok} className="mt-3">
          Told them you&rsquo;re here.
        </FlashNote>
      ) : null}
      {isTelling && canTell ? <TellPanel notify={notify} isSending={tell.isPending} onSend={(ids) => tell.mutate(ids)} onClose={() => setIsTelling(false)} /> : null}

      {isInviteOnly && isModerator(myRole) ? (
        isInviting ? (
          <InvitePanel isSaving={invite.isPending} onInvite={(ids) => invite.mutate(ids)} onClose={() => setIsInviting(false)} />
        ) : (
          <Button size="sm" variant="quiet" className="mt-3" onClick={() => setIsInviting(true)}>
            Invite more people
          </Button>
        )
      ) : null}

      {isChatOpen ? (
        <div className="vr-panel vr-chat" data-testid="room-chat">
          <p className="fh-small font-semibold">Room chat</p>
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
            <Button type="submit" size="sm" variant="ink" disabled={!draft.trim()}>
              Send
            </Button>
          </form>
        </div>
      ) : null}

      {isReacting ? (
        <div className="vr-reactions mt-3 w-fit" role="group" aria-label="Reactions">
          {VOICE_REACTIONS.map((emoji) => (
            <button key={emoji} type="button" onClick={() => react(emoji)} aria-label={`React ${emoji}`}>
              {emoji}
            </button>
          ))}
        </div>
      ) : null}

      <div className="vr-bar" data-testid="room-bar">
        <div className="vr-bar-group">
          <Tool icon={<LogOut aria-hidden="true" className="fh-i" strokeWidth={1.5} />} label="Leave" onClick={() => void leave()} testId="leave" />
          <Tool icon={<Smile aria-hidden="true" className="fh-i" strokeWidth={1.5} />} label="React" isPressed={isReacting} onClick={() => setIsReacting((value) => !value)} testId="react" />
          <Tool icon={<MessageSquare aria-hidden="true" className="fh-i" strokeWidth={1.5} />} label="Chat" isPressed={isChatOpen} onClick={() => setIsChatOpen((value) => !value)} testId="chat" />
          {isOnStage(myRole) ? (
            <Tool
              icon={me?.isMuted ? <MicOff aria-hidden="true" className="fh-i" strokeWidth={1.5} /> : <Mic aria-hidden="true" className="fh-i" strokeWidth={1.5} />}
              label={me?.isMuted ? "Unmute" : "Mute"}
              isPressed={!me?.isMuted}
              onClick={() => void toggleMic()}
              testId="mic"
            />
          ) : (
            <Tool
              icon={<Hand aria-hidden="true" className="fh-i" strokeWidth={1.5} />}
              label={me?.isHandRaised ? "Lower hand" : "Raise hand"}
              isPressed={Boolean(me?.isHandRaised)}
              isDisabled={hand.isPending || phase !== PHASES.live}
              onClick={() => hand.mutate({ roomId, isRaised: !me?.isHandRaised })}
              testId="hand"
            />
          )}
          {canTell ? (
            <Tool
              icon={<BellRing aria-hidden="true" className="fh-i" strokeWidth={1.5} />}
              label="Tell people"
              accessibleName="Tell people I'm here"
              isPressed={isTelling}
              isDisabled={phase !== PHASES.live}
              onClick={() => setIsTelling((value) => !value)}
              testId="tell-people"
            />
          ) : null}
        </div>
        {isOnStage(myRole) ? (
          <div className="vr-bar-group">
            {myRole === ROOM_ROLES.host ? (
              <Button variant="secondary" size="sm" disabled={end.isPending} onClick={() => end.mutate()}>
                End room
              </Button>
            ) : (
              <Button variant="quiet" size="sm" disabled={role.isPending} onClick={() => me && role.mutate({ roomId, memberId: me.id, action: ROLE_ACTIONS.moveDown })}>
                Move to audience
              </Button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// "Tell people I'm here": up to 10 people, once per room. At the day's limit, one line says when it resets.
function TellPanel({ notify, isSending, onSend, onClose }: { notify: NotifyAllowance; isSending: boolean; onSend: (ids: string[]) => void; onClose: () => void }) {
  const [picked, setPicked] = useState<RoomPeople>([]);
  const resetLine = describeNotifyReset(notify, formatResetTime);
  return (
    <div className="vr-panel" data-testid="tell-panel">
      {resetLine ? (
        <p className="fh-small fh-muted">{resetLine}</p>
      ) : (
        <PeoplePicker id="room-tell" picked={picked} onChange={setPicked} label="Tell people I'm here" max={VOICE_LIMITS.pickedOnJoin} />
      )}
      <div className="fh-btn-row mt-3">
        {resetLine ? null : (
          <Button size="sm" variant="ink" disabled={isSending || picked.length === 0} onClick={() => onSend(picked.map(({ id }) => id))}>
            Send
          </Button>
        )}
        <Button size="sm" variant="quiet" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function InvitePanel({ isSaving, onInvite, onClose }: { isSaving: boolean; onInvite: (ids: string[]) => void; onClose: () => void }) {
  const [picked, setPicked] = useState<{ id: string; name: string; faceUrl: string | null }[]>([]);
  return (
    <div className="vr-panel">
      <PeoplePicker id="room-invite-more" picked={picked} onChange={setPicked} label="Invite more people" max={VOICE_LIMITS.inviteesPerRoom} />
      <div className="fh-btn-row mt-3">
        <Button size="sm" variant="ink" disabled={isSaving || picked.length === 0} onClick={() => onInvite(picked.map(({ id }) => id))}>
          Invite
        </Button>
        <Button size="sm" variant="quiet" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
