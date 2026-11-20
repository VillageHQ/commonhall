import { renameBodySchema } from "@/modules/voice/contract";
import { renameRoom } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";

// The host renames their room from inside it.
export const POST = voiceRoutes.member("voice-rename", renameBodySchema, async (context, body) => {
  await renameRoom(context, body);
  return Response.json({ ok: true });
});
