import { remindBodySchema } from "@/modules/voice/contract";
import { setReminder } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";

export const POST = voiceRoutes.member("voice-remind", remindBodySchema, async (context, body) => {
  await setReminder(context, body);
  return Response.json({ ok: true });
});
