import { DisconnectReason, Room, RoomEvent, Track, type Participant, type RemoteTrack } from "livekit-client";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState, type ReactNode } from "react";
import { AccessibilityInfo, ActivityIndicator, Animated, Easing, Image, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listenToVoiceService, showVoiceService, stopVoiceService } from "../../modules/voice-service";
import type { PortalHandle } from "../components/portal-types";
import { readFailureMessage, type RoomClosedReason } from "../lib/bridge";
import { FONTS, useColors, type Colors } from "../theme";
import { playRemoteAudio, startRoomAudio, stopRemoteAudio, stopRoomAudio } from "./audio";
import { Icon } from "./icons";
import { isModerator, isOnStage, readActions, readRole, ROLE_ORDER, ROLE_WORDS, REACTIONS, type RoleAction, type RoomRole } from "./rules";

// A live voice room, native: LiveKit's client on the phone's own WebRTC, so it keeps playing with the screen locked
// (Android: the voice service; iOS: the audio background mode). Every role change still goes through the server's
// voice API, called through the portal page (its cookie, its origin). Never recorded.
// The screen is a sheet over the portal (X Spaces): it slides up, and the chevron or a drag down on its head minimises
// it to the mini bar (MiniPlayer.tsx). The same layout as the web room (live-room.tsx): the header, the title, one face
// grid, and the bottom bar with the main control (the hand or the mic) and React.

type Phase = "connecting" | "live" | "ended" | "left" | "elsewhere" | "failed";
type Person = { id: string; name: string; role: RoomRole; isHandRaised: boolean; faceUrl: string | null; isSpeaking: boolean; isMuted: boolean; isMe: boolean };
type JoinAnswer = { serverUrl: string; token: string };

// What the mini bar shows and does while the sheet is down.
export type RoomState = { isLive: boolean; isOnStage: boolean; isMuted: boolean; isHandRaised: boolean; isBusy: boolean };
export type RoomControls = { toggleMain: () => void; leave: () => void };

const REACTION_MS = 2400;
// Raise hand: one tap, and a line with Undo (council, 23 Nov 2026), long enough to reach Undo.
const HAND_TOAST_MS = 4000;
const STAGE_BANNER_MS = 6000;
const SLIDE_MS = 250;
// A drag down this far on the head minimises the room.
const MINIMISE_DRAG = 120;
// The face grid's columns are at least this wide (4 at 390 px, 3 at 360 px).
const COLUMN_MIN = 84;
const FACE = 64;
// The server's limit on a room's title (VOICE_LIMITS.titleLength in the web app).
const MAXIMUM_TITLE_LENGTH = 120;
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

// Reduced motion: the sheet opens without sliding and the speaking ring stays solid.
function useReduceMotion() {
  const [isReduced, setIsReduced] = useState(false);
  useEffect(() => {
    let isCurrent = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => isCurrent && setIsReduced(value));
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setIsReduced);
    return () => {
      isCurrent = false;
      subscription.remove();
    };
  }, []);
  return isReduced;
}

type RoomScreenProps = {
  portal: PortalHandle;
  origin: string;
  roomId: string;
  title: string;
  // A line from the page for the host, shown under the title until another notice replaces it ("" for none).
  notice: string;
  isShown: boolean;
  onMinimize: () => void;
  onClose: (reason: RoomClosedReason) => void;
  onState: (state: RoomState) => void;
  onRenamed: (title: string) => void;
};

