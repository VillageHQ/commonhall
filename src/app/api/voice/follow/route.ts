import { followBodySchema } from "@/modules/voice/contract";
import { setFollow } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";

// Follow or unfollow a member's rooms ("Tell me when they start a room").
export const POST = voiceRoutes.member("voice-follow", followBodySchema, async (context, body) => {
  await setFollow(context, body);
  return Response.json({ ok: true });
});
