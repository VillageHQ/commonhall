import { pauseBodySchema } from "@/platform/notifications/contract";
import { pauseAlerts } from "@/platform/notifications/service";
import { platformRoutes } from "@/platform/modules/platform-routes";

// Pause alerts for an hour or until 08:00 tomorrow, or resume ({ until: null }).
export const POST = platformRoutes.member("notifications-pause", pauseBodySchema, async ({ database, member }, body) => {
  const pausedUntil = await pauseAlerts(database, member.id, body, new Date());
  return Response.json({ message: pausedUntil ? "Alerts paused." : "Alerts back on.", pausedUntil: pausedUntil?.toISOString() ?? null });
});
