import { emptyBodySchema } from "@/modules/voice/contract";
import { readRoomsPage } from "@/modules/voice/reads";
import { voiceRoutes } from "@/modules/voice/routes";

export const POST = voiceRoutes.member("voice-rooms", emptyBodySchema, async ({ database, environment, member }) =>
  Response.json(await readRoomsPage(database, environment, member.id)),
);
