import type { ReactNode } from "react";

import { ANNOUNCEMENT_PAGE } from "@/modules/admin/contract-announcements";
import { ASKS_ADMIN_PAGE, describeNewOffers } from "@/modules/asks/contract";
import { describeUnreadMessages } from "@/modules/messages/contract";
import { ROUTES } from "@/platform/http/routes";

// `inbox` is the Inbox tab's count (unread messages + intro asks waiting for your yes); `live` is the Rooms tab's dot.
// `messages`, `introsWaiting` and `introsForYou` are what the Inbox count adds up, kept apart so each can update live.
export const NAVIGATION_BADGES = {
  admin: "admin",
  messages: "messages",
  intros: "intros",
  introsWaiting: "intros-waiting",
  introsForYou: "intros-for-you",
  inbox: "inbox",
  asks: "asks",
  live: "live",
} as const;

export type NavigationBadgeCounts = Partial<Record<string, number>>;

// Round 6 (.ai/features/simplify-round6/SPEC.md): five member tabs, the same on the phone and in the sidebar, and
// the avatar menu for the rest. A key names the item, so a page can light an item it isn't (a member's profile lights People).
export const MEMBER_KEYS = {
  rooms: "rooms",
  today: "today",
  asks: "asks",
  people: "people",
  inbox: "inbox",
  jobs: "jobs",
  perks: "perks",
  library: "library",
  feed: "feed",
  me: "me",
} as const;

export const CONSOLE_KEYS = {
  home: "home",
  members: "members",
  asks: "asks-intros",
  announce: "announce",
  report: "report",
  setup: "setup",
} as const;

// Where an item shows: the menu (the sidebar, and the phone bar for those with a tabLabel), or the avatar menu's "More".
export const MENU_PLACES = { tab: "tab", more: "more" } as const;

export type MenuPlace = (typeof MENU_PLACES)[keyof typeof MENU_PLACES];

export type ShellNavigationItem = {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  // The shorter label on the phone tab bar; every tab has one.
  tabLabel?: string;
  place: MenuPlace;
  badge?: string;
  isFullPageLoad?: boolean;
};

type ItemPlace = { key: string; href: string };

export type ShellNavigation = { member: readonly ShellNavigationItem[]; console: readonly ShellNavigationItem[] };

export const SHELL_MODES = { member: "member", console: "console" } as const;

export type ShellMode = (typeof SHELL_MODES)[keyof typeof SHELL_MODES];

function isUnder(pathname: string, href: string) {
  if (href === ROUTES.feed) return pathname === ROUTES.feed;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isNavigationItemActive(href: string, pathname: string) {
  return isUnder(pathname, href);
}

// The console is every page under /admin; an admin anywhere else sees the founder view.
export function readShellMode(pathname: string, isAdmin: boolean): ShellMode {
  return isAdmin && isUnder(pathname, ROUTES.admin) ? SHELL_MODES.console : SHELL_MODES.member;
}

// Which console item a page lights. Every admin page keeps its address; a merged page's tabs light their item.
const CONSOLE_PATHS: readonly (readonly [string, string])[] = [
  [ROUTES.adminMembers, CONSOLE_KEYS.members],
  [ROUTES.adminInvites, CONSOLE_KEYS.members],
  [ROUTES.adminImport, CONSOLE_KEYS.members],
  [ROUTES.adminLinks, CONSOLE_KEYS.members],
  [ROUTES.adminCalls, CONSOLE_KEYS.members],
  [ASKS_ADMIN_PAGE, CONSOLE_KEYS.asks],
  [ROUTES.adminIntroLog, CONSOLE_KEYS.asks],
  [ANNOUNCEMENT_PAGE, CONSOLE_KEYS.announce],
  [ROUTES.adminDigest, CONSOLE_KEYS.announce],
  [ROUTES.adminWeeklyEmail, CONSOLE_KEYS.announce],
  [ROUTES.adminReport, CONSOLE_KEYS.report],
  [ROUTES.adminHealth, CONSOLE_KEYS.report],
];

// Set up lights for everything else under /admin (settings, the guided start, features, mail, Village, the job board,
// perks, rooms, audit and flagged asks).
export function readConsoleKey(pathname: string) {
  if (pathname === ROUTES.admin) return CONSOLE_KEYS.home;
  return CONSOLE_PATHS.find(([href]) => isUnder(pathname, href))?.[1] ?? CONSOLE_KEYS.setup;
}

// The console's phone tabs: Home · Asks · Members · Announce · Set up. The Report lights Home.
const CONSOLE_TAB_OF: Partial<Record<string, string>> = { [CONSOLE_KEYS.report]: CONSOLE_KEYS.home };

export const CONSOLE_TAB_ORDER: readonly string[] = [CONSOLE_KEYS.home, CONSOLE_KEYS.asks, CONSOLE_KEYS.members, CONSOLE_KEYS.announce, CONSOLE_KEYS.setup];

export function readConsoleTabKey(pathname: string) {
  const key = readConsoleKey(pathname);
  return CONSOLE_TAB_OF[key] ?? key;
}

// Pages that belong to a tab without sitting under its address.
const MEMBER_PAGES_OF: readonly (readonly [string, string])[] = [
  [ROUTES.editCard, MEMBER_KEYS.me],
  [ROUTES.people, MEMBER_KEYS.people],
  [ROUTES.searchPages, MEMBER_KEYS.people],
  [ROUTES.newMessage, MEMBER_KEYS.inbox],
  [ROUTES.intros, MEMBER_KEYS.inbox],
];

// Which member item a page lights: the longest menu address the page sits under. My profile and its pages light
// nothing on the tabs (the avatar opens them); a member's profile and Find candidates light People; an intro lights Inbox.
export function readMemberKey(pathname: string, items: readonly ItemPlace[]) {
  const page = MEMBER_PAGES_OF.find(([href]) => isUnder(pathname, href));
  if (page) return page[1];
  const matches = items.filter(({ href }) => isUnder(pathname, href));
  return matches.sort((first, second) => second.href.length - first.href.length)[0]?.key ?? null;
}

// The tab a page lights: only the five tabs light; Jobs, Perks, Library, Feed and My profile light none.
export function readMemberTabKey(pathname: string, items: readonly (ItemPlace & { place: MenuPlace })[]) {
  const key = readMemberKey(pathname, items);
  return items.some((item) => item.key === key && item.place === MENU_PLACES.tab) ? key : null;
}

export function describeBadge(count: number) {
  return `${count} need${count === 1 ? "s" : ""} your attention`;
}

export function describeInboxBadge(count: number) {
  return count === 1 ? "1 new in your inbox" : `${count} new in your inbox`;
}

export function describeLiveRooms(count: number) {
  return count === 1 ? "A room is live" : `${count} rooms are live`;
}

const BADGE_DESCRIPTIONS: Partial<Record<string, (count: number) => string>> = {
  [NAVIGATION_BADGES.admin]: describeBadge,
  [NAVIGATION_BADGES.messages]: describeUnreadMessages,
  [NAVIGATION_BADGES.inbox]: describeInboxBadge,
  [NAVIGATION_BADGES.asks]: describeNewOffers,
  [NAVIGATION_BADGES.live]: describeLiveRooms,
};

export function describeNavigationBadge(badge: string, count: number) {
  return (BADGE_DESCRIPTIONS[badge] ?? describeBadge)(count);
}
