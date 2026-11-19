import { LibraryBig } from "lucide-react";

import { MODULE_KINDS, NAVIGATION_SECTIONS, type ToggleableManifest } from "../../platform/modules/manifest.ts";
import { LIBRARY_API_PREFIX, LIBRARY_PAGE, LIBRARY_PAGE_TITLE } from "./contract.ts";

export const libraryManifest = {
  kind: MODULE_KINDS.toggleable,
  id: "library",
  label: LIBRARY_PAGE_TITLE,
  description: "Members share AI skills, agents, prompts and tool connections across the portfolio, with upvotes and a leaderboard.",
  turnOffNote: "Shared items, their files, upvotes and reviews are kept, and come back when you turn this on again.",
  icon: LibraryBig,
  // On where no admin chose (the spec, 19 Nov 2026).
  isOnByDefault: true,
  needsVillage: false,
  requires: [],
  navigation: [{ label: LIBRARY_PAGE_TITLE, href: LIBRARY_PAGE, icon: LibraryBig, section: NAVIGATION_SECTIONS.primary }],
  adminTabs: [],
  paths: { pages: [LIBRARY_PAGE], api: [LIBRARY_API_PREFIX] },
} satisfies ToggleableManifest;
