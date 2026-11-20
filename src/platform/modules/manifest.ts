import type { LucideIcon } from "lucide-react";

// Other modules link to the home feed when it's on. They check this id, so they needn't import the feed.
export const HOME_FEED_MODULE_ID = "feed";

// Other modules offer "Ask the community" with the ask written for them, without importing asks.
export const ASKS_MODULE_ID = "asks";
export const ASK_DRAFT_PARAM = "draft";
export const ASK_DRAFT_CATEGORY_PARAM = "category";
// A hiring request made from a job carries the job: the server checks it, and then the ask uses no weekly ask.
export const ASK_DRAFT_JOB_PARAM = "job";

// The composer opens filled in; nothing posts until the member sends it. The category and the job are optional.
export function toAskDraftHref(title: string, extra: { category?: string | null; jobId?: string | null } = {}) {
  const params = new URLSearchParams({ [ASK_DRAFT_PARAM]: title });
  if (extra.category) params.set(ASK_DRAFT_CATEGORY_PARAM, extra.category);
  if (extra.jobId) params.set(ASK_DRAFT_JOB_PARAM, extra.jobId);
  return `/asks?${params.toString()}`;
}

export const MODULE_KINDS = { core: "core", toggleable: "toggleable" } as const;
export const NAVIGATION_SECTIONS = { primary: "primary", admin: "admin" } as const;

export type NavigationSection = (typeof NAVIGATION_SECTIONS)[keyof typeof NAVIGATION_SECTIONS];

export type NavigationEntry = {
  label: string;
  href: string;
  icon: LucideIcon;
  section: NavigationSection;
  badge?: string;
  // A page with its own security headers (set per route in next.config.mjs) only gets them on a full
  // page load, so its menu entry skips client-side navigation.
  isFullPageLoad?: boolean;
};

type ManifestFields = {
  id: string;
  label: string;
  description: string;
  turnOffNote?: string;
  icon: LucideIcon;
  navigation: readonly NavigationEntry[];
  adminTabs: readonly { label: string; href: string }[];
  requires: readonly ToggleableManifest[];
  needsVillage: boolean;
  paths: { pages: readonly string[]; api: readonly string[] };
};

export type CoreManifest = ManifestFields & { kind: typeof MODULE_KINDS.core };
export type ToggleableManifest = ManifestFields & { kind: typeof MODULE_KINDS.toggleable; isOnByDefault: boolean };
export type ModuleManifest = CoreManifest | ToggleableManifest;
