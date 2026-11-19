import type { RemoteTrack } from "livekit-client";

// The web preview: the browser plays each remote track through its own <audio> element.
export async function startRoomAudio() {}

export async function stopRoomAudio() {}

export function playRemoteAudio(track: RemoteTrack) {
  const element = track.attach();
  element.dataset.voice = "remote";
  document.body.appendChild(element);
}

export function stopRemoteAudio(track: RemoteTrack) {
  for (const element of track.detach()) element.remove();
}
