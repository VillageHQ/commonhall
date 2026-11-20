// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ASK_API_ROUTES } from "@/modules/asks/contract";
import { introsManifest } from "@/modules/intros/manifest";
import { API_ROUTES, ROUTES } from "@/platform/http/routes";

import { buildShellNavigation } from "./navigation";
import { FounderViewStrip, SidebarNavigation, TabBar } from "./navigation-links";
import { PhoneAccountButton } from "./user-menu";

const location = vi.hoisted(() => ({ pathname: "/" }));

vi.mock("next/navigation", () => ({ usePathname: () => location.pathname }));
// Marks the app's own links, so a test can tell them from a plain full-page link.
vi.mock("next/link", async () => {
  const { createElement: create } = await import("react");
  return { default: (props: Record<string, unknown>) => create("a", { ...props, "data-app-link": "" }) };
});

function stubCounts(unreadCount: number) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (path: string) => {
      if (path === API_ROUTES.introCounts) {
        return new Response(JSON.stringify({ waitingOnYou: 0, updates: 0 }), { headers: { "Content-Type": "application/json" } });
      }
      if (path === ASK_API_ROUTES.counts) {
        return new Response(JSON.stringify({ newOffers: 0 }), { headers: { "Content-Type": "application/json" } });
      }
      if (path !== API_ROUTES.messageUnreadCount) throw new Error(`Unexpected request to ${path}`);
      return new Response(JSON.stringify({ unreadCount }), { headers: { "Content-Type": "application/json" } });
    }),
  );
}

function renderWithClient(element: ReturnType<typeof createElement>, staleTime?: number) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, ...(staleTime === undefined ? {} : { staleTime }) } } });
  render(createElement(QueryClientProvider, { client: queryClient }, element));
  return queryClient;
}

type ShellPartOptions = { isAdmin?: boolean; enabledIds?: readonly string[]; badges?: Record<string, number> };

function renderShellPart(part: typeof TabBar | typeof SidebarNavigation, { isAdmin = false, enabledIds, badges = {} }: ShellPartOptions = {}) {
  stubCounts(0);
  const navigation = enabledIds ? buildShellNavigation(new Set(enabledIds), isAdmin) : buildShellNavigation(undefined, isAdmin);
  renderWithClient(createElement(part, { navigation, isAdmin, badges }), Number.POSITIVE_INFINITY);
}

function readNames(label: string) {
  return Array.from(screen.getByRole("navigation", { name: label }).querySelectorAll("a"), (link) => link.textContent);
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  location.pathname = ROUTES.feed;
});

describe("the phone tab bar", () => {
  it("shows a member five tabs, Rooms first", () => {
    renderShellPart(TabBar);

    expect(readNames("Sections")).toEqual(["Rooms", "Today", "Asks", "People", "Inbox"]);
  });

  it("fits the tabs in equal columns", () => {
    renderShellPart(TabBar, { isAdmin: true });

    const bar = screen.getByRole("navigation", { name: "Sections" });
    expect(bar.style.gridTemplateColumns).toBe("repeat(5, 1fr)");
    expect(bar.dataset.count).toBe("5");
  });

  it("leaves out the tab of a module that is off", () => {
    renderShellPart(TabBar, { enabledIds: ["feed", "members", introsManifest.id, "admin"] });

    expect(readNames("Sections")).toEqual(["Today", "People", "Inbox"]);
  });

  it("gives an admin on member pages the same five tabs (the console is in the avatar menu)", () => {
    renderShellPart(TabBar, { isAdmin: true });

    expect(readNames("Sections")).toEqual(["Rooms", "Today", "Asks", "People", "Inbox"]);
  });

  it("shows the console's five tabs in the console", () => {
    location.pathname = ROUTES.adminInvites;
    renderShellPart(TabBar, { isAdmin: true });

    expect(readNames("Sections")).toEqual(["Home", "Asks", "Members", "Announce", "Set up"]);
    expect(screen.getByRole("link", { name: "Members" }).getAttribute("aria-current")).toBe("page");
  });

  it("lights nothing on My profile or the job board", () => {
    for (const pathname of [ROUTES.editCard, "/jobs"]) {
      location.pathname = pathname;
      renderShellPart(TabBar);

      expect(screen.getByRole("navigation", { name: "Sections" }).querySelector("[aria-current]")).toBeNull();
      cleanup();
    }
  });

  it("lights People on a member's profile, and Inbox on an intro", () => {
    location.pathname = "/people/abc";
    renderShellPart(TabBar);
    expect(screen.getByRole("link", { name: "People" }).getAttribute("aria-current")).toBe("page");
    cleanup();

    location.pathname = "/intros/abc";
    renderShellPart(TabBar);
    expect(screen.getByRole("link", { name: "Inbox" }).getAttribute("aria-current")).toBe("page");
  });

  it("counts unread messages and the intro asks waiting for your yes on the Inbox", () => {
    renderShellPart(TabBar, { badges: { messages: 1, "intros-waiting": 2, "intros-for-you": 1 } });

    const inboxTab = screen.getByRole("link", { name: /Inbox/ });
    expect(within(inboxTab).getByRole("img", { name: "4 new in your inbox" }).textContent).toBe("4");
  });

  it("shows a dot on Rooms while a room is live", () => {
    renderShellPart(TabBar, { badges: { live: 1 } });

    expect(within(screen.getByRole("link", { name: /Rooms/ })).getByRole("img", { name: "A room is live" }).textContent).toBe("");
  });
});

