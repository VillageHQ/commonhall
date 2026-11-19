import { requireOptionalNativeModule, type EventSubscription } from "expo";

// Android's foreground service for a voice room (android/): keeps the room playing with the screen locked and puts
// Mute and Leave on the lock screen. On iOS the audio background mode does that job (app.config.ts); on the web
// there is nothing to keep alive. Where the native part is missing (the web, Expo Go) it does nothing.

type VoiceServiceModule = {
  start: (title: string, canTalk: boolean, isMuted: boolean) => boolean;
  stop: () => boolean;
  addListener: (event: "onAction", listener: (event: { action: string }) => void) => EventSubscription;
};

const native = requireOptionalNativeModule<VoiceServiceModule>("CommonhallVoiceService");

export type VoiceServiceAction = "mute" | "leave";

// Calling it again updates the notification (title, on stage, muted).
export function showVoiceService(title: string, canTalk: boolean, isMuted: boolean) {
  return native?.start(title, canTalk, isMuted) ?? false;
}

export function stopVoiceService() {
  native?.stop();
}

export function listenToVoiceService(onAction: (action: VoiceServiceAction) => void) {
  const subscription = native?.addListener("onAction", ({ action }) => {
    if (action === "mute" || action === "leave") onAction(action);
  });
  return () => subscription?.remove();
}
