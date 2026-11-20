import { createRoomBodySchema, type StartedRoom } from "@/modules/voice/contract";
import { createRoom } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";
import { sendRoomNotifySoon } from "@/shell/voice-alerts";

// Start a room now (one tap) or schedule one. A room started now alerts everyone after the response: a failed alert
// must not look like a failed start, or a retry would open a second room. Past the host's 3 alerting starts a day it
// starts quietly, and says so.
export const POST = voiceRoutes.member("voice-create", createRoomBodySchema, async (context, body) => {
  const { roomId, notify, isQuiet } = await createRoom(context, body);
  if (notify) sendRoomNotifySoon(context.database, context.environment, notify);
  return Response.json({ roomId, isQuiet } satisfies StartedRoom);
});
