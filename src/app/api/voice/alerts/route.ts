import { roomAlertsBodySchema } from "@/modules/voice/contract";
import { setRoomAlerts } from "@/modules/voice/service-alerts";
import { voiceRoutes } from "@/modules/voice/routes";

// The Rooms page's "Room alerts" switch: both room kinds on or off, as the Alerts page's row.
export const POST = voiceRoutes.member("voice-alerts", roomAlertsBodySchema, async ({ database, member }, body) => {
  await setRoomAlerts(database, member.id, body);
  return Response.json({ ok: true, isOn: body.isOn });
});
