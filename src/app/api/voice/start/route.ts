import { roomBodySchema } from "@/modules/voice/contract";
import { startScheduledRoom } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";
import { sendRoomNotifySoon, sendRoomRemindersSoon } from "@/shell/voice-alerts";

// "Start now" alerts the members who tapped Remind me, and sends the Notify chosen when the room was scheduled, after
// the response.
export const POST = voiceRoutes.member("voice-start", roomBodySchema, async (context, { roomId }) => {
  const { reminder, notify } = await startScheduledRoom(context, roomId);
  if (reminder) sendRoomRemindersSoon(context.database, context.environment, [reminder]);
  if (notify) sendRoomNotifySoon(context.database, context.environment, notify);
  return Response.json({ ok: true });
});
