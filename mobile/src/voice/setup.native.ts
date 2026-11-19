import { registerGlobals } from "@livekit/react-native";

// LiveKit's client runs on the phone's own WebRTC (and iOS sets up its audio session from the audio engine).
registerGlobals();
