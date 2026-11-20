import "server-only";

import {
  AudioLines,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarClock,
  Database,
  FileChartColumn,
  Gift,
  Hand,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LibraryBig,
  Lock,
  Mail,
  Megaphone,
  Network,
  Newspaper,
  Settings2,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { createElement } from "react";

import { ANNOUNCEMENT_PAGE } from "@/modules/admin/contract-announcements";
import { ASKS_ADMIN_PAGE } from "@/modules/asks/contract";
import { MODULES } from "@/modules/registry";
import { ROUTES } from "@/platform/http/routes";
import { NAVIGATION_SECTIONS, type NavigationSection } from "@/platform/modules/manifest";

import { CONSOLE_KEYS, MEMBER_KEYS, MENU_PLACES, NAVIGATION_BADGES, type ShellNavigation, type ShellNavigationItem } from "./navigation-rules";
import { readSettingsLinks, SETTINGS_KEYS, type SettingsKey } from "./settings-links";

type MenuEntry = Omit<ShellNavigationItem, "icon" | "href" | "place"> & {
  icon: LucideIcon;
  place?: ShellNavigationItem["place"];
  // The modules of which at least one must be on for the entry to show; none = always.
  moduleIds?: readonly string[];
  // Where it goes: this, else the first module's own menu entry (so a renamed route follows).
  href?: string;
  // An href for when only some of its modules are on: the first whose module is on wins.
  hrefByModule?: readonly (readonly [string, string])[];
};

// The member's five tabs, in order: Rooms · Today · Asks · People · Inbox (SPEC "The member tab set"). Rooms shows
// while it's on; Inbox while Messages or Intros is. The rest sit under the avatar's "More", each while it's on.
const MEMBER_MENU: readonly MenuEntry[] = [
  { key: MEMBER_KEYS.rooms, label: "Rooms", tabLabel: "Rooms", icon: AudioLines, moduleIds: ["voice"], badge: NAVIGATION_BADGES.live },
  { key: MEMBER_KEYS.today, label: "Today", tabLabel: "Today", icon: CalendarCheck, href: ROUTES.today },
  { key: MEMBER_KEYS.asks, label: "Asks", tabLabel: "Asks", icon: Hand, moduleIds: ["asks"], badge: NAVIGATION_BADGES.asks },
  { key: MEMBER_KEYS.people, label: "People", tabLabel: "People", icon: Users, href: ROUTES.people },
  { key: MEMBER_KEYS.inbox, label: "Inbox", tabLabel: "Inbox", icon: Inbox, moduleIds: ["messages", "intros"], href: ROUTES.messages, badge: NAVIGATION_BADGES.inbox },
  { key: MEMBER_KEYS.jobs, label: "Jobs", icon: Building2, moduleIds: ["job-board"], place: MENU_PLACES.more },
  { key: MEMBER_KEYS.perks, label: "Perks", icon: Gift, moduleIds: ["perks"], place: MENU_PLACES.more },
  { key: MEMBER_KEYS.library, label: "Library", icon: LibraryBig, moduleIds: ["library"], place: MENU_PLACES.more },
  { key: MEMBER_KEYS.feed, label: "Feed", icon: Newspaper, moduleIds: ["feed"], place: MENU_PLACES.more },
];

// The console: Home · Members · Asks & intros · Announce · Report · Set up. Every admin page keeps its address.
// The phone shows the five with a tabLabel as tabs (Report lights Home).
const CONSOLE_MENU: readonly MenuEntry[] = [
  { key: CONSOLE_KEYS.home, label: "Home", tabLabel: "Home", icon: LayoutDashboard, href: ROUTES.admin },
  { key: CONSOLE_KEYS.members, label: "Members", tabLabel: "Members", icon: Users, href: ROUTES.adminMembers },
  {
    key: CONSOLE_KEYS.asks,
    label: "Asks & intros",
    tabLabel: "Asks",
    icon: Hand,
    moduleIds: ["asks", "intros"],
    hrefByModule: [
      ["asks", ASKS_ADMIN_PAGE],
      ["intros", ROUTES.adminIntroLog],
    ],
  },
  { key: CONSOLE_KEYS.announce, label: "Announce", tabLabel: "Announce", icon: Megaphone, href: ANNOUNCEMENT_PAGE },
  { key: CONSOLE_KEYS.report, label: "Report", icon: FileChartColumn, href: ROUTES.adminReport },
  { key: CONSOLE_KEYS.setup, label: "Set up", tabLabel: "Set up", icon: Settings2, href: ROUTES.adminSettings, badge: NAVIGATION_BADGES.admin },
];

const MODULE_ENTRIES = new Map(MODULES.map(({ manifest }) => [manifest.id, manifest.navigation[0]]));

const ALL_MODULE_IDS: ReadonlySet<string> = new Set(MODULES.map(({ manifest }) => manifest.id));

function readEntries(menu: readonly MenuEntry[], enabledIds: ReadonlySet<string>) {
  return menu.flatMap(({ moduleIds, href, hrefByModule, place, ...entry }) => {
    const onIds = (moduleIds ?? []).filter((id) => enabledIds.has(id));
    if (moduleIds && onIds.length === 0) return [];
    const moduleEntry = onIds[0] ? MODULE_ENTRIES.get(onIds[0]) : undefined;
    const resolvedHref = hrefByModule?.find(([id]) => enabledIds.has(id))?.[1] ?? href ?? moduleEntry?.href;
    if (!resolvedHref) return [];
    return [{ ...entry, place: place ?? MENU_PLACES.tab, href: resolvedHref, ...(moduleEntry?.isFullPageLoad ? { isFullPageLoad: true } : {}) }];
  });
}

// Every entry with every module on: the tests check each one has a page.
export const NAVIGATION = [...readEntries(MEMBER_MENU, ALL_MODULE_IDS), ...readEntries(CONSOLE_MENU, ALL_MODULE_IDS)];

export function selectNavigationItems(section: NavigationSection, isAdmin: boolean, enabledIds = ALL_MODULE_IDS) {
  if (section === NAVIGATION_SECTIONS.admin) return isAdmin ? readEntries(CONSOLE_MENU, enabledIds) : [];
  return readEntries(MEMBER_MENU, enabledIds);
}

function renderIcons(entries: ReturnType<typeof readEntries>): ShellNavigationItem[] {
  return entries.map(({ icon, ...entry }) => ({ ...entry, icon: createElement(icon, { "aria-hidden": true, className: "fh-i", strokeWidth: 1.5 }) }));
}

const SETTINGS_ICONS: Record<SettingsKey, LucideIcon> = {
  [SETTINGS_KEYS.card]: UserRound,
  [SETTINGS_KEYS.privacy]: Lock,
  [SETTINGS_KEYS.alerts]: Bell,
  [SETTINGS_KEYS.email]: Mail,
  [SETTINGS_KEYS.booking]: CalendarClock,
  [SETTINGS_KEYS.network]: Network,
  [SETTINGS_KEYS.jobs]: BriefcaseBusiness,
  [SETTINGS_KEYS.data]: Database,
  [SETTINGS_KEYS.password]: KeyRound,
};

// A server component can't pass a Lucide component to a client one, so the shell gets rendered icons.
export function buildShellNavigation(enabledIds = ALL_MODULE_IDS, isAdmin = false): ShellNavigation {
  return {
    member: renderIcons(readEntries(MEMBER_MENU, enabledIds)),
    console: isAdmin ? renderIcons(readEntries(CONSOLE_MENU, enabledIds)) : [],
    settings: readSettingsLinks(enabledIds).map((link) => ({ ...link, icon: createElement(SETTINGS_ICONS[link.key], { "aria-hidden": true, strokeWidth: 1.5 }) })),
  };
}
