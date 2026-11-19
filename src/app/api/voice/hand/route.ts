import { handBodySchema } from "@/modules/voice/contract";
import { setHand } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";

export const POST = voiceRoutes.member("voice-hand", handBodySchema, async (context, body) => {
  await setHand(context, body);
  return Response.json({ ok: true });
});
