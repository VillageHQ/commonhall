import { Handshake } from "lucide-react";

import { API_ROUTES, ROUTES } from "../../platform/http/routes.ts";
import { MODULE_KINDS, type ToggleableManifest } from "../../platform/modules/manifest.ts";

export const introsManifest = {
  kind: MODULE_KINDS.toggleable,
  id: "intros",
  label: "Intros",
  description: "Members ask each other for warm introductions.",
  icon: Handshake,
  isOnByDefault: true,
  // Works without Village: members ask each other from profiles. With Network on, search paths are a second way in.
  needsVillage: false,
  requires: [],
  // Intros live in the Inbox (round 6): no menu entry of their own.
  navigation: [],
  adminTabs: [{ label: "Intro log", href: ROUTES.adminIntroLog }],
  paths: { pages: [ROUTES.intros, ROUTES.introConsent, ROUTES.introOptOut, ROUTES.introConsentOld], api: [API_ROUTES.intros] },
} satisfies ToggleableManifest;
