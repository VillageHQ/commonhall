import { AndroidAudioTypePresets, AudioSession } from "@livekit/react-native";
import type { RemoteTrack } from "livekit-client";
import { Platform } from "react-native";

// The phone's audio session for a room: loudspeaker by default (a room is listened to, not held to the ear). iOS sets
// its own session up from the audio engine (registerGlobals in index.ts); the audio background mode keeps it going.
export async function startRoomAudio() {
  if (Platform.OS === "android") {
    await AudioSession.configureAudio({ android: { preferredOutputList: ["speaker"], audioTypeOptions: AndroidAudioTypePresets.communication } });
  }
  await AudioSession.startAudioSession();
}

export async function stopRoomAudio() {
  await AudioSession.stopAudioSession();
}

// Native WebRTC plays remote audio by itself.
export function playRemoteAudio(_track: RemoteTrack) {}

export function stopRemoteAudio(_track: RemoteTrack) {}
