import { roomBodySchema, type StartedRoom } from "@/modules/voice/contract";
import { startScheduledRoom } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";
import { sendRoomNotifySoon, sendRoomRemindersSoon } from "@/shell/voice-alerts";

// "Start now" alerts the members who tapped Remind me ("Starting now") and everyone else (the room's start alert),
// after the response.
export const POST = voiceRoutes.member("voice-start", roomBodySchema, async (context, { roomId }) => {
  const { reminder, notify, isQuiet } = await startScheduledRoom(context, roomId);
  if (reminder) sendRoomRemindersSoon(context.database, context.environment, [reminder]);
  if (notify) sendRoomNotifySoon(context.database, context.environment, notify);
  return Response.json({ roomId, isQuiet } satisfies StartedRoom);
});
