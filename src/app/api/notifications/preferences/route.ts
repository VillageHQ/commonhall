import { preferencesBodySchema } from "@/platform/notifications/contract";
import { savePreferences } from "@/platform/notifications/service";
import { platformRoutes } from "@/platform/modules/platform-routes";

// PUT is the contract (.ai/features/notify-schedule/SPEC.md); POST stays for the app's own form (postRequest).
export const PUT = platformRoutes.member("notifications-preferences", preferencesBodySchema, async ({ database, member }, body) => {
  await savePreferences(database, member.id, body);
  return Response.json({ message: "Saved." });
});

export const POST = PUT;
