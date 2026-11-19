import { createRoomBodySchema } from "@/modules/voice/contract";
import { createRoom } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";

export const POST = voiceRoutes.member("voice-create", createRoomBodySchema, async (context, body) => Response.json(await createRoom(context, body)));
