import { AudioLines } from "lucide-react";

import { MODULE_KINDS, NAVIGATION_SECTIONS, type ToggleableManifest } from "../../platform/modules/manifest.ts";
import { VOICE_ADMIN_PAGE, VOICE_API_ROUTES, VOICE_PAGE } from "./contract.ts";

export const voiceManifest = {
  kind: MODULE_KINDS.toggleable,
  id: "voice",
  label: "Rooms",
  description: "Live voice rooms, like Clubhouse: a stage, an audience, raised hands, and alerts to the people you choose. Never recorded.",
  turnOffNote: "Members stop seeing Rooms, and live rooms stop letting people in. Nothing said in a room was ever stored.",
  icon: AudioLines,
  // Off, except on a fresh install whose installer made a voice server (install.sh writes ROOMS_ON_BY_DEFAULT=true in
  // a new .env only). An admin's own choice is stored and always wins; an existing install never gets the line.
  get isOnByDefault() {
    return typeof process !== "undefined" && process.env.ROOMS_ON_BY_DEFAULT === "true";
  },
  needsVillage: false,
  requires: [],
  navigation: [{ label: "Rooms", href: VOICE_PAGE, icon: AudioLines, section: NAVIGATION_SECTIONS.primary }],
  adminTabs: [{ label: "Rooms", href: VOICE_ADMIN_PAGE }],
  paths: { pages: [VOICE_PAGE, VOICE_ADMIN_PAGE], api: [VOICE_API_ROUTES.base, VOICE_API_ROUTES.adminSettings] },
} satisfies ToggleableManifest;
