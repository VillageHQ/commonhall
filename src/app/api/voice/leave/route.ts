import { roomBodySchema } from "@/modules/voice/contract";
import { leaveRoom } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";

export const POST = voiceRoutes.member("voice-leave", roomBodySchema, async (context, { roomId }) => {
  await leaveRoom(context, roomId);
  return Response.json({ ok: true });
});