export const RoomScreen = forwardRef<RoomControls, RoomScreenProps>(function RoomScreen({ portal, origin, roomId, title, notice: pageNotice, isShown, onMinimize, onClose, onState, onRenamed }, ref) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const insets = useSafeAreaInsets();
  const { height: screenHeight } = useWindowDimensions();
  const isReduceMotion = useReduceMotion();
  const roomRef = useRef<Room | null>(null);
  const [phase, setPhase] = useState<Phase>("connecting");
  const [failure, setFailure] = useState<string | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [canHear, setCanHear] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"more" | "hands" | "rename" | null>(null);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [isReacting, setIsReacting] = useState(false);
  const [notice, setNotice] = useState<{ text: string; isProblem: boolean } | null>(pageNotice ? { text: pageNotice, isProblem: false } : null);
  const [draft, setDraft] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [isHandToast, setIsHandToast] = useState(false);
  const [isBroughtUp, setIsBroughtUp] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);
  // The member's own role the last time the room named it: a host's Invite to speak puts a listener on stage at once
  // (as before), and the banner only says so. Joining as the host doesn't count.
  const lastRole = useRef<RoomRole | null>(null);

  // The sheet's slide: 0 is open, the screen's height is off the bottom.
  const slide = useRef(new Animated.Value(isShown ? 0 : screenHeight)).current;
  useEffect(() => {
    if (!isShown) return;
    if (isReduceMotion) {
      slide.setValue(0);
      return;
    }
    slide.setValue(screenHeight);
    Animated.timing(slide, { toValue: 0, duration: SLIDE_MS, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
  }, [isShown, isReduceMotion, screenHeight, slide]);

  const minimise = useCallback(() => {
    setIsReacting(false);
    if (isReduceMotion) {
      onMinimize();
      return;
    }
    Animated.timing(slide, { toValue: screenHeight, duration: SLIDE_MS - 50, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => onMinimize());
  }, [isReduceMotion, onMinimize, screenHeight, slide]);

  const drag = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_event, gesture) => slide.setValue(Math.max(0, gesture.dy)),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dy >= MINIMISE_DRAG) minimiseRef.current();
        else Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start();
      },
      onPanResponderTerminate: () => Animated.spring(slide, { toValue: 0, useNativeDriver: true, bounciness: 0 }).start(),
    }),
  ).current;
  const minimiseRef = useRef(minimise);
  useEffect(() => {
    minimiseRef.current = minimise;
  }, [minimise]);

  const refresh = useCallback(() => {
    const room = roomRef.current;
    if (!room) return;
    const next = readPeople(room, origin);
    setPeople(next);
    const mine = next.find(({ isMe }) => isMe);
    if (!mine) return;
    const before = lastRole.current;
    lastRole.current = mine.role;
    if (before === "listener" && isOnStage(mine.role)) {
      setIsBroughtUp(true);
      // On stage now: the hand's line (and its Undo) no longer applies.
      setIsHandToast(false);
    }
    if (!isOnStage(mine.role)) setIsBroughtUp(false);
    // The raised-hands panel closes once nobody's hand is up, so a later hand doesn't open it by itself.
    if (!next.some((person) => !isOnStage(person.role) && person.isHandRaised)) setPanel((current) => (current === "hands" ? null : current));
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
  const isHandRaised = Boolean(me?.isHandRaised);
  const hostName = people.find((person) => person.role === "host")?.name ?? null;

  // The notification and lock screen follow the room: listening, on stage, muted.
  useEffect(() => {
    if (phase === "live") showVoiceService(title, isOnStage(myRole), isMuted);
  }, [phase, title, myRole, isMuted]);

  useEffect(() => {
    onState({ isLive: phase === "live", isOnStage: isOnStage(myRole), isMuted, isHandRaised, isBusy });
  }, [phase, myRole, isMuted, isHandRaised, isBusy, onState]);

  useEffect(() => {
    if (!isHandToast) return;
    const timer = setTimeout(() => setIsHandToast(false), HAND_TOAST_MS);
    return () => clearTimeout(timer);
  }, [isHandToast]);
  useEffect(() => {
    if (!isBroughtUp) return;
    const timer = setTimeout(() => setIsBroughtUp(false), STAGE_BANNER_MS);
    return () => clearTimeout(timer);
  }, [isBroughtUp]);

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
      setNotice({ text: "The phone didn't let Commonhall use the microphone. Allow it in Settings, then try again.", isProblem: true });
    }
    refresh();
  }, [refresh]);

  const leave = useCallback(async () => {
    setIsBusy(true);
    await portal.call("POST", "/api/voice/leave", { roomId });
    stopVoiceService();
    await roomRef.current?.disconnect();
    onClose("left");
  }, [portal, roomId, onClose]);

  const send = useCallback(
    async (path: string, body: Record<string, unknown>, fallback: string) => {
      setIsBusy(true);
      setNotice(null);
      const answer = await portal.call("POST", path, { roomId, ...body });
      setIsBusy(false);
      if (answer.status !== 200) setNotice({ text: readFailureMessage(answer, fallback), isProblem: true });
      return answer;
    },
    [portal, roomId],
  );

  const setHand = useCallback(
    async (isRaised: boolean) => {
      setIsHandToast(false);
      const answer = await send("/api/voice/hand", { isRaised }, "That didn't work. Try again.");
      if (answer.status === 200 && isRaised) setIsHandToast(true);
    },
    [send],
  );

  // The one main control, the same on the sheet and on the mini bar: the mic on stage, the hand in the audience.
  const toggleMain = useCallback(() => {
    if (phase !== "live" || isBusy) return;
    if (isOnStage(myRole)) void toggleMic();
    else void setHand(!isHandRaised);
  }, [phase, isBusy, myRole, isHandRaised, toggleMic, setHand]);

  useImperativeHandle(ref, () => ({ toggleMain, leave: () => void leave() }), [toggleMain, leave]);

  // The lock screen's Mute and Leave.
  useEffect(() => listenToVoiceService((action) => (action === "leave" ? void leave() : void toggleMic())), [leave, toggleMic]);

  async function rename() {
    const typed = draft.trim();
    if (!typed) return;
    if ((await send("/api/voice/rename", { title: typed }, "That didn't work. Try again.")).status === 200) {
      setPanel(null);
      onRenamed(typed);
    }
  }

  async function act(memberId: string, action: RoleAction) {
    if ((await send("/api/voice/role", { memberId, action }, "That didn't work. Try again.")).status === 200) {
      setSelectedId(null);
      setPanel(null);
    }
  }

  function stepDown() {
    setIsBroughtUp(false);
    if (me) void act(me.id, "move_down");
  }

  function react(emoji: string) {
    const room = roomRef.current;
    if (!room) return;
    void room.localParticipant.publishData(encoder.encode(emoji), { reliable: false, topic: "reaction" });
    showReaction(room.localParticipant.identity, emoji);
    setIsReacting(false);
  }

  const sheetStyle = [styles.sheet, { top: insets.top + 8, paddingBottom: insets.bottom, transform: [{ translateY: slide }] }];
  const rootStyle = [StyleSheet.absoluteFill, isShown ? null : styles.hidden];
  const isClosed = phase === "ended" || phase === "left" || phase === "elsewhere" || phase === "failed";
  const isHost = myRole === "host";

  const header = (
    <View style={styles.header} {...drag.panHandlers}>
      <Pressable accessibilityRole="button" accessibilityLabel="Minimise" testID="room-minimise" onPress={minimise} style={styles.iconButton}>
        <Icon name="chevronDown" color={colors.ink} />
      </Pressable>
      <View style={styles.headerEnd}>
        {isClosed ? null : isHost ? (
          <Pressable accessibilityRole="button" testID="end-room" disabled={isBusy} onPress={() => void send("/api/voice/end", {}, "That didn't work. Try again.")} style={styles.headerText}>
            <Text style={styles.headerTextLabel}>End room</Text>
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" testID="leave-room" disabled={isBusy} onPress={() => void leave()} style={styles.headerText}>
            <Text style={styles.headerTextLabel}>Leave</Text>
          </Pressable>
        )}
        {isClosed ? null : (
          <Pressable accessibilityRole="button" accessibilityLabel="More" testID="room-more" onPress={() => setPanel("more")} style={styles.iconButton}>
            <Icon name="ellipsis" color={colors.ink} />
          </Pressable>
        )}
      </View>
    </View>
  );

  if (isClosed) {
    const words =
      phase === "ended"
        ? "This room has ended."
        : phase === "left"
          ? "You left the room."
          : phase === "elsewhere"
            ? "You joined this room on another device, so it continues there."
            : (failure ?? "We couldn't connect to the room.");
    return (
      <View style={rootStyle} testID="room-closed">
        <View style={styles.backdrop} />
        <Animated.View style={sheetStyle}>
          {header}
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={3}>
              {title}
            </Text>
            <Text style={[styles.closedWords, phase === "failed" ? styles.warning : null]}>{words}</Text>
            <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => onClose(phase)}>
              <Text style={styles.primaryButtonText}>Back to the portal</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    );
  }

  const stage = people.filter((person) => isOnStage(person.role));
  const audience = people.filter((person) => !isOnStage(person.role));
  const hands = audience.filter((person) => person.isHandRaised);
  const selected = people.find(({ id }) => id === selectedId) ?? null;
  const selectedActions = selected ? readActions(myRole, selected) : [];
  const columns = Math.max(1, Math.floor(gridWidth / COLUMN_MIN));
  const tileWidth = gridWidth > 0 ? gridWidth / columns : COLUMN_MIN;
  const peopleWords = people.length === 1 ? "1 in the room" : `${people.length} in the room`;

  const more: { label: string; onPress: () => void }[] = [];
  if (isHost) {
    more.push({
      label: "Rename",
      onPress: () => {
        setDraft(title);
        setPanel("rename");
      },
    });
    more.push({ label: "Leave", onPress: () => void leave() });
  } else if (isOnStage(myRole)) {
    more.push({ label: "Back to listening", onPress: stepDown });
  }

  function tile(person: Person) {
    const actions = readActions(myRole, person);
    const isTalking = person.isSpeaking && !person.isMuted;
    return (
      <Pressable
        key={person.id}
        testID="room-person"
        accessibilityRole={actions.length > 0 ? "button" : undefined}
        accessibilityLabel={`${person.name}, ${person.isHandRaised ? "hand up" : ROLE_WORDS[person.role]}${isOnStage(person.role) && person.isMuted ? ", muted" : ""}`}
        disabled={actions.length === 0}
        onPress={() => setSelectedId(person.id)}
        style={[styles.person, { width: tileWidth }]}
      >
        <View style={styles.faceBox}>
          <SpeakingRing isOn={isTalking} isSteady={isReduceMotion} color={colors.ink} />
          <Face person={person} size={FACE} colors={colors} />
          {isOnStage(person.role) && person.isMuted ? (
            <View style={styles.badge} testID="muted-badge">
              <Icon name="micOff" size={12} color={colors.paper} strokeWidth={1.75} />
            </View>
          ) : null}
          {reactions[person.id] ? <Text style={styles.reaction}>{reactions[person.id]}</Text> : null}
        </View>
        <Text style={styles.personName} numberOfLines={1}>
          {person.isMe ? `${person.name} (you)` : person.name}
        </Text>
        {person.isHandRaised ? (
          <View style={styles.handLine}>
            <Icon name="hand" size={14} color={colors.live} strokeWidth={1.75} />
            <Text style={styles.handText}>Hand up</Text>
          </View>
        ) : (
          <Text style={styles.personRole} numberOfLines={1}>
            {ROLE_WORDS[person.role]}
          </Text>
        )}
      </Pressable>
    );
  }

  const isMicOn = isOnStage(myRole) && !isMuted;
  const mainLabel = isOnStage(myRole) ? (isMicOn ? "Mic on" : "Mic off") : isHandRaised ? "Lower hand" : "Raise hand";
  const isMainFilled = isOnStage(myRole) ? isMicOn : isHandRaised;

  return (
    <View style={rootStyle} testID="native-room" accessibilityViewIsModal={isShown}>
      <Pressable style={styles.backdrop} accessible={false} importantForAccessibility="no" onPress={minimise} />
      <Animated.View style={sheetStyle}>
        {header}
        <ScrollView style={styles.scroll} contentContainerStyle={styles.body}>
          <Text style={styles.title} accessibilityRole="header" numberOfLines={3} testID="room-title">
            {title}
          </Text>
          <View style={styles.subline}>
            <View style={styles.liveDot} testID="room-live-dot" />
            {phase === "connecting" ? (
              <>
                <ActivityIndicator color={colors.muted} size="small" />
                <Text style={styles.sublineText}>Joining…</Text>
              </>
            ) : (
              <Text style={styles.sublineText} accessibilityLiveRegion="polite" testID="room-status">
                {[hostName, peopleWords].filter(Boolean).join(" · ")}
              </Text>
            )}
          </View>
          {!canHear ? (
            <Pressable accessibilityRole="button" testID="tap-for-sound" style={styles.primaryButton} onPress={() => void roomRef.current?.startAudio().then(() => setCanHear(true))}>
              <Text style={styles.primaryButtonText}>Tap for sound</Text>
            </Pressable>
          ) : null}
          {notice ? (
            <View style={styles.notice}>
              <Text style={[styles.noticeText, notice.isProblem ? styles.warning : null]}>{notice.text}</Text>
            </View>
          ) : null}

          <View onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}>
            <Text style={styles.sectionLabel}>On stage</Text>
            {stage.length === 0 && phase === "live" ? <Text style={styles.emptyStage}>Nobody on stage yet.</Text> : null}
            <View style={styles.grid} testID="stage">
              {stage.map(tile)}
            </View>
            {audience.length > 0 ? <Text style={styles.sectionLabel}>Listening</Text> : null}
            <View style={styles.grid} testID="audience">
              {audience.map(tile)}
            </View>
          </View>
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
        {isHandToast && !isOnStage(myRole) ? (
          <View style={styles.toast} accessibilityLiveRegion="polite" testID="hand-toast">
            <Text style={styles.toastText}>Hand raised. The host sees it.</Text>
            <Pressable accessibilityRole="button" disabled={isBusy} onPress={() => void setHand(false)} style={styles.toastUndo}>
              <Text style={styles.toastUndoText}>Undo</Text>
            </Pressable>
          </View>
        ) : null}
        {isModerator(myRole) && hands.length > 0 ? (
          <View style={styles.chipRow}>
            <Pressable accessibilityRole="button" testID="raised-hands-chip" onPress={() => setPanel("hands")} style={styles.chip}>
              <Icon name="hand" size={16} color={colors.live} strokeWidth={1.75} />
              <Text style={styles.chipText}>{`Raised hands (${hands.length})`}</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.bar} testID="room-bar">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={mainLabel}
            accessibilityState={{ selected: isMainFilled, disabled: isBusy || phase !== "live" }}
            testID={isOnStage(myRole) ? "mic-toggle" : "hand-toggle"}
            disabled={isBusy || phase !== "live"}
            onPress={toggleMain}
            style={[styles.main, isBusy || phase !== "live" ? styles.disabled : null]}
          >
            <View style={[styles.mainRound, isMainFilled ? styles.mainRoundOn : null]}>
              <Icon name={isOnStage(myRole) ? (isMicOn ? "mic" : "micOff") : "hand"} color={isMainFilled ? colors.paper : colors.ink} />
            </View>
            <Text style={styles.mainCaption}>{mainLabel}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="React" accessibilityState={{ selected: isReacting }} testID="react" onPress={() => setIsReacting((value) => !value)} style={[styles.round, isReacting ? styles.roundOn : null]}>
            <Icon name="smilePlus" color={isReacting ? colors.paper : colors.ink} />
          </Pressable>
        </View>

        {isBroughtUp ? (
          <View style={styles.banner} accessibilityLiveRegion="polite" testID="stage-banner">
            <Text style={styles.bannerText}>{`${hostName ?? "The host"} brought you on stage. Your mic is off.`}</Text>
            <View style={styles.bannerActions}>
              <Pressable
                accessibilityRole="button"
                testID="banner-unmute"
                onPress={() => {
                  setIsBroughtUp(false);
                  if (isMuted) void toggleMic();
                }}
                style={styles.bannerMain}
              >
                <Text style={styles.bannerMainText}>Unmute</Text>
              </Pressable>
              <Pressable accessibilityRole="button" testID="banner-step-down" onPress={stepDown} style={styles.bannerQuiet}>
                <Text style={styles.bannerQuietText}>Back to listening</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {panel === "more" ? (
          <Panel styles={styles} title="More" onClose={() => setPanel(null)}>
            {more.map((item) => (
              <PanelItem
                key={item.label}
                styles={styles}
                label={item.label}
                isDisabled={isBusy}
                onPress={() => {
                  setPanel(null);
                  item.onPress();
                }}
              />
            ))}
            <Text style={styles.panelNote}>Never recorded.</Text>
          </Panel>
        ) : null}
        {panel === "rename" ? (
          <Panel styles={styles} title="Rename the room" onClose={() => setPanel(null)}>
            <View style={styles.renameBox} testID="rename-form">
              <TextInput accessibilityLabel="Room name" value={draft} onChangeText={setDraft} maxLength={MAXIMUM_TITLE_LENGTH} autoFocus returnKeyType="done" onSubmitEditing={() => void rename()} style={styles.renameInput} />
              <Pressable accessibilityRole="button" disabled={isBusy || !draft.trim()} onPress={() => void rename()} style={[styles.primaryButton, isBusy || !draft.trim() ? styles.disabled : null]}>
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </Panel>
        ) : null}
        {panel === "hands" && hands.length > 0 ? (
          <Panel styles={styles} title="Raised hands" onClose={() => setPanel(null)}>
            {hands.map((person) => (
              <View key={person.id} style={styles.handRow}>
                <Face person={person} size={40} colors={colors} />
                <Text style={styles.handName} numberOfLines={1}>
                  {person.name}
                </Text>
                <Pressable accessibilityRole="button" disabled={isBusy} style={styles.smallButton} onPress={() => void act(person.id, "invite_up")}>
                  <Text style={styles.primaryButtonText}>Invite to speak</Text>
                </Pressable>
              </View>
            ))}
          </Panel>
        ) : null}
        {selected && selectedActions.length > 0 ? (
          <Panel styles={styles} title={selected.name} onClose={() => setSelectedId(null)}>
            <View testID="person-actions">
              {selectedActions.map(({ action, label }) => (
                <PanelItem key={action} styles={styles} label={label} isDisabled={isBusy} onPress={() => void act(selected.id, action)} />
              ))}
            </View>
          </Panel>
        ) : null}
      </Animated.View>
    </View>
  );
});

