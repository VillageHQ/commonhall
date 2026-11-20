import { Waypoints } from "lucide-react";

import { API_ROUTES, ROUTES } from "../../platform/http/routes.ts";
import { MODULE_KINDS, type ToggleableManifest } from "../../platform/modules/manifest.ts";

export const networkManifest = {
  kind: MODULE_KINDS.toggleable,
  id: "network",
  label: "Network",
  description: "Members search each other's networks through Village.",
  icon: Waypoints,
  turnOffNote: "Members stay in the Village group, and their networks stay shared in Village until they leave. We don't remove anyone.",
  isOnByDefault: true,
  needsVillage: true,
  requires: [],
  // Searching who members know is a step on People (round 6): no menu entry of its own.
  navigation: [],
  adminTabs: [{ label: "Village", href: ROUTES.adminVillage }],
  paths: {
    pages: [ROUTES.searchPages, ROUTES.myNetwork, ROUTES.adminVillage],
    api: ["/api/network", "/api/admin/village", API_ROUTES.dailyLimit, API_ROUTES.monthlyCap],
  },
} satisfies ToggleableManifest;
