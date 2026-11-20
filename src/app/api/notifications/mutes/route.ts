import { muteBodySchema } from "@/platform/notifications/contract";
import { setMute } from "@/platform/notifications/service";
import { platformRoutes } from "@/platform/modules/platform-routes";

export const POST = platformRoutes.member("notifications-mute", muteBodySchema, async ({ database, member }, body) => {
  await setMute(database, member.id, body.userId, body.isMuted);
  return Response.json({ message: body.isMuted ? "Their rooms won’t alert you." : "Their rooms can alert you again." });
});
