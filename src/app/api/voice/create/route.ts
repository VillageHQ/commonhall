import { createRoomBodySchema } from "@/modules/voice/contract";
import { createRoom } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";
import { sendRoomNotifySoon } from "@/shell/voice-alerts";

// Start a room now or schedule one. A room started now with "Notify others" alerts after the response: a failed alert
// must not look like a failed start, or a retry would open a second room.
export const POST = voiceRoutes.member("voice-create", createRoomBodySchema, async (context, body) => {
  const { roomId, notify } = await createRoom(context, body);
  if (notify) sendRoomNotifySoon(context.database, context.environment, notify);
  return Response.json({ roomId });
});
