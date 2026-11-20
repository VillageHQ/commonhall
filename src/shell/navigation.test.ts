import { readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { NAVIGATION_SECTIONS } from "@/platform/modules/manifest";
import { ROUTES } from "@/platform/http/routes";

import { NAVIGATION, selectNavigationItems } from "./navigation";
import {
  CONSOLE_KEYS,
  describeBadge,
  describeNavigationBadge,
  isNavigationItemActive,
  MEMBER_KEYS,
  MENU_PLACES,
  NAVIGATION_BADGES,
  readConsoleKey,
  readConsoleTabKey,
  readMemberKey,
  readMemberTabKey,
  readShellMode,
} from "./navigation-rules";

const APP_GROUP = resolve(import.meta.dirname, "../app/(app)");

function hasPage(href: string) {
  const directory = resolve(APP_GROUP, `.${href}`);
  return readdirSync(directory).includes("page.tsx") && statSync(directory).isDirectory();
}

const MEMBER_ITEMS = selectNavigationItems(NAVIGATION_SECTIONS.primary, false);
const ALL_ON = ["members", "admin", "voice", "asks", "messages", "intros", "network", "job-board", "perks", "library", "feed", "chat"];

function readTabs(enabledIds: readonly string[]) {
  return selectNavigationItems(NAVIGATION_SECTIONS.primary, false, new Set(enabledIds)).flatMap(({ tabLabel, place }) => (tabLabel && place === MENU_PLACES.tab ? [tabLabel] : []));
}

describe("the navigation", () => {
  it("lists only routes with a page", () => {
    for (const { href } of NAVIGATION) {
      expect(hasPage(href)).toBe(true);
    }
  });

  it("gives a member five tabs, Rooms first", () => {
    expect(readTabs(ALL_ON)).toEqual(["Rooms", "Today", "Asks", "People", "Inbox"]);
  });

  it("puts Jobs, Perks, Library and Feed under the avatar's More", () => {
    expect(MEMBER_ITEMS.filter(({ place }) => place === MENU_PLACES.more).map(({ label }) => label)).toEqual(["Jobs", "Perks", "Library", "Feed"]);
  });

  it("drops Rooms while it's off, and the Inbox only while Messages and Intros are both off", () => {
    expect(readTabs(ALL_ON.filter((id) => id !== "voice"))).toEqual(["Today", "Asks", "People", "Inbox"]);
    expect(readTabs(ALL_ON.filter((id) => id !== "messages"))).toEqual(["Rooms", "Today", "Asks", "People", "Inbox"]);
    expect(readTabs(ALL_ON.filter((id) => id !== "intros"))).toEqual(["Rooms", "Today", "Asks", "People", "Inbox"]);
    expect(readTabs(ALL_ON.filter((id) => id !== "messages" && id !== "intros"))).toEqual(["Rooms", "Today", "Asks", "People"]);
  });

  it("hides the console from members", () => {
    expect(selectNavigationItems(NAVIGATION_SECTIONS.admin, false)).toEqual([]);
  });

  it("lists the six console items for admins, five of them phone tabs", () => {
    const items = selectNavigationItems(NAVIGATION_SECTIONS.admin, true).filter(({ place }) => place === MENU_PLACES.tab);

    expect(items.map(({ label }) => label)).toEqual(["Home", "Members", "Asks & intros", "Announce", "Report", "Set up"]);
    expect(items.map(({ href }) => href)).toEqual(["/admin", "/admin/members", "/admin/asks", "/admin/announcements", "/admin/report", "/admin/settings"]);
    expect(items.flatMap(({ tabLabel }) => (tabLabel ? [tabLabel] : []))).toEqual(["Home", "Members", "Asks", "Announce", "Set up"]);
  });

  it("hides Asks & intros while both are off, and points it at the intro log while only Intros is on", () => {
    const withIntros = selectNavigationItems(NAVIGATION_SECTIONS.admin, true, new Set(["members", "admin", "intros"]));
    const withNeither = selectNavigationItems(NAVIGATION_SECTIONS.admin, true, new Set(["members", "admin"]));

    expect(withIntros.find(({ key }) => key === CONSOLE_KEYS.asks)?.href).toBe(ROUTES.adminIntroLog);
    expect(withNeither.filter(({ place }) => place === MENU_PLACES.tab).map(({ label }) => label)).toEqual(["Home", "Members", "Announce", "Report", "Set up"]);
  });

  it("keeps the Intro log and the Job board one tap away under the avatar's More in the console, while they're on", () => {
    const more = (ids: readonly string[]) =>
      selectNavigationItems(NAVIGATION_SECTIONS.admin, true, new Set(ids)).flatMap(({ place, href }) => (place === MENU_PLACES.more ? [href] : []));

    expect(more(ALL_ON)).toEqual([ROUTES.adminIntroLog, "/admin/jobs"]);
    expect(more(["members", "admin"])).toEqual([]);
  });

  describe("which item a page lights", () => {
    it("lights Today only on the root path", () => {
      expect(isNavigationItemActive(ROUTES.feed, ROUTES.feed)).toBe(true);
      expect(isNavigationItemActive(ROUTES.feed, ROUTES.people)).toBe(false);
    });

    it("doesn't match a path that only shares a prefix", () => {
      expect(isNavigationItemActive(ROUTES.admin, `${ROUTES.admin}-other`)).toBe(false);
    });

    const TABS = MEMBER_ITEMS.filter(({ place }) => place === MENU_PLACES.tab);

    it.each([
      [ROUTES.today, MEMBER_KEYS.today],
      [ROUTES.people, MEMBER_KEYS.people],
      ["/people/abc", MEMBER_KEYS.people],
      [ROUTES.findCandidates, MEMBER_KEYS.people],
      [ROUTES.editCard, null],
      [ROUTES.yourData, null],
      [ROUTES.alerts, null],
      ["/jobs/yours", null],
      ["/library", null],
      ["/inbox/123", MEMBER_KEYS.inbox],
      [ROUTES.newMessage, MEMBER_KEYS.inbox],
      ["/intros/abc", MEMBER_KEYS.inbox],
      ["/rooms/abc", MEMBER_KEYS.rooms],
      [ROUTES.welcome, null],
    ])("%s lights the %s tab", (pathname, tabKey) => {
      expect(readMemberTabKey(pathname, TABS)).toBe(tabKey);
    });

    it("lights My profile's item for its pages", () => {
      expect(readMemberKey(ROUTES.alerts, MEMBER_ITEMS)).toBe(MEMBER_KEYS.me);
    });

    it.each([
      [ROUTES.admin, CONSOLE_KEYS.home, CONSOLE_KEYS.home],
      [ROUTES.adminReport, CONSOLE_KEYS.report, CONSOLE_KEYS.home],
      [ROUTES.adminHealth, CONSOLE_KEYS.report, CONSOLE_KEYS.home],
      [ROUTES.adminIntroLog, CONSOLE_KEYS.asks, CONSOLE_KEYS.asks],
      ["/admin/asks", CONSOLE_KEYS.asks, CONSOLE_KEYS.asks],
      [ROUTES.adminInvites, CONSOLE_KEYS.members, CONSOLE_KEYS.members],
      [ROUTES.adminImport, CONSOLE_KEYS.members, CONSOLE_KEYS.members],
      [ROUTES.adminLinks, CONSOLE_KEYS.members, CONSOLE_KEYS.members],
      [ROUTES.adminCalls, CONSOLE_KEYS.members, CONSOLE_KEYS.members],
      ["/admin/announcements", CONSOLE_KEYS.announce, CONSOLE_KEYS.announce],
      [ROUTES.adminDigest, CONSOLE_KEYS.announce, CONSOLE_KEYS.announce],
      [ROUTES.adminWeeklyEmail, CONSOLE_KEYS.announce, CONSOLE_KEYS.announce],
      ["/admin/jobs", CONSOLE_KEYS.setup, CONSOLE_KEYS.setup],
      [ROUTES.adminVillage, CONSOLE_KEYS.setup, CONSOLE_KEYS.setup],
      [ROUTES.adminMail, CONSOLE_KEYS.setup, CONSOLE_KEYS.setup],
      [ROUTES.adminReports, CONSOLE_KEYS.setup, CONSOLE_KEYS.setup],
      [ROUTES.adminFeatures, CONSOLE_KEYS.setup, CONSOLE_KEYS.setup],
      [ROUTES.adminAuditLog, CONSOLE_KEYS.setup, CONSOLE_KEYS.setup],
      [ROUTES.adminSetup, CONSOLE_KEYS.setup, CONSOLE_KEYS.setup],
      [ROUTES.adminStart, CONSOLE_KEYS.setup, CONSOLE_KEYS.setup],
    ])("%s lights %s in the console and %s on the phone", (pathname, sidebarKey, tabKey) => {
      expect(readConsoleKey(pathname)).toBe(sidebarKey);
      expect(readConsoleTabKey(pathname)).toBe(tabKey);
    });

    it("shows the console only to an admin under /admin", () => {
      expect(readShellMode(ROUTES.adminMembers, true)).toBe("console");
      expect(readShellMode(ROUTES.feed, true)).toBe("member");
      expect(readShellMode(ROUTES.adminMembers, false)).toBe("member");
    });
  });

  it("describes badges for screen readers with correct grammar", () => {
    expect(describeBadge(1)).toBe("1 needs your attention");
    expect(describeBadge(3)).toBe("3 need your attention");
  });

  it("describes the Inbox count and the live dot in plain words", () => {
    expect(describeNavigationBadge(NAVIGATION_BADGES.inbox, 1)).toBe("1 new in your inbox");
    expect(describeNavigationBadge(NAVIGATION_BADGES.inbox, 2)).toBe("2 new in your inbox");
    expect(describeNavigationBadge(NAVIGATION_BADGES.live, 1)).toBe("A room is live");
    expect(describeNavigationBadge(NAVIGATION_BADGES.live, 2)).toBe("2 rooms are live");
  });

  it("describes the asks badge as new offers", () => {
    expect(describeNavigationBadge(NAVIGATION_BADGES.asks, 1)).toBe("1 new offer of help");
    expect(describeNavigationBadge(NAVIGATION_BADGES.asks, 3)).toBe("3 new offers of help");
  });

  it("describes the messages badge as unread messages", () => {
    expect(describeNavigationBadge(NAVIGATION_BADGES.messages, 1)).toBe("1 unread message");
    expect(describeNavigationBadge(NAVIGATION_BADGES.messages, 4)).toBe("4 unread messages");
  });
});
