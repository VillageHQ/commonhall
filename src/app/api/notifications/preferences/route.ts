import { preferencesBodySchema } from "@/platform/notifications/contract";
import { savePreferences } from "@/platform/notifications/service";
import { platformRoutes } from "@/platform/modules/platform-routes";

export const POST = platformRoutes.member("notifications-preferences", preferencesBodySchema, async ({ database, member }, body) => {
  await savePreferences(database, member.id, body);
  return Response.json({ message: "Alert settings saved." });
});
