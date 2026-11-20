// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement, type ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FlashProvider } from "@/components/flash";
import { INTRO_OUTCOMES, INTRO_ROLES, INTRO_STATES, type Intro, type IntroBoard } from "@/modules/intros/contract";
import { MessagesSlotProvider } from "@/modules/messages/components/messages-slot-provider";
import { issuedConsentQuery } from "@/modules/intros/queries";
import { API_ROUTES } from "@/platform/http/routes";

import { IntroPage } from "./intro-page";
import { IntrosList } from "./intros-list";
import { TargetLinkQuestion } from "./public-intro";

const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router, useSearchParams: () => new URLSearchParams(), usePathname: () => "/intros/x" }));

const COMMUNITY = "Northwind Founders";
const NOTE = "I’m Marcus, CTO of Brightwater Logistics.";

const SAM = { id: "sam", name: "Sam Lee", headline: "Co-founder & CEO, Tallyhealth", linkedinSlug: null, avatarUrl: null, isAvailable: true };
const MARCUS = { id: "marcus", name: "Marcus Webb", headline: "CTO, Brightwater Logistics", linkedinSlug: null, avatarUrl: null, isAvailable: true };

function makeIntro(overrides: Partial<Intro> = {}): Intro {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    state: INTRO_STATES.requested,
    viewerRole: INTRO_ROLES.requester,
    note: NOTE,
    reason: "Worked together.",
    declineReason: null,
    declineKind: null,
    hasUpdate: false,
    createdAt: "2026-11-11T10:00:00.000Z",
    acceptedAt: null,
    askedTargetAt: null,
    targetAgreedAt: null,
    outcome: null,
    isOutcomeDue: false,
    closedAt: null,
    expiresAt: "2026-11-18T10:00:00.000Z",
    target: { name: "Rosa Lindqvist", headline: "CTO at Halcyon Health", linkedinSlug: null, isNamed: true },
    suggestedTargetEmail: null,
    requester: SAM,
    introducer: MARCUS,
    ...overrides,
  };
}

function renderInApp(element: ReactElement, seed?: (queryClient: QueryClient) => void) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  seed?.(queryClient);
  return render(createElement(QueryClientProvider, { client: queryClient }, createElement(FlashProvider, null, createElement(MessagesSlotProvider, null, element))));
}

function makeBoard(overrides: Partial<IntroBoard> = {}): IntroBoard {
  return { asksForYou: [], yourAsks: [], counts: { waitingOnYou: 0, updates: 0, outcomesDue: 0 }, ...overrides };
}

