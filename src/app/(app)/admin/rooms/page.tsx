import { CircleCheck, CircleDashed } from "lucide-react";
import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { VoiceSettingsForm } from "@/modules/voice/components/voice-settings-form";
import { VOICE_PAGE, VOICE_SOURCES } from "@/modules/voice/contract";
import { voiceManifest } from "@/modules/voice/manifest";
import { readVoiceSettingsView } from "@/modules/voice/service-settings";
import { requireAdmin } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { modulePage } from "@/platform/modules/module-page";
import { AdminSection } from "@/shell/admin-section";

export const metadata: Metadata = { title: "Rooms" };

const STATUS_WORDS = {
  [VOICE_SOURCES.server]: "Set up: this server runs its own LiveKit, so rooms run on your own host.",
  [VOICE_SOURCES.saved]: "Set up: rooms run on the LiveKit Cloud keys below.",
  [VOICE_SOURCES.none]: "Not yet: members see Rooms, but can't start or join one until LiveKit is set up.",
};

// Set up › Rooms: where voice rooms run. The installer sets up LiveKit on the same server; LiveKit Cloud keys are the
// other way. Rooms are never recorded: there is no recording setting to turn on.
export default modulePage(voiceManifest, async function AdminRoomsPage() {
  await requireAdmin();
  const view = await readVoiceSettingsView(getDatabase(), process.env);
  const isReady = view.source !== VOICE_SOURCES.none;
  const StatusIcon = isReady ? CircleCheck : CircleDashed;
  return (
    <AdminSection title="Rooms" description="Live voice rooms for your members, like Clubhouse. Nothing said in a room is recorded or stored.">
      <div className="fh-grid">
        <div className="fh-c7 fh-stack">
          {view.source === VOICE_SOURCES.server ? (
            <Card className="fh-sheet">
              <h2 className="type-h3">Your own LiveKit</h2>
              <p className="fh-small mt-2">
                Address: <span className="fh-mono">{view.url}</span>
              </p>
              <p className="fh-small fh-muted mt-2">Set in the server&rsquo;s settings file (LIVEKIT_URL, LIVEKIT_API_KEY, LIVEKIT_API_SECRET). The installer made these keys.</p>
            </Card>
          ) : (
            <VoiceSettingsForm view={view} />
          )}
        </div>
        <div className="fh-c5 fh-stack">
          <Card className="fh-sheet">
            <h2 className="type-h3">Status</h2>
            <p className="fh-small mt-2">
              <StatusIcon aria-hidden="true" className="fh-i fh-xs inline align-[-2px]" strokeWidth={1.5} /> {STATUS_WORDS[view.source]}
              {isReady ? (
                <>
                  {" "}
                  <a href={VOICE_PAGE}>Open Rooms</a>
                </>
              ) : null}
            </p>
          </Card>
          <Card className="fh-sheet">
            <h2 className="type-h3">Ports to open</h2>
            <p className="fh-small fh-muted mt-2">
              On your own server, voice needs TCP 7881 and UDP 50000–50100 open, besides 80 and 443. The guide for self-hosting says how.
            </p>
          </Card>
        </div>
      </div>
    </AdminSection>
  );
});
