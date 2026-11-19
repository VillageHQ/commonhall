import "server-only";

import type { ModuleIntegration } from "@/platform/modules/integration";

import { libraryManifest } from "./manifest";
import { deleteMemberLibrary } from "./service";

export const libraryModule: ModuleIntegration = {
  manifest: libraryManifest,
  onMemberRemoved: deleteMemberLibrary,
};
