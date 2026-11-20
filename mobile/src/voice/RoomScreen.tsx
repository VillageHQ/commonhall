import { DisconnectReason, Room, RoomEvent, Track, type Participant, type RemoteTrack } from "livekit-client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listenToVoiceService, showVoiceService, stopVoiceService } from "../../modules/voice-service";
import type { PortalHandle } from "../components/portal-types";
import { readFailureMessage } from "../lib/bridge";
import { SANS, SERIF, useColors, type Colors } from "../theme";
import { playRemoteAudio, startRoomAudio, stopRemoteAudio, stopRoomAudio } from "./audio";
import { isModerator, isOnStage, readActions, readRole, ROLE_ORDER, ROLE_WORDS, REACTIONS, type RoleAction, type RoomRole } from "./rules";

// A live voice room, native: LiveKit's client on the phone's own WebRTC, so it keeps playing with the screen locked
// (Android: the voice service; iOS: the audio background mode). Every role change still goes through the server's
// voice API, called through the portal page (its cookie, its origin). Never recorded.

type Phase = "connecting" | "live" | "ended" | "left" | "elsewhere" | "failed";
type Person = { id: string; name: string; role: RoomRole; isHandRaised: boolean; faceUrl: string | null; isSpeaking: boolean; isMuted: boolean; isMe: boolean };
type JoinAnswer = { serverUrl: string; token: string };

const REACTION_MS = 2400;
// "Tell people I'm here": up to this many, once per room (the server's limit too).
const TELL_MAXIMUM = 10;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toPerson(participant: Participant, isMe: boolean, origin: string): Person {
  const face = participant.attributes.face || null;
  return {
    id: participant.identity,
    name: participant.name || "A member",
    role: readRole(participant.attributes.role),
    isHandRaised: participant.attributes.hand === "1",
    faceUrl: face ? (face.startsWith("/") ? `${origin}${face}` : face) : null,
    isSpeaking: participant.isSpeaking,
    isMuted: !participant.isMicrophoneEnabled,
    isMe,
  };
}

function readPeople(room: Room, origin: string) {
  const people = [toPerson(room.localParticipant, true, origin), ...[...room.remoteParticipants.values()].map((participant) => toPerson(participant, false, origin))];
  return people.sort((first, second) => ROLE_ORDER[first.role] - ROLE_ORDER[second.role] || first.name.localeCompare(second.name));
}

function readJoin(json: unknown): JoinAnswer | null {
  if (!json || typeof json !== "object") return null;
  const { serverUrl, token } = json as Record<string, unknown>;
  return typeof serverUrl === "string" && typeof token === "string" ? { serverUrl, token } : null;
}

type RoomScreenProps = { portal: PortalHandle; origin: string; roomId: string; title: string; isShown: boolean; onMinimize: () => void; onClose: () => void; onStatus: (status: string, isLive: boolean) => void };

