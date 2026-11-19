import { ROOM_PEOPLE, ROOM_VIEWER_ID, type TourRoomPerson } from "../data";

// The tour's stand-in for `livekit-client`: a live room with made-up people that never connects anywhere. The app's
// own room screen (src/modules/voice/components/live-room.tsx) reads it as it reads a real LiveKit room. Who speaks
// moves around the stage while motion is allowed; with reduced motion the host keeps speaking.

export const RoomEvent = {
  TrackSubscribed: "trackSubscribed",
  TrackUnsubscribed: "trackUnsubscribed",
  ParticipantConnected: "participantConnected",
  ParticipantDisconnected: "participantDisconnected",
  ParticipantAttributesChanged: "participantAttributesChanged",
  ActiveSpeakersChanged: "activeSpeakersChanged",
  TrackMuted: "trackMuted",
  TrackUnmuted: "trackUnmuted",
  TrackPublished: "trackPublished",
  TrackUnpublished: "trackUnpublished",
  LocalTrackPublished: "localTrackPublished",
  LocalTrackUnpublished: "localTrackUnpublished",
  ParticipantPermissionsChanged: "participantPermissionsChanged",
  AudioPlaybackStatusChanged: "audioPlaybackStatusChanged",
  DataReceived: "dataReceived",
  Disconnected: "disconnected",
} as const;

export const Track = { Kind: { Audio: "audio", Video: "video" } } as const;

export const DisconnectReason = { CLIENT_INITIATED: 1, DUPLICATE_IDENTITY: 2, ROOM_DELETED: 5 } as const;

export class Participant {
  readonly identity: string;
  readonly name: string;
  readonly attributes: Record<string, string>;
  isSpeaking: boolean;
  isMicrophoneEnabled: boolean;

  constructor(person: TourRoomPerson) {
    this.identity = person.id;
    this.name = person.name;
    this.attributes = { role: person.role, hand: person.isHandRaised ? "1" : "", face: person.faceUrl ?? "" };
    this.isSpeaking = person.isSpeaking;
    this.isMicrophoneEnabled = !person.isMuted;
  }

  // Nothing leaves the page: no microphone, no data messages.
  async setMicrophoneEnabled(_isOn: boolean) {}

  async publishData(_payload: Uint8Array, _options: unknown) {}
}

export type RemoteTrack = { kind: string; attach: () => HTMLMediaElement; detach: () => HTMLMediaElement[] };

type Listener = (...args: never[]) => void;

const SPEAKER_TURN_MS = 2600;

export class Room {
  readonly localParticipant: Participant;
  readonly remoteParticipants: Map<string, Participant>;
  readonly canPlaybackAudio = true;
  private readonly listeners = new Map<string, Listener[]>();
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(_options?: unknown) {
    const people = ROOM_PEOPLE.map((person) => new Participant(person));
    this.localParticipant = people.find(({ identity }) => identity === ROOM_VIEWER_ID) ?? people[0]!;
    this.remoteParticipants = new Map(people.filter((person) => person !== this.localParticipant).map((person) => [person.identity, person]));
  }

  on(event: string, listener: Listener) {
    this.listeners.set(event, [...(this.listeners.get(event) ?? []), listener]);
    return this;
  }

  private emit(event: string) {
    for (const listener of this.listeners.get(event) ?? []) (listener as () => void)();
  }

  async connect(_url: string, _token: string) {
    const isStill = typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (isStill) return;
    const speakers = [...this.remoteParticipants.values()].filter((person) => person.isMicrophoneEnabled);
    let turn = 0;
    this.timer = setInterval(() => {
      turn = (turn + 1) % speakers.length;
      for (const [index, person] of speakers.entries()) person.isSpeaking = index === turn;
      this.emit(RoomEvent.ActiveSpeakersChanged);
    }, SPEAKER_TURN_MS);
  }

  async disconnect() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async startAudio() {}
}
