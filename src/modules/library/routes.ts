import "server-only";

import { createModuleRoutes } from "@/platform/modules/module-routes";

import { libraryManifest } from "./manifest";

export const libraryRoutes = createModuleRoutes(libraryManifest);
