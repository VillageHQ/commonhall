import { voiceSettingsBodySchema } from "@/modules/voice/contract";
import { readVoiceSettingsView, saveVoiceSettings } from "@/modules/voice/service-settings";
import { voiceRoutes } from "@/modules/voice/routes";

export const POST = voiceRoutes.member(
  "voice-admin-settings",
  voiceSettingsBodySchema,
  async (context, body) => {
    await saveVoiceSettings(context, body);
    return Response.json(await readVoiceSettingsView(context.database, context.environment));
  },
  { adminOnly: true },
);
