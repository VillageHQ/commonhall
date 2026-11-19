import { roomBodySchema } from "@/modules/voice/contract";
import { startScheduledRoom } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";
import { sendRoomRemindersSoon } from "@/shell/voice-alerts";

// "Start now" also alerts the members who tapped Remind me, after the response.
export const POST = voiceRoutes.member("voice-start", roomBodySchema, async (context, { roomId }) => {
  const reminder = await startScheduledRoom(context, roomId);
  if (reminder) sendRoomRemindersSoon(context.database, context.environment, [reminder]);
  return Response.json({ ok: true });
});
