import { notifyBodySchema } from "@/modules/voice/contract";
import { tellPeopleHere } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";
import { sendRoomNotifySoon } from "@/shell/voice-alerts";

// "Tell people I'm here": once per room, to up to 10 people picked. The alert goes after the response.
export const POST = voiceRoutes.member("voice-notify", notifyBodySchema, async (context, body) => {
  sendRoomNotifySoon(context.database, context.environment, await tellPeopleHere(context, body));
  return Response.json({ ok: true });
});