type Styles = ReturnType<typeof makeStyles>;

// A sheet inside the room's sheet (More, a person's actions, raised hands, Rename): a dimmed layer that closes it, and
// the panel at the bottom with its name and a Close.
function Panel({ styles, title, onClose, children }: { styles: Styles; title: string; onClose: () => void; children: ReactNode }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.panelScrim} accessibilityLabel="Close" onPress={onClose} />
      <View style={styles.panel} accessibilityViewIsModal>
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle} numberOfLines={1}>
            {title}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.iconButton}>
            <Icon name="x" color={styles.panelTitle.color} />
          </Pressable>
        </View>
        {children}
      </View>
    </View>
  );
}

function PanelItem({ styles, label, onPress, isDisabled }: { styles: Styles; label: string; onPress: () => void; isDisabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" disabled={isDisabled} onPress={onPress} style={[styles.panelItem, isDisabled ? styles.disabled : null]}>
      <Text style={styles.panelItemText}>{label}</Text>
    </Pressable>
  );
}

// The 2 px ring around whoever is talking: it pulses, or stays solid under reduced motion.
function SpeakingRing({ isOn, isSteady, color }: { isOn: boolean; isSteady: boolean; color: string }) {
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!isOn || isSteady) {
      opacity.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 600, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isOn, isSteady, opacity]);
  if (!isOn) return null;
  return <Animated.View testID="speaking-ring" style={{ position: "absolute", top: -4, left: -4, right: -4, bottom: -4, borderRadius: (FACE + 8) / 2, borderWidth: 2, borderColor: color, opacity }} />;
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
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.vellum, alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: colors.ink, fontFamily: FONTS.serif, fontSize: size / 2.6 }}>{initials}</Text>
    </View>
  );
}

