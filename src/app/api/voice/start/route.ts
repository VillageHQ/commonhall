import { roomBodySchema } from "@/modules/voice/contract";
import { startScheduledRoom } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";

export const POST = voiceRoutes.member("voice-start", roomBodySchema, async (context, { roomId }) => {
  await startScheduledRoom(context, roomId);
  return Response.json({ ok: true });
});
