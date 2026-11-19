import { roomBodySchema } from "@/modules/voice/contract";
import { joinRoom } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";

// The token API: the web app and the phone app both call it to connect to a room.
export const POST = voiceRoutes.member("voice-join", roomBodySchema, async (context, { roomId }) => Response.json(await joinRoom(context, roomId)));
