import { CircleCheck, CircleDashed } from "lucide-react";
import type { Metadata } from "next";

import { Card } from "@/components/ui/card";
import { VoiceSettingsForm } from "@/modules/voice/components/voice-settings-form";
import { VOICE_PAGE, VOICE_SOURCES } from "@/modules/voice/contract";
import { voiceManifest } from "@/modules/voice/manifest";
import { readVoiceSettingsView } from "@/modules/voice/service-settings";
import { requireAdmin } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";
import { AdminSection } from "@/shell/admin-section";

export const metadata: Metadata = { title: "Rooms server" };

const STATUS_WORDS = {
  [VOICE_SOURCES.server]: "Set up, on this server.",
  [VOICE_SOURCES.saved]: "Set up, with the LiveKit Cloud keys.",
  [VOICE_SOURCES.none]: "Not yet: nobody can start a room.",
};

// Set up › Advanced › Rooms server: where voice rooms run. The installer sets up LiveKit on the same server; LiveKit Cloud keys are the
// other way. Rooms are never recorded: there is no recording setting to turn on.
export default modulePage(voiceManifest, async function AdminRoomsPage() {
  await requireAdmin();
  const view = await readVoiceSettingsView(getDatabase(), process.env);
  const isReady = view.source !== VOICE_SOURCES.none;
  const StatusIcon = isReady ? CircleCheck : CircleDashed;
  return (
    <AdminSection title="Rooms server" back={{ href: ROUTES.adminSettings, label: "Set up" }}>
      <div className="fh-grid">
        <div className="fh-c7 fh-stack">
          {view.source === VOICE_SOURCES.server ? (
            <Card className="fh-sheet">
              <h2 className="type-h3">Your own LiveKit</h2>
              <p className="fh-small mt-2">
                Address: <span className="fh-mono">{view.url}</span>
              </p>
              <p className="fh-small fh-muted mt-2">Set in the server&rsquo;s settings file.</p>
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
          <details className="fh-sheet">
            <summary className="type-h3 cursor-pointer">Ports to open</summary>
            <p className="fh-small fh-muted mt-2">
              On your own server, voice needs TCP 7881 and UDP 50000–50100 open, besides 80 and 443. The guide for self-hosting says how.
            </p>
          </details>
        </div>
      </div>
    </AdminSection>
  );
});
