import { House } from "lucide-react";

import { API_ROUTES, ROUTES } from "../../platform/http/routes.ts";
import { HOME_FEED_MODULE_ID, MODULE_KINDS, NAVIGATION_SECTIONS, type ToggleableManifest } from "../../platform/modules/manifest.ts";

export const feedManifest = {
  kind: MODULE_KINDS.toggleable,
  id: HOME_FEED_MODULE_ID,
  label: "Feed",
  description: "Members post updates, reply and react on the Feed page.",
  icon: House,
  // Off for new communities (round 6, the owner's call, 2026-11-20); an admin can turn it on, and it then sits under
  // More in the avatar menu. Communities that had members by then keep Feed as it was (migration 0046 saved "on").
  isOnByDefault: false,
  needsVillage: false,
  requires: [],
  navigation: [{ label: "Feed", href: ROUTES.feedPage, icon: House, section: NAVIGATION_SECTIONS.primary }],
  adminTabs: [],
  paths: { pages: [ROUTES.feedPage], api: [API_ROUTES.feed] },
} satisfies ToggleableManifest;
