import { roleBodySchema } from "@/modules/voice/contract";
import { changeRole } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";

export const POST = voiceRoutes.member("voice-role", roleBodySchema, async (context, body) => {
  await changeRole(context, body);
  return Response.json({ ok: true });
});
