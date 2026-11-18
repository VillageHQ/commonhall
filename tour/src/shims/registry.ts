import type { ModuleIntegration } from "@/platform/modules/integration";

import { adminManifest } from "@/modules/admin/manifest";
import { asksManifest } from "@/modules/asks/manifest";
import { chatManifest } from "@/modules/chat/manifest";
import { feedManifest } from "@/modules/feed/manifest";
import { introsManifest } from "@/modules/intros/manifest";
import { jobBoardManifest } from "@/modules/job-board/manifest";
import { membersManifest } from "@/modules/members/manifest";
import { messagesManifest } from "@/modules/messages/manifest";
import { networkManifest } from "@/modules/network/manifest";
import { perksManifest } from "@/modules/perks/manifest";

// The tour's stand-in for `src/modules/registry.ts`: the same modules, by their manifests only (the menu reads
// nothing else), so the shell's real menu builds without the modules' server code.
export const MODULES: readonly ModuleIntegration[] = [
  { manifest: feedManifest },
  { manifest: messagesManifest },
  { manifest: membersManifest },
  { manifest: networkManifest },
  { manifest: introsManifest },
  { manifest: asksManifest },
  { manifest: jobBoardManifest },
  { manifest: perksManifest },
  { manifest: chatManifest },
  { manifest: adminManifest },
];
