import { roomBodySchema } from "@/modules/voice/contract";
import { endRoom } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";

export const POST = voiceRoutes.member("voice-end", roomBodySchema, async (context, { roomId }) => {
  await endRoom(context, roomId);
  return Response.json({ ok: true });
});