describe("the intro screens (Commonhall's)", () => {
  let posts: { path: string; body: Record<string, unknown> }[];

  beforeEach(() => {
    posts = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (path: string, init?: RequestInit) => {
        posts.push({ path, body: JSON.parse(String(init?.body ?? "{}")) });
        return new Response(JSON.stringify({ ...makeIntro(), consentIssue: null }), { headers: { "Content-Type": "application/json" } });
      }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  describe("the Inbox's intros", () => {
    it("lists what waits for your yes and your asks as rows", () => {
      const waiting = makeIntro({ viewerRole: INTRO_ROLES.introducer, requester: MARCUS, introducer: SAM, target: { name: "Rachel Kim", headline: null, linkedinSlug: null, isNamed: true } });
      const mine = makeIntro({ id: "22222222-2222-4222-8222-222222222222", state: INTRO_STATES.completed, target: { name: "Alex Kim", headline: "Head of Procurement at Halcyon Health", linkedinSlug: null, isNamed: true }, introducer: { ...MARCUS, name: "Priya Shah" } });
      renderInApp(createElement(IntrosList, { board: makeBoard({ asksForYou: [waiting], yourAsks: [mine] }) }));

      expect(screen.getByRole("heading", { level: 2, name: "Waiting on you" })).toBeTruthy();
      expect(screen.getByRole("heading", { level: 2, name: "You asked" })).toBeTruthy();
      expect(screen.getByRole("link", { name: /Marcus Webb asks you for an intro to Rachel Kim/ }).getAttribute("href")).toBe(`/intros/${waiting.id}`);
      expect(screen.getByText("Answer")).toBeTruthy();
      expect(screen.getByText("Alex Kim via Priya Shah")).toBeTruthy();
      expect(screen.getByText("Halcyon Health · asked 11 Nov")).toBeTruthy();
      expect(screen.getByText("Introduced")).toBeTruthy();
    });

    it("offers People when there's nothing yet", () => {
      renderInApp(createElement(IntrosList, { board: makeBoard() }));

      expect(screen.getByText("No intro asks yet.")).toBeTruthy();
      expect(screen.queryByText("Waiting on you")).toBeNull();
      expect(screen.getByRole("link", { name: "Find someone" }).getAttribute("href")).toBe("/people");
    });
  });

  describe("the asker's tracker", () => {
    it("shows the steps ahead and withdraws the ask", async () => {
      renderInApp(createElement(IntroPage, { intro: makeIntro(), community: COMMUNITY, canEmail: true, hasThread: false }));

      expect(screen.getByRole("heading", { level: 1, name: "Sam ↔ Rosa, via Marcus" })).toBeTruthy();
      expect(screen.getByText("With Marcus")).toBeTruthy();
      expect(screen.getByText("CTO, Halcyon Health")).toBeTruthy();
      for (const step of ["You asked Marcus", "Marcus decides", "Rosa decides", "Introduced by email from Northwind Founders", "Was it helpful?"]) {
        expect(screen.getByText(step)).toBeTruthy();
      }
      expect(screen.getByText("Sam’s note, as sent")).toBeTruthy();
      expect(screen.getByText("Admins see names, never the note.")).toBeTruthy();
      expect(screen.getByText("Marcus won’t be asked again, and the ask comes back to you.")).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Withdraw my ask" }));

      await waitFor(() => expect(posts).toContainEqual({ path: API_ROUTES.introTransition, body: { introId: makeIntro().id, action: "withdraw" } }));
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith("?m=withdrawn", { scroll: true }));
    });

    it("never names who said no, under Community's rule", () => {
      renderInApp(createElement(IntroPage, { intro: makeIntro({ state: INTRO_STATES.declined, closedAt: "2026-11-12T10:00:00.000Z" }), community: COMMUNITY, canEmail: true, hasThread: false }));

      expect(screen.getAllByText("They can’t make this one")).toHaveLength(2);
      expect(screen.queryByText(/Marcus can’t/)).toBeNull();
      expect(screen.getByText(/Find another way in:/)).toBeTruthy();
      expect(screen.queryByRole("link", { name: "search" })).toBeNull();
    });

    it("asks if it helped once that's due, and offers the thread", () => {
      const introduced = makeIntro({ state: INTRO_STATES.completed, askedTargetAt: "2026-11-11T11:00:00.000Z", targetAgreedAt: "2026-11-11T12:00:00.000Z", closedAt: "2026-11-11T12:00:00.000Z", isOutcomeDue: true });
      renderInApp(createElement(IntroPage, { intro: introduced, community: COMMUNITY, canEmail: true, hasThread: true }));

      expect(screen.getByText("Marcus said yes and asked Rosa")).toBeTruthy();
      expect(screen.getByText("Rosa said yes")).toBeTruthy();
      expect(screen.getByRole("link", { name: "Open the intro thread" }).getAttribute("href")).toBe(`/intros/${introduced.id}/thread`);
      expect(screen.getByRole("heading", { name: "Was the intro to Rosa helpful?" })).toBeTruthy();
      expect(screen.getByRole("button", { name: "Helpful" })).toBeTruthy();
    });

    it("marks the answer given", () => {
      const answered = makeIntro({ state: INTRO_STATES.completed, closedAt: "2026-11-11T12:00:00.000Z", outcome: INTRO_OUTCOMES.helped });
      renderInApp(createElement(IntroPage, { intro: answered, community: COMMUNITY, canEmail: true, hasThread: false }));

      expect(screen.getByText("You said: helpful")).toBeTruthy();
      expect(screen.getByText("Introduced · helpful")).toBeTruthy();
    });
  });

  describe("the person's page", () => {
    it("says there's nothing to do when the answer was already given in another tab", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ answer: "no_thanks", isRepeat: true }), { headers: { "Content-Type": "application/json" } })));
      const facts = { askerName: "Sam Lee", connectorName: "Marcus Webb", targetName: "Rosa Lindqvist", note: NOTE, joinsByEmail: true, asksForEmail: false, copiesConnector: true };
      render(createElement(TargetLinkQuestion, { token: "t".repeat(43), community: COMMUNITY, facts, initialChoice: "yes", optOutHref: "/intro/optout/x" }));

      fireEvent.click(screen.getByRole("button", { name: "Send my answer" }));

      expect(await screen.findByText("Nothing to do")).toBeTruthy();
      expect(screen.queryByText("You’re introduced")).toBeNull();
    });

    it("says the connector is copied only when replies by email are on", async () => {
      const facts = { askerName: "Sam Lee", connectorName: "Marcus Webb", targetName: "Rosa Lindqvist", note: NOTE, joinsByEmail: true, asksForEmail: false, copiesConnector: true };
      const { unmount } = render(createElement(TargetLinkQuestion, { token: "t".repeat(43), community: COMMUNITY, facts, initialChoice: null, optOutHref: "/intro/optout/x" }));
      expect(screen.getByText("One email to you and Sam, with Marcus copied.")).toBeTruthy();
      unmount();

      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ answer: "yes", isRepeat: false }), { headers: { "Content-Type": "application/json" } })));
      render(createElement(TargetLinkQuestion, { token: "t".repeat(43), community: COMMUNITY, facts: { ...facts, copiesConnector: false }, initialChoice: "yes", optOutHref: "/intro/optout/x" }));
      expect(screen.getByText("We email you and Sam to introduce you.")).toBeTruthy();

      fireEvent.click(screen.getByRole("button", { name: "Send my answer" }));

      expect(await screen.findByText("You’re introduced")).toBeTruthy();
      expect(screen.getByText("Check your email: we’ve introduced you to Sam. Reply to it to write to Sam.")).toBeTruthy();
      expect(screen.queryByText(/copied/)).toBeNull();
    });
  });

  describe("the connector's answer", () => {
    const asked = makeIntro({ viewerRole: INTRO_ROLES.introducer, requester: { ...MARCUS }, introducer: { ...SAM }, target: { name: "Rachel Kim", headline: "CFO at Brightside Clinics", linkedinSlug: null, isNamed: true } });

    it("asks the question first: three choices, the person's email and the note to edit, the consent line once", () => {
      renderInApp(createElement(IntroPage, { intro: asked, community: COMMUNITY, canEmail: true, hasThread: false }));

      expect(screen.getByRole("heading", { level: 1, name: "Introduce Marcus to Rachel?" })).toBeTruthy();
      expect(screen.getByRole("group", { name: "Introduce Marcus to Rachel?" })).toBeTruthy();
      expect(screen.getByText("Marcus is never told why.")).toBeTruthy();
      expect(screen.getByLabelText(/I don’t know them well/)).toBeTruthy();
      expect(screen.getByLabelText("Rachel’s email")).toBeTruthy();
      expect(screen.getByText("Rachel sees Marcus’ address only after saying yes.")).toBeTruthy();
      expect(screen.getByText("Edit the note")).toBeTruthy();
      expect(screen.getByText("Marcus’ note")).toBeTruthy();
      expect(screen.getAllByText("Nobody is introduced without saying yes.")).toHaveLength(1);
      expect(screen.getByRole("button", { name: "Report this note" })).toBeTruthy();
    });

    it("needs no email typed when the asker gave the person's address, and never shows it", async () => {
      const withAddress = { ...asked, suggestedTargetEmail: "rachel@brightside.example" };
      const { container } = renderInApp(createElement(IntroPage, { intro: withAddress, community: COMMUNITY, canEmail: true, hasThread: false }));

      expect(screen.queryByLabelText("Rachel’s email")).toBeNull();
      expect(container.innerHTML).not.toContain("rachel@brightside.example");
      fireEvent.click(screen.getByLabelText(/Yes, introduce them/));
      fireEvent.click(screen.getByRole("button", { name: "Send" }));

      await waitFor(() =>
        expect(posts).toContainEqual({
          path: API_ROUTES.introConnectorAnswer,
          body: { introId: asked.id, choice: "yes", targetEmail: null, note: NOTE, reason: null },
        }),
      );
    });

    it("sends the yes with the address and the edited note in one step", async () => {
      renderInApp(createElement(IntroPage, { intro: asked, community: COMMUNITY, canEmail: true, hasThread: false }));

      fireEvent.click(screen.getByLabelText(/Yes, introduce them/));
      fireEvent.change(screen.getByLabelText("Rachel’s email"), { target: { value: "rachel@brightside.example" } });
      fireEvent.click(screen.getByRole("button", { name: "Send" }));

      await waitFor(() =>
        expect(posts).toContainEqual({
          path: API_ROUTES.introConnectorAnswer,
          body: { introId: asked.id, choice: "yes", targetEmail: "rachel@brightside.example", note: NOTE, reason: null },
        }),
      );
    });

    it("asks for an answer before sending", async () => {
      renderInApp(createElement(IntroPage, { intro: asked, community: COMMUNITY, canEmail: false, hasThread: false }));

      expect(screen.queryByLabelText("Rachel’s email")).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Send" }));

      expect(await screen.findByText("Pick an answer.")).toBeTruthy();
      expect(posts).toEqual([]);
    });
  });

  describe("the connector asking the person", () => {
    const asking = makeIntro({
      state: INTRO_STATES.askingTarget,
      viewerRole: INTRO_ROLES.introducer,
      requester: { ...MARCUS },
      introducer: { ...SAM },
      acceptedAt: "2026-11-11T11:00:00.000Z",
      askedTargetAt: "2026-11-11T11:00:00.000Z",
    });
    const issued = { link: "https://community.example/meet/abc", token: "abc", canEmailTarget: true };

    it("stops saying 'Send Rosa this private link' once the connector had the app email her", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(JSON.stringify({ ok: true, message: "We emailed Rosa." }), { headers: { "Content-Type": "application/json" } })),
      );
      renderInApp(createElement(IntroPage, { intro: asking, community: COMMUNITY, canEmail: true, hasThread: false }), (queryClient) =>
        queryClient.setQueryData(issuedConsentQuery(asking.id).queryKey, issued),
      );
      expect(screen.getByText(/Send Rosa this private link/)).toBeTruthy();

      fireEvent.change(screen.getByLabelText("Rosa's email"), { target: { value: "rosa@halcyon.example" } });
      fireEvent.click(screen.getByRole("button", { name: "Email Rosa" }));

      expect(await screen.findByText(/We emailed Rosa on /)).toBeTruthy();
      expect(screen.queryByText(/Send Rosa this private link/)).toBeNull();
    });

    it("writes dates the app's way: day, then month", () => {
      renderInApp(createElement(IntroPage, { intro: { ...asking, targetEmailedAt: "2026-11-12T09:00:00.000Z" }, community: COMMUNITY, canEmail: true, hasThread: false }));

      expect(screen.getByText(/We emailed Rosa on 12 Nov\./)).toBeTruthy();
      expect(screen.getByText(/this closes on 18 Nov\./)).toBeTruthy();
      expect(screen.queryByText(/Nov 1[28]/)).toBeNull();
    });
  });
});