function makeStyles(colors: Colors) {
  return StyleSheet.create({
    hidden: { display: "none" },
    backdrop: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(17,17,16,0.4)" },
    sheet: { position: "absolute", right: 0, bottom: 0, left: 0, backgroundColor: colors.paper, borderTopLeftRadius: 16, borderTopRightRadius: 16, overflow: "hidden" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 52, paddingHorizontal: 4 },
    headerEnd: { flexDirection: "row", alignItems: "center" },
    iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 6 },
    headerText: { minHeight: 44, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
    headerTextLabel: { color: colors.live, fontFamily: FONTS.sansSemiBold, fontSize: 15, lineHeight: 20 },
    scroll: { flex: 1 },
    body: { paddingHorizontal: 16, paddingBottom: 24 },
    title: { color: colors.ink, fontFamily: FONTS.serif, fontSize: 22, lineHeight: 28, marginTop: 4 },
    subline: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
    sublineText: { flexShrink: 1, color: colors.muted, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.live },
    closedWords: { color: colors.ink, fontFamily: FONTS.sans, fontSize: 16, lineHeight: 23, marginVertical: 12 },
    warning: { color: colors.rust },
    disabled: { opacity: 0.45 },
    notice: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.sheet, borderRadius: 8, padding: 12, marginTop: 12 },
    noticeText: { color: colors.ink, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20 },
    sectionLabel: { color: colors.muted, fontFamily: FONTS.sansSemiBold, fontSize: 13, lineHeight: 18, marginTop: 20, marginBottom: 8 },
    emptyStage: { color: colors.muted, fontFamily: FONTS.sans, fontSize: 15, lineHeight: 22, marginBottom: 8 },
    grid: { flexDirection: "row", flexWrap: "wrap", rowGap: 16 },
    person: { alignItems: "center", paddingHorizontal: 2, paddingVertical: 4 },
    faceBox: { width: FACE, height: FACE, marginBottom: 6 },
    badge: { position: "absolute", right: -2, bottom: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.ink, borderWidth: 2, borderColor: colors.paper, alignItems: "center", justifyContent: "center" },
    reaction: { position: "absolute", top: -10, alignSelf: "center", fontSize: 26 },
    personName: { maxWidth: "100%", color: colors.ink, fontFamily: FONTS.sansSemiBold, fontSize: 13, lineHeight: 18, textAlign: "center" },
    personRole: { maxWidth: "100%", color: colors.muted, fontFamily: FONTS.sans, fontSize: 12, lineHeight: 16, textAlign: "center" },
    handLine: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignItems: "center", gap: 2 },
    handText: { color: colors.live, fontFamily: FONTS.sansSemiBold, fontSize: 12, lineHeight: 16 },
    reactionBar: { flexDirection: "row", justifyContent: "space-around", marginHorizontal: 16, marginBottom: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.sheet, borderRadius: 999, paddingVertical: 4 },
    reactionButton: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
    reactionEmoji: { fontSize: 26 },
    toast: { flexDirection: "row", alignItems: "center", alignSelf: "center", gap: 8, marginBottom: 8, paddingLeft: 16, paddingRight: 4, borderRadius: 10, backgroundColor: colors.ink },
    toastText: { color: colors.paper, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20 },
    toastUndo: { minHeight: 44, paddingHorizontal: 12, alignItems: "center", justifyContent: "center" },
    toastUndoText: { color: colors.paper, fontFamily: FONTS.sansSemiBold, fontSize: 14, textDecorationLine: "underline" },
    chipRow: { alignItems: "center", marginBottom: 8 },
    chip: { flexDirection: "row", alignItems: "center", gap: 6, minHeight: 32, paddingHorizontal: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.sheet },
    chipText: { color: colors.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 },
    bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 88, paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.paper },
    main: { alignItems: "center", gap: 4, minWidth: 64 },
    mainRound: { width: 56, height: 56, borderRadius: 28, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
    mainRoundOn: { backgroundColor: colors.ink },
    mainCaption: { color: colors.ink, fontFamily: FONTS.sansSemiBold, fontSize: 12, lineHeight: 16 },
    round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.sheet, alignItems: "center", justifyContent: "center" },
    roundOn: { backgroundColor: colors.ink, borderColor: colors.ink },
    banner: { position: "absolute", top: 8, left: 8, right: 8, minHeight: 56, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8, paddingVertical: 10, paddingLeft: 16, paddingRight: 12, borderRadius: 8, backgroundColor: colors.ink },
    bannerText: { flexGrow: 1, flexShrink: 1, flexBasis: 200, color: colors.paper, fontFamily: FONTS.sans, fontSize: 14, lineHeight: 20 },
    bannerActions: { flexDirection: "row", alignItems: "center", gap: 4 },
    bannerMain: { minHeight: 36, paddingHorizontal: 14, borderRadius: 6, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
    bannerMainText: { color: colors.ink, fontFamily: FONTS.sansSemiBold, fontSize: 14 },
    bannerQuiet: { minHeight: 36, paddingHorizontal: 10, alignItems: "center", justifyContent: "center" },
    bannerQuietText: { color: colors.paper, fontFamily: FONTS.sansSemiBold, fontSize: 14, textDecorationLine: "underline" },
    panelScrim: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, backgroundColor: "rgba(17,17,16,0.4)" },
    panel: { position: "absolute", right: 0, bottom: 0, left: 0, paddingBottom: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, backgroundColor: colors.paper },
    panelHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 52, paddingLeft: 16, paddingRight: 4 },
    panelTitle: { flex: 1, color: colors.ink, fontFamily: FONTS.sansSemiBold, fontSize: 17 },
    panelItem: { minHeight: 52, justifyContent: "center", paddingHorizontal: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
    panelItemText: { color: colors.ink, fontFamily: FONTS.sansMedium, fontSize: 16 },
    panelNote: { color: colors.muted, fontFamily: FONTS.sans, fontSize: 13, paddingHorizontal: 16, paddingTop: 12 },
    renameBox: { gap: 12, paddingHorizontal: 16 },
    renameInput: { minHeight: 44, borderWidth: 1, borderColor: colors.muted, borderRadius: 6, paddingHorizontal: 12, color: colors.ink, backgroundColor: colors.sheet, fontFamily: FONTS.sans, fontSize: 16 },
    handRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 56, paddingHorizontal: 16 },
    handName: { flex: 1, color: colors.ink, fontFamily: FONTS.sansSemiBold, fontSize: 15 },
    primaryButton: { minHeight: 44, borderRadius: 6, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 16, marginTop: 8 },
    smallButton: { minHeight: 36, borderRadius: 6, backgroundColor: colors.ink, alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
    primaryButtonText: { color: colors.paper, fontFamily: FONTS.sansSemiBold, fontSize: 14 },
  });
}