export function RoomScreen({ portal, origin, roomId, title, isShown, onMinimize, onClose, onStatus }: RoomScreenProps) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const roomRef = useRef<Room | null>(null);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [failure, setFailure] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [canHear, setCanHear] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [isReacting, setIsReacting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isTelling, setIsTelling] = useState(false);
  const [hasTold, setHasTold] = useState(false);

  const refresh = useCallback(() => {
    const room = roomRef.current;
    if (room) setPeople(readPeople(room, origin));
  }, [origin]);

  const showReaction = useCallback((identity: string, emoji: string) => {
    setReactions((current) => ({ ...current, [identity]: emoji }));
    setTimeout(() => setReactions((current) => (current[identity] === emoji ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== identity)) : current)), REACTION_MS);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const room = new Room({ adaptiveStream: false, dynacast: false });
    roomRef.current = room;

    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) playRemoteAudio(track);
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => stopRemoteAudio(track))
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
        if (!participant || topic !== "reaction") return;
        const emoji = decoder.decode(payload);
        if ((REACTIONS as readonly string[]).includes(emoji)) showReaction(participant.identity, emoji);
      })
      .on(RoomEvent.Disconnected, (reason) => {
        if (isCancelled) return;
        stopVoiceService();
        void stopRoomAudio();
        if (reason === DisconnectReason.ROOM_DELETED) setPhase("ended");
        else if (reason === DisconnectReason.DUPLICATE_IDENTITY) setPhase("elsewhere");
        else setPhase("left");
      });

    (async () => {
      const answer = await portal.call("POST", "/api/voice/join", { roomId });
      const joined = answer.status === 200 ? readJoin(answer.json) : null;
      if (isCancelled) return;
      if (!joined) {
        setFailure(readFailureMessage(answer, "We couldn't connect to the room. Try again."));
        setPhase("failed");
        return;
      }
      try {
        await startRoomAudio();
        await room.connect(joined.serverUrl, joined.token);
      } catch {
        if (!isCancelled) {
          setFailure("We couldn't reach the room's audio server. Check your connection and try again.");
          setPhase("failed");
        }
        return;
      }
      if (isCancelled) {
        await room.disconnect();
        return;
      }
      setCanHear(room.canPlaybackAudio);
      setPhase("live");
      refresh();
    })();

    return () => {
      isCancelled = true;
      stopVoiceService();
      void room.disconnect();
      void stopRoomAudio();
      roomRef.current = null;
    };
  }, [portal, roomId, refresh, showReaction]);

  const me = people.find(({ isMe }) => isMe) ?? null;
  const myRole = me?.role ?? "listener";
  const isMuted = me?.isMuted ?? true;

  // The notification and lock screen follow the room: listening, on stage, muted.
  useEffect(() => {
    if (phase === "live") showVoiceService(title, isOnStage(myRole), isMuted);
  }, [phase, title, myRole, isMuted]);

  useEffect(() => {
    onStatus(phase === "live" ? (isOnStage(myRole) ? (isMuted ? "On stage, muted" : "On stage, talking") : "Listening") : phase === "connecting" ? "Joining…" : "Room closed", phase === "live");
  }, [phase, myRole, isMuted, onStatus]);

  // Moved off the stage: LiveKit unpublishes the microphone; this keeps the button honest.
  useEffect(() => {
    const room = roomRef.current;
    if (room && !isOnStage(myRole) && room.localParticipant.isMicrophoneEnabled) void room.localParticipant.setMicrophoneEnabled(false).then(refresh, refresh);
  }, [myRole, refresh]);

  const toggleMic = useCallback(async () => {
    const room = roomRef.current;
    if (!room || !isOnStage(readRole(room.localParticipant.attributes.role))) return;
    setNotice(null);
    try {
      await room.localParticipant.setMicrophoneEnabled(!room.localParticipant.isMicrophoneEnabled);
    } catch {
      setNotice("The phone didn't let Commonhall use the microphone. Allow it in Settings, then try again.");
    }
    refresh();
  }, [refresh]);

  const leave = useCallback(async () => {
    setIsBusy(true);
    await portal.call("POST", "/api/voice/leave", { roomId });
    stopVoiceService();
    await roomRef.current?.disconnect();
    onClose();
  }, [portal, roomId, onClose]);

  // The lock screen's Mute and Leave.
  useEffect(() => listenToVoiceService((action) => (action === "leave" ? void leave() : void toggleMic())), [leave, toggleMic]);

  async function send(path: string, body: Record<string, unknown>, fallback: string) {
    setIsBusy(true);
    setNotice(null);
    const answer = await portal.call("POST", path, { roomId, ...body });
    setIsBusy(false);
    if (answer.status !== 200) setNotice(readFailureMessage(answer, fallback));
    return answer.status === 200;
  }

  async function tell(memberIds: string[]) {
    if (await send("/api/voice/notify", { memberIds }, "That didn't send. Try again.")) {
      setHasTold(true);
      setIsTelling(false);
      setNotice("Told them you're here.");
    }
  }

  async function act(memberId: string, action: RoleAction) {
    if (await send("/api/voice/role", { memberId, action }, "That didn't work. Try again.")) setSelectedId(null);
  }

  function react(emoji: string) {
    const room = roomRef.current;
    if (!room) return;
    void room.localParticipant.publishData(encoder.encode(emoji), { reliable: false, topic: "reaction" });
    showReaction(room.localParticipant.identity, emoji);
    setIsReacting(false);
  }

  const containerStyle = [styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }, isShown ? null : styles.hidden];

  if (phase === "ended" || phase === "left" || phase === "elsewhere" || phase === "failed") {
    const words =
      phase === "ended"
        ? "This room has ended."
        : phase === "left"
          ? "You left the room."
          : phase === "elsewhere"
            ? "You joined this room on another device, so it continues there."
            : (failure ?? "We couldn't connect to the room.");
    return (
      <View style={containerStyle} testID="room-closed">
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.body, phase === "failed" ? styles.warning : null]}>{words}</Text>
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={onClose}>
          <Text style={styles.primaryButtonText}>Back to the portal</Text>
        </Pressable>
      </View>
    );
  }

  const stage = people.filter((person) => isOnStage(person.role));
  const audience = people.filter((person) => !isOnStage(person.role));
  const hands = audience.filter((person) => person.isHandRaised);
  const selected = people.find(({ id }) => id === selectedId) ?? null;
  const selectedActions = selected ? readActions(myRole, selected) : [];

  function tile(person: Person, size: number) {
    const actions = readActions(myRole, person);
    return (
      <Pressable
        key={person.id}
        testID="room-person"
        accessibilityRole={actions.length > 0 ? "button" : undefined}
        accessibilityLabel={`${person.name}${ROLE_WORDS[person.role] ? `, ${ROLE_WORDS[person.role]}` : ""}${person.isHandRaised ? ", hand raised" : ""}`}
        disabled={actions.length === 0}
        onPress={() => setSelectedId((current) => (current === person.id ? null : person.id))}
        style={[styles.person, { width: size + 28 }]}
      >
        <View style={[styles.ring, { width: size + 8, height: size + 8, borderRadius: (size + 8) / 2 }, person.isSpeaking && !person.isMuted ? styles.ringTalking : null]}>
          <Face person={person} size={size} colors={colors} />
          {isOnStage(person.role) && person.isMuted ? <Text style={styles.badge}>🔇</Text> : null}
          {person.isHandRaised ? <Text style={[styles.badge, styles.badgeLeft]}>✋</Text> : null}
          {reactions[person.id] ? <Text style={styles.reaction}>{reactions[person.id]}</Text> : null}
        </View>
        <Text style={styles.personName} numberOfLines={1}>
          {person.name}
        </Text>
        {ROLE_WORDS[person.role] || person.isMe ? (
          <Text style={styles.personRole} numberOfLines={1}>
            {[ROLE_WORDS[person.role], person.isMe ? "You" : ""].filter(Boolean).join(" · ")}
          </Text>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View style={containerStyle} testID="native-room" accessibilityViewIsModal={isShown}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Minimise the room" onPress={onMinimize} hitSlop={12} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>↓ Minimise</Text>
        </Pressable>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>Live</Text>
        </View>
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      {phase === "connecting" ? (
        <View style={styles.row}>
          <ActivityIndicator color={colors.ink} />
          <Text style={styles.muted}>Joining…</Text>
        </View>
      ) : (
        <Text style={styles.muted} accessibilityLiveRegion="polite" testID="room-status">
          {`You're in · ${isOnStage(myRole) ? (isMuted ? "on stage, muted" : "on stage") : "listening"}`}
        </Text>
      )}
      {!canHear ? (
        <Pressable accessibilityRole="button" testID="tap-for-sound" style={styles.primaryButton} onPress={() => void roomRef.current?.startAudio().then(() => setCanHear(true))}>
          <Text style={styles.primaryButtonText}>Tap for sound</Text>
        </Pressable>
      ) : null}
      {notice ? (
        <View style={styles.notice}>
          <Text style={[styles.noticeText, styles.warning]}>{notice}</Text>
        </View>
      ) : null}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.sectionLabel}>On stage</Text>
        {stage.length === 0 && phase === "live" ? <Text style={styles.muted}>Nobody on stage. It ends in 2 minutes.</Text> : null}
        <View style={styles.grid} testID="stage">
          {stage.map((person) => tile(person, 64))}
        </View>
        <Text style={styles.sectionLabel}>{audience.length === 1 ? "1 listening" : `${audience.length} listening`}</Text>
        <View style={styles.grid} testID="audience">
          {audience.map((person) => tile(person, 48))}
        </View>

        {selected && selectedActions.length > 0 ? (
          <View style={styles.panel} testID="person-actions">
            <Text style={styles.panelTitle}>{selected.name}</Text>
            <View style={styles.wrapRow}>
              {selectedActions.map(({ action, label }) => (
                <Pressable key={action} accessibilityRole="button" disabled={isBusy} style={action === "invite_up" ? styles.primaryButtonSmall : styles.secondaryButton} onPress={() => void act(selected.id, action)}>
                  <Text style={action === "invite_up" ? styles.primaryButtonText : styles.secondaryButtonText}>{label}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        {isModerator(myRole) && hands.length > 0 ? (
          <View style={styles.panel} testID="raised-hands">
            <Text style={styles.panelTitle}>Raised hands</Text>
            {hands.map((person) => (
              <View key={person.id} style={styles.handRow}>
                <Face person={person} size={28} colors={colors} />
                <Text style={styles.handName}>{person.name}</Text>
                <Pressable accessibilityRole="button" disabled={isBusy} style={styles.primaryButtonSmall} onPress={() => void act(person.id, "invite_up")}>
                  <Text style={styles.primaryButtonText}>Invite to speak</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : null}
        {isTelling && !hasTold ? <TellPanel portal={portal} colors={colors} isBusy={isBusy} onSend={(ids) => void tell(ids)} onClose={() => setIsTelling(false)} /> : null}
      </ScrollView>

      {isReacting ? (
        <View style={styles.reactionBar}>
          {REACTIONS.map((emoji) => (
            <Pressable key={emoji} accessibilityRole="button" accessibilityLabel={`React ${emoji}`} onPress={() => react(emoji)} style={styles.reactionButton}>
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.controls}>
        <View style={styles.row}>
          <Tool styles={styles} symbol="✌" label="Leave" testID="leave-room" isDisabled={isBusy} onPress={() => void leave()} />
          <Tool styles={styles} symbol="☺" label="React" isOn={isReacting} onPress={() => setIsReacting((value) => !value)} />
          {isOnStage(myRole) ? (
            <Tool styles={styles} symbol={isMuted ? "🔇" : "🎙"} label={isMuted ? "Unmute" : "Mute"} testID="mic-toggle" isOn={!isMuted} onPress={() => void toggleMic()} />
          ) : (
            <Tool
              styles={styles}
              symbol="✋"
              label={me?.isHandRaised ? "Lower hand" : "Raise hand"}
              testID="hand-toggle"
              isOn={Boolean(me?.isHandRaised)}
              isDisabled={isBusy || phase !== "live"}
              onPress={() => void send("/api/voice/hand", { isRaised: !me?.isHandRaised }, "That didn't work. Try again.")}
            />
          )}
          {hasTold ? null : (
            <Tool styles={styles} symbol="🔔" label="Tell people" accessibilityLabel="Tell people I'm here" testID="tell-people" isOn={isTelling} isDisabled={phase !== "live"} onPress={() => setIsTelling((value) => !value)} />
          )}
        </View>
        {myRole === "host" ? (
          <Pressable accessibilityRole="button" disabled={isBusy} onPress={() => void send("/api/voice/end", {}, "That didn't work. Try again.")} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>End room</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

type ToolProps = { styles: ReturnType<typeof makeStyles>; symbol: string; label: string; onPress: () => void; isOn?: boolean; isDisabled?: boolean; testID?: string; accessibilityLabel?: string };

// A room control with its word under it.
function Tool({ styles, symbol, label, onPress, isOn = false, isDisabled = false, testID, accessibilityLabel }: ToolProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} accessibilityState={{ selected: isOn, disabled: isDisabled }} testID={testID} disabled={isDisabled} onPress={onPress} style={styles.tool}>
      <View style={[styles.roundButton, isOn ? styles.roundButtonOn : null]}>
        <Text style={[styles.roundText, isOn ? styles.roundTextOn : null]}>{symbol}</Text>
      </View>
      <Text style={styles.toolLabel}>{label}</Text>
    </Pressable>
  );
}

type Picked = { id: string; name: string };

function readPeopleAnswer(json: unknown): Picked[] {
  const people = json && typeof json === "object" ? (json as { people?: unknown }).people : null;
  if (!Array.isArray(people)) return [];
  return people.flatMap((person) => (person && typeof person.id === "string" && typeof person.name === "string" ? [{ id: person.id, name: person.name }] : []));
}

// "Tell people I'm here": search by name, pick up to 10, send once.
function TellPanel({ portal, colors, isBusy, onSend, onClose }: { portal: PortalHandle; colors: Colors; isBusy: boolean; onSend: (ids: string[]) => void; onClose: () => void }) {
  const styles = makeStyles(colors);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Picked[]>([]);
  const [picked, setPicked] = useState<Picked[]>([]);

  useEffect(() => {
    const words = search.trim();
    if (!words) {
      setResults([]);
      return;
    }
    let isCurrent = true;
    const timer = setTimeout(() => {
      void portal.call("POST", "/api/voice/people", { search: words }).then((answer) => {
        if (isCurrent && answer.status === 200) setResults(readPeopleAnswer(answer.json));
      });
    }, 250);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [portal, search]);

  const pickedIds = new Set(picked.map(({ id }) => id));
  const isFull = picked.length >= TELL_MAXIMUM;
  return (
    <View style={styles.panel} testID="tell-panel">
      <Text style={styles.panelTitle}>Tell people I&apos;m here</Text>
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Type a name"
        placeholderTextColor={colors.muted}
        editable={!isFull}
        autoCorrect={false}
        accessibilityLabel="Type a name"
        style={styles.input}
      />
      {results
        .filter(({ id }) => !pickedIds.has(id))
        .slice(0, 6)
        .map((person) => (
          <Pressable
            key={person.id}
            accessibilityRole="button"
            disabled={isFull}
            onPress={() => {
              setPicked((current) => [...current, person]);
              setSearch("");
            }}
            style={styles.resultRow}
          >
            <Text style={styles.noticeText}>{person.name}</Text>
          </Pressable>
        ))}
      {picked.length > 0 ? (
        <View style={styles.wrapRow}>
          {picked.map((person) => (
            <Pressable key={person.id} accessibilityRole="button" accessibilityLabel={`Remove ${person.name}`} onPress={() => setPicked((current) => current.filter(({ id }) => id !== person.id))} style={styles.chip}>
              <Text style={styles.secondaryButtonText}>{person.name} ×</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.wrapRow}>
        <Pressable accessibilityRole="button" disabled={isBusy || picked.length === 0} onPress={() => onSend(picked.map(({ id }) => id))} style={[styles.primaryButtonSmall, picked.length === 0 ? styles.dim : null]}>
          <Text style={styles.primaryButtonText}>Send</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Face({ person, size, colors }: { person: Pick<Person, "name" | "faceUrl">; size: number; colors: Colors }) {
  const [isBroken, setIsBroken] = useState(false);
  if (person.faceUrl && !isBroken) {
    return <Image source={{ uri: person.faceUrl }} onError={() => setIsBroken(true)} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.line }} accessibilityIgnoresInvertColors />;
  }
  const initials = person.name
    .split(/\s+/)
    .map((word) => word[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.line, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.ink, fontFamily: SANS, fontWeight: "600", fontSize: size / 2.8 }}>{initials}</Text>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    screen: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: colors.paper, paddingHorizontal: 20 },
    hidden: { display: "none" },
    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
    headerButton: { paddingVertical: 6 },
    headerButtonText: { color: colors.ink, fontFamily: SANS, fontSize: 15, fontWeight: "600" },
    livePill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live },
    liveText: { color: colors.ink, fontFamily: SANS, fontSize: 13, fontWeight: "600" },
    title: { color: colors.ink, fontFamily: SERIF, fontSize: 26, fontWeight: "500", marginVertical: 8 },
    body: { color: colors.ink, fontFamily: SANS, fontSize: 16, lineHeight: 23, marginVertical: 12 },
    muted: { color: colors.muted, fontFamily: SANS, fontSize: 14, lineHeight: 20 },
    warning: { color: colors.rust },
    row: { flexDirection: "row", alignItems: "center", gap: 10 },
    wrapRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
    notice: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.sheet, borderRadius: 8, padding: 12, marginVertical: 6 },
    noticeText: { color: colors.ink, fontFamily: SANS, fontSize: 14, lineHeight: 20 },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 24 },
    sectionLabel: { color: colors.muted, fontFamily: SANS, fontSize: 12, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", marginTop: 18, marginBottom: 10 },
    grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
    person: { alignItems: "center" },
    ring: { alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "transparent" },
    ringTalking: { borderColor: colors.live },
    badge: { position: "absolute", right: -4, bottom: -2, fontSize: 14 },
    badgeLeft: { left: -4, right: undefined },
    reaction: { position: "absolute", top: -10, fontSize: 24 },
    personName: { color: colors.ink, fontFamily: SANS, fontSize: 13, fontWeight: "600", marginTop: 6, textAlign: "center" },
    personRole: { color: colors.muted, fontFamily: SANS, fontSize: 11, textAlign: "center" },
    panel: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.sheet, borderRadius: 10, padding: 14, marginTop: 16 },
    panelTitle: { color: colors.ink, fontFamily: SANS, fontSize: 15, fontWeight: "600" },
    handRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 10 },
    handName: { flex: 1, color: colors.ink, fontFamily: SANS, fontSize: 14 },
    reactionBar: { flexDirection: "row", justifyContent: "space-around", borderWidth: 1, borderColor: colors.line, backgroundColor: colors.sheet, borderRadius: 999, paddingVertical: 6, marginBottom: 8 },
    reactionButton: { padding: 6 },
    reactionEmoji: { fontSize: 24 },
    controls: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 8, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 12 },
    tool: { alignItems: "center", gap: 4, minWidth: 56 },
    toolLabel: { color: colors.muted, fontFamily: SANS, fontSize: 12, fontWeight: "600" },
    input: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, color: colors.ink, fontFamily: SANS, fontSize: 15, backgroundColor: colors.paper },
    resultRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
    chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
    dim: { opacity: 0.45 },
    roundButton: { minWidth: 48, height: 48, borderRadius: 24, paddingHorizontal: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.sheet, alignItems: "center", justifyContent: "center" },
    roundButtonOn: { backgroundColor: colors.ink, borderColor: colors.ink },
    roundText: { color: colors.ink, fontFamily: SANS, fontSize: 18, fontWeight: "600" },
    roundTextOn: { color: colors.paper },
    primaryButton: { height: 48, borderRadius: 6, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", marginTop: 8 },
    primaryButtonSmall: { height: 36, borderRadius: 6, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    primaryButtonText: { color: colors.paper, fontFamily: SANS, fontSize: 14, fontWeight: "600" },
    secondaryButton: { height: 36, borderRadius: 6, borderWidth: 1, borderColor: colors.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    secondaryButtonText: { color: colors.ink, fontFamily: SANS, fontSize: 14, fontWeight: "600" },
  });
}
