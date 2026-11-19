import { AudioLines } from "lucide-react";

import { MODULE_KINDS, NAVIGATION_SECTIONS, type ToggleableManifest } from "../../platform/modules/manifest.ts";
import { VOICE_ADMIN_PAGE, VOICE_API_ROUTES, VOICE_PAGE } from "./contract.ts";

export const voiceManifest = {
  kind: MODULE_KINDS.toggleable,
  id: "voice",
  label: "Rooms",
  description: "Live voice rooms, like Clubhouse: a stage, an audience, raised hands, and \"I'm available to talk\". Never recorded.",
  turnOffNote: "Members stop seeing Rooms, and live rooms stop letting people in. Nothing said in a room was ever stored.",
  icon: AudioLines,
  isOnByDefault: false,
  needsVillage: false,
  requires: [],
  navigation: [{ label: "Rooms", href: VOICE_PAGE, icon: AudioLines, section: NAVIGATION_SECTIONS.primary }],
  adminTabs: [{ label: "Rooms", href: VOICE_ADMIN_PAGE }],
  paths: { pages: [VOICE_PAGE, VOICE_ADMIN_PAGE], api: [VOICE_API_ROUTES.base, VOICE_API_ROUTES.adminSettings] },
} satisfies ToggleableManifest;