describe("the sidebar", () => {
  it("lists the same five under Members", () => {
    renderShellPart(SidebarNavigation);

    expect(screen.getByText("Members")).toBeTruthy();
    expect(readNames("Main")).toEqual(["Rooms", "Today", "Asks", "People", "Inbox"]);
  });

  it("lists the six console items under Console on console pages", () => {
    location.pathname = ROUTES.adminVillage;
    renderShellPart(SidebarNavigation, { isAdmin: true });

    expect(screen.getByText("Console")).toBeTruthy();
    expect(readNames("Main")).toEqual(["Home", "Members", "Asks & intros", "Announce", "Report", "Set up"]);
    expect(screen.getByRole("link", { name: "Set up" }).getAttribute("aria-current")).toBe("page");
  });
});

describe("the Inbox count", () => {
  it("follows the unread count the server reports", async () => {
    stubCounts(4);
    const queryClient = renderWithClient(createElement(TabBar, { navigation: buildShellNavigation(), isAdmin: false, badges: { messages: 1 } }));

    await queryClient.invalidateQueries();

    await waitFor(() => expect(screen.getByRole("img", { name: "4 new in your inbox" })).toBeTruthy());
  });
});

describe("the founder-view strip", () => {
  it("shows on member pages only", () => {
    render(createElement(FounderViewStrip, { name: "Maya Ortiz" }));
    expect(screen.getByText(/What members see. You are Maya Ortiz, an admin./)).toBeTruthy();
    cleanup();

    location.pathname = ROUTES.adminReport;
    render(createElement(FounderViewStrip, { name: "Maya Ortiz" }));
    expect(screen.queryByText(/Founder view/)).toBeNull();
  });
});

describe("the avatar menu", () => {
  const MAYA = { id: "maya", name: "Maya Ortiz", email: "maya@example.com", image: null, isAdmin: true };

  async function openMenu(pathname: string) {
    location.pathname = pathname;
    stubCounts(0);
    renderWithClient(createElement(PhoneAccountButton, { member: MAYA, navigation: buildShellNavigation(undefined, true) }));
    const trigger = screen.getByRole("button", { name: "Your menu" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    return screen.findByRole("menu");
  }

  it("holds the member's pages, More, the console, Dark mode and Sign out", async () => {
    const menu = await openMenu(ROUTES.today);
    const items = Array.from(menu.querySelectorAll("[role^='menuitem']"), (item) => item).map((item) => item.textContent?.replace(/(On|Off)$/, ""));

    expect(items).toEqual(["My profile", "Alerts", "Email", "Your data", "Jobs", "Perks", "Library", "Feed", "Admin console", "Dark mode", "Sign out"]);
    expect(within(menu).getByText("More")).toBeTruthy();
    expect(within(menu).getByRole("menuitem", { name: "Alerts" }).getAttribute("href")).toBe(ROUTES.alerts);
  });

  it("offers the founder view, the Intro log and the Job board from the console", async () => {
    const menu = await openMenu(ROUTES.adminMembers);

    expect(within(menu).getByRole("menuitem", { name: "See it as a founder" })).toBeTruthy();
    expect(within(menu).queryByRole("menuitem", { name: "Admin console" })).toBeNull();
    expect(within(menu).getByRole("menuitem", { name: "Intro log" }).getAttribute("href")).toBe(ROUTES.adminIntroLog);
    expect(within(menu).getByRole("menuitem", { name: "Job board" }).getAttribute("href")).toBe("/admin/jobs");
    expect(within(menu).queryByRole("menuitem", { name: "Perks" })).toBeNull();
  });
});
