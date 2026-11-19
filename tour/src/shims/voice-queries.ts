import { ROOM_JOIN } from "../data";

import { ROOMS_POLL_MS, VOICE_QUERY_KEYS, voiceRequests as appRequests } from "@/modules/voice/queries";

// The tour's stand-in for `src/modules/voice/queries.ts`: joining the room answers at once (the tour's LiveKit is a
// stand-in too, tour/src/shims/livekit-client.ts); every other request is the app's, which in the tour never leaves
// the page.
export { ROOMS_POLL_MS, VOICE_QUERY_KEYS };

export const voiceRequests = { ...appRequests, join: async (_roomId: string) => ROOM_JOIN };
