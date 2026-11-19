import { readBranding } from "@/platform/branding/branding";
import { DEMO_OUTSIDE_CALL_MESSAGE } from "@/platform/demo/outbound";
import { isDemoMode } from "@/platform/demo/mode";
import { testAlertBodySchema } from "@/platform/notifications/contract";
import { sendTestAlert } from "@/platform/notifications/notify";
import { platformRoutes } from "@/platform/modules/platform-routes";
import { ROUTES } from "@/platform/http/routes";

const CONFLICT_STATUS = 409;

export const POST = platformRoutes.member("notifications-test", testAlertBodySchema, async ({ database, environment, member }) => {
  const branding = await readBranding(database);
  const result = await sendTestAlert(database, environment, member.id, {
    title: `${branding.name}: a test alert`,
    body: "Alerts work on this device.",
    url: ROUTES.alerts,
  });
  if (result.devices === 0) return Response.json({ message: "Turn on alerts on this device first." }, { status: CONFLICT_STATUS });
  // The demo never calls a real push service (platform/demo/outbound.ts): say so, not "it failed".
  if (result.sent === 0 && isDemoMode(environment)) return Response.json({ ...result, message: DEMO_OUTSIDE_CALL_MESSAGE }, { status: CONFLICT_STATUS });
  if (result.sent === 0) return Response.json({ ...result, message: "The alert didn’t go through. Turn alerts off and on again here." }, { status: CONFLICT_STATUS });
  return Response.json({ ...result, message: result.sent === 1 ? "Sent. It should arrive in a moment." : `Sent to ${result.sent} devices.` });
});
