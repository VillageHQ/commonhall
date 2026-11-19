import "server-only";

import { createModuleRoutes } from "@/platform/modules/module-routes";

import { voiceManifest } from "./manifest";

export const voiceRoutes = createModuleRoutes(voiceManifest);
