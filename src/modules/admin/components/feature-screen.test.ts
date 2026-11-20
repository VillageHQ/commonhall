// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FeatureScreen, type Feature } from "./feature-screen";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const NETWORK: Feature = {
  id: "network",
  label: "Network",
  description: "Search each other's networks.",
  note: null,
  icon: null,
  needsVillage: true,
  turnOffNote: "Members stay in the Village group.",
  isOn: true,
  missingRequirement: null,
  dependentLabels: ["Intros"],
};

const INTROS: Feature = { ...NETWORK, id: "intros", label: "Intros", turnOffNote: null, dependentLabels: [] };

function renderScreen(features: Feature[]) {
  const element = createElement(FeatureScreen, { features });
  render(createElement(QueryClientProvider, { client: new QueryClient() }, element));
}

describe("the features screen", () => {
  afterEach(cleanup);

  it("warns what turning off a requirement also does", () => {
    renderScreen([NETWORK, INTROS]);

    fireEvent.click(screen.getByRole("switch", { name: "Network" }));

    expect(screen.getByText("This also pauses Intros, which needs Network.")).toBeTruthy();
    expect(screen.getByText("Members stay in the Village group.")).toBeTruthy();
  });

  it("offers to turn on what a paused feature needs", () => {
    renderScreen([{ ...INTROS, missingRequirement: { id: "network", label: "Network" } }]);

    expect(screen.getByText("Paused: needs Network")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Turn on Network" })).toBeTruthy();
    expect(screen.queryByRole("switch", { name: "Intros" })).toBeNull();
  });

  it("exposes each feature's state as a switch", () => {
    renderScreen([NETWORK, { ...INTROS, isOn: false }]);

    expect(screen.getByRole("switch", { name: "Network" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("switch", { name: "Intros" }).getAttribute("aria-checked")).toBe("false");
  });

  describe("after turning a feature on", () => {
    beforeEach(async () => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "Intros is on." }), { headers: { "Content-Type": "application/json" } })));
      renderScreen([{ ...INTROS, isOn: false }]);
      fireEvent.click(screen.getByRole("switch", { name: "Intros" }));
      await waitFor(() => expect(screen.getByRole("status").textContent).toBe("Intros is on."));
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("keeps focus on the feature's card", () => {
      expect(document.activeElement?.id).toBe("feature-card-intros");
    });
  });

  describe("after turning a feature off", () => {
    beforeEach(async () => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "Network is off." }), { headers: { "Content-Type": "application/json" } })));
      renderScreen([NETWORK, INTROS]);
      fireEvent.click(screen.getByRole("switch", { name: "Network" }));
      fireEvent.click(screen.getByRole("button", { name: "Turn off Network" }));
      await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("announces the change", () => {
      expect(screen.getByRole("status").textContent).toBe("Network is off.");
    });

    it("keeps focus on the feature's card", async () => {
      await waitFor(() => expect(document.activeElement?.id).toBe("feature-card-network"));
    });
  });

  it("shows a feature's name and note, and its one line only on hover or tap", () => {
    renderScreen([{ ...NETWORK, note: "Needs a voice server" }]);
    const about = screen.getByRole("button", { name: "About Network" });

    expect(screen.getByText("Needs a voice server")).toBeTruthy();
    expect(screen.queryByText(/Search each other's networks/)).toBeNull();
    expect(about.getAttribute("title")).toBe("Search each other's networks. Needs a Village account.");
    fireEvent.click(about);
    expect(screen.getByText("Search each other's networks. Needs a Village account.")).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Network" }).getAttribute("aria-checked")).toBe("true");
  });
});
