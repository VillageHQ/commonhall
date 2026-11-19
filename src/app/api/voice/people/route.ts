import { peopleBodySchema } from "@/modules/voice/contract";
import { searchRoomPeople } from "@/modules/voice/reads";
import { voiceRoutes } from "@/modules/voice/routes";

export const POST = voiceRoutes.member("voice-people", peopleBodySchema, async ({ database, member }, { search }) =>
  Response.json({ people: await searchRoomPeople(database, member.id, search) }),
);
