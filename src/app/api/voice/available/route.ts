import { emptyBodySchema } from "@/modules/voice/contract";
import { startAvailableRoom } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";
import { logError } from "@/platform/observability/route-logging";
import { sendAvailableAlert } from "@/shell/voice-alerts";

// The room is open once this commits; a failed alert must not look like a failed tap, or a retry would open a second.
export const POST = voiceRoutes.member("voice-available", emptyBodySchema, async (context) => {
  const room = await startAvailableRoom(context);
  if (!room.isNew) return Response.json({ roomId: room.roomId });
  try {
    await sendAvailableAlert(context.database, context.environment, { roomId: room.roomId, hostId: context.member.id, hostName: room.hostName, title: room.title });
  } catch (error) {
    logError("voice-available-alert", error);
  }
  return Response.json({ roomId: room.roomId });
});
