import { registerDeviceBodySchema, removeDeviceBodySchema } from "@/platform/notifications/contract";
import { forgetDevice, registerDevice } from "@/platform/notifications/service";
import { platformRoutes } from "@/platform/modules/platform-routes";

// A browser's Web Push subscription or the store app's Expo token (the contract other parts use).
export const POST = platformRoutes.member("notifications-device-register", registerDeviceBodySchema, async ({ database, environment, member }, body) => {
  await registerDevice(database, environment, member.id, body);
  return Response.json({ message: "Alerts are on for this device." });
});

export const DELETE = platformRoutes.member("notifications-device-forget", removeDeviceBodySchema, async ({ database, member }, body) => {
  await forgetDevice(database, member.id, body.address);
  return Response.json({ message: "Alerts are off for this device." });
});
