import { inviteBodySchema } from "@/modules/voice/contract";
import { inviteMembers } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";

export const POST = voiceRoutes.member("voice-invite", inviteBodySchema, async (context, body) => {
  await inviteMembers(context, body);
  return Response.json({ ok: true });
});
