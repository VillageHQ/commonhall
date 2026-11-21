// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ASK_API_ROUTES } from "@/modules/asks/contract";
import { introsManifest } from "@/modules/intros/manifest";
import { API_ROUTES, ROUTES } from "@/platform/http/routes";

import { buildShellNavigation } from "./navigation";
import { readSettingsLinks } from "./settings-links";
import { FounderViewStrip, MenuTabOutlines, SidebarNavigation, TabBar } from "./navigation-links";
import { endPress, PressEnd, PRESSED_TIMEOUT_MS } from "./pressed-tab";
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
  endPress();
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

  it("lights a tapped tab at once, while aria-current stays on the page shown until the address changes", () => {
    location.pathname = ROUTES.today;
    renderShellPart(TabBar);
    const bar = screen.getByRole("navigation", { name: "Sections" });
    const people = within(bar).getByRole("link", { name: /People/ });

    fireEvent.pointerDown(people, { button: 0 });

    expect(people.getAttribute("data-pressed")).toBe("true");
    expect(people.getAttribute("aria-current")).toBeNull();
    expect(within(bar).getByRole("link", { name: /Today/ }).getAttribute("aria-current")).toBe("page");
    expect(bar.getAttribute("data-pressing")).toBe("true");
  });

  it("shows the tapped tab's outline in place of the page until the new page comes, and only after a tap", () => {
    location.pathname = ROUTES.today;
    window.history.replaceState(null, "", ROUTES.today);
    stubCounts(0);
    const navigation = buildShellNavigation(undefined, false);
    const shell = () =>
      createElement(
        "div",
        null,
        createElement(
          "div",
          { "data-slot": "page-width" },
          createElement("div", { "data-slot": "page" }, createElement("h1", null, "Today's page")),
          createElement(PressEnd),
          createElement(MenuTabOutlines, { navigation, isAdmin: false }),
        ),
        createElement(TabBar, { navigation, isAdmin: false, badges: {} }),
      );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Number.POSITIVE_INFINITY } } });
    const view = render(createElement(QueryClientProvider, { client: queryClient }, shell()));
    const html = document.documentElement;
    const page = () => screen.getByText("Today's page").parentElement as HTMLElement;
    const people = within(screen.getByRole("navigation", { name: "Sections" })).getByRole("link", { name: /People/ });
    const today = within(screen.getByRole("navigation", { name: "Sections" })).getByRole("link", { name: /Today/ });
    expect(getComputedStyle(page()).display).not.toBe("none");

    // A finger on the tab lights it, but the page stays until the tap.
    fireEvent.pointerDown(people, { button: 0 });
    expect(html.getAttribute("data-pending-tab")).toBeNull();

    fireEvent.click(people, { button: 0 });
    expect(html.getAttribute("data-pending-tab")).toBe(ROUTES.people);
    const outline = document.querySelector('[data-slot="tab-outline"][data-for="/people"]') as HTMLElement;
    expect(within(outline).getByRole("heading", { name: "People" })).toBeTruthy();
    expect(getComputedStyle(outline).display).toBe("block");
    expect(getComputedStyle(page()).display).toBe("none");

    // The address changes (the new page commits): no outline, nothing pressed.
    location.pathname = ROUTES.people;
    window.history.replaceState(null, "", ROUTES.people);
    view.rerender(createElement(QueryClientProvider, { client: queryClient }, shell()));
    expect(html.getAttribute("data-pending-tab")).toBeNull();
    expect(people.getAttribute("data-pressed")).toBeNull();

    // Back to Today (Back, the iOS back swipe): Today's own page, not People's outline.
    location.pathname = ROUTES.today;
    window.history.replaceState(null, "", ROUTES.today);
    view.rerender(createElement(QueryClientProvider, { client: queryClient }, shell()));
    expect(html.getAttribute("data-pending-tab")).toBeNull();
    expect(getComputedStyle(page()).display).not.toBe("none");

    // Tapping the tab already shown lights nothing; tapped while another tab's page is on the way, it gives that tab
    // up (the router keeps this page, so the address never changes to end the press).
    fireEvent.pointerDown(today, { button: 0 });
    fireEvent.click(today, { button: 0 });
    expect(today.getAttribute("data-pressed")).toBeNull();
    fireEvent.click(people, { button: 0 });
    expect(html.getAttribute("data-pending-tab")).toBe(ROUTES.people);
    fireEvent.pointerDown(today, { button: 0 });
    expect(html.getAttribute("data-pending-tab")).toBeNull();
    expect(people.getAttribute("data-pressed")).toBeNull();
    expect(getComputedStyle(page()).display).not.toBe("none");
  });

  it("lets go of every press mark, also when the pressed link left the page (a view switch)", () => {
    location.pathname = ROUTES.today;
    window.history.replaceState(null, "", ROUTES.today);
    renderShellPart(TabBar);
    const bar = screen.getByRole("navigation", { name: "Sections" });
    const people = within(bar).getByRole("link", { name: /People/ });
    fireEvent.pointerDown(people, { button: 0 });
    people.remove();

    endPress();

    expect(bar.hasAttribute("data-pressing")).toBe(false);
    expect(document.querySelectorAll("[data-pressed]").length).toBe(0);
  });

  it("forgets a press after a while, and a ⌘-click lights nothing", () => {
    vi.useFakeTimers();
    location.pathname = ROUTES.today;
    renderShellPart(TabBar);
    const people = within(screen.getByRole("navigation", { name: "Sections" })).getByRole("link", { name: /People/ });

    fireEvent.pointerDown(people, { button: 0 });
    act(() => vi.advanceTimersByTime(PRESSED_TIMEOUT_MS));

    expect(people.getAttribute("data-pressed")).toBeNull();

    fireEvent.click(people, { button: 0, metaKey: true });

    expect(people.getAttribute("data-pressed")).toBeNull();
    vi.useRealTimers();
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

describe("the Settings list", () => {
  it("is one list for the avatar menu and My profile, Your network and Our jobs only while their feature is on", () => {
    expect(readSettingsLinks(new Set()).map(({ label }) => label)).toEqual(["My card", "Privacy", "Alerts", "Email", "Booking link", "Your data", "How you sign in"]);
    expect(buildShellNavigation(new Set(["network", "job-board"])).settings.map(({ label }) => label)).toEqual(
      readSettingsLinks(new Set(["network", "job-board"])).map(({ label }) => label),
    );
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

  it("holds the Settings list, More, the console, Dark mode and Sign out", async () => {
    const menu = await openMenu(ROUTES.today);
    const items = Array.from(menu.querySelectorAll("[role^='menuitem']"), (item) => item).map((item) => item.textContent?.replace(/(On|Off)$/, ""));

    expect(items).toEqual([
      ...["My card", "Privacy", "Alerts", "Email", "Booking link", "Your network", "Our jobs", "Your data", "How you sign in"],
      ...["Jobs", "Perks", "Library", "Feed", "Admin console", "Dark mode", "Sign out"],
    ]);
    expect(within(menu).getByText("Settings")).toBeTruthy();
    expect(within(menu).getByText("More")).toBeTruthy();
    expect(within(menu).getByRole("menuitem", { name: "Alerts" }).getAttribute("href")).toBe(ROUTES.alerts);
  });

  it("offers the founder view from the console, and the Report (no phone tab), with no member pages", async () => {
    const menu = await openMenu(ROUTES.adminMembers);

    expect(within(menu).getByRole("menuitem", { name: "See it as a founder" })).toBeTruthy();
    expect(within(menu).queryByRole("menuitem", { name: "Admin console" })).toBeNull();
    expect(within(menu).queryByRole("menuitem", { name: "Perks" })).toBeNull();
    expect(within(menu).getByRole("menuitem", { name: "Report" }).getAttribute("href")).toBe(ROUTES.adminReport);
  });
});
