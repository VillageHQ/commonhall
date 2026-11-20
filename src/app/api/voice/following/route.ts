import { followingBodySchema } from "@/modules/voice/contract";
import { readIsFollowing } from "@/modules/voice/service";
import { voiceRoutes } from "@/modules/voice/routes";

// Whether the viewer follows a member: the profile's Follow button reads it. 404 while Rooms is off, like every
// Rooms route, so the button stays hidden then.
export const POST = voiceRoutes.member("voice-following", followingBodySchema, async ({ database, member }, { memberId }) => {
  const isSelf = memberId === member.id;
  return Response.json({ isFollowing: !isSelf && (await readIsFollowing(database, member.id, memberId)), isSelf });
});
