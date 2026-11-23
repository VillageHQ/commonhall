// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { VillageConnect } from "./village-connect";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

function answer(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function paste(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function sentBody(fetchSpy: ReturnType<typeof vi.fn>, call: number) {
  const init = fetchSpy.mock.calls[call]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body)) as Record<string, string>;
}

async function waitForCheck() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
}

describe("Connect Village", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    fetchSpy = vi.fn(async () => answer(200, { message: "Village keys saved.", appName: "Northwind Founders", notice: null }));
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    refresh.mockClear();
  });

  it("links the three Village pages in order, on the Village VILLAGE_APP_URL names", () => {
    render(createElement(VillageConnect, { appUrl: "https://village.example/", connectedAppName: null }));

    const links = screen.getAllByRole("link").map((link) => [link.textContent?.replace(" (opens in a new tab)", ""), link.getAttribute("href"), link.getAttribute("target")]);
    expect(links).toEqual([
      ["Create a developer account", "https://village.example/platform", "_blank"],
      ["Finish Village's short checklist", "https://village.example/platform/onboarding", "_blank"],
      ["Open your keys page", "https://village.example/platform/settings/api-keys", "_blank"],
    ]);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("checks and saves as soon as both keys are pasted, then says what it connected to", async () => {
    const onConnected = vi.fn();
    render(createElement(VillageConnect, { appUrl: "https://village.ai", connectedAppName: null, onConnected }));

    paste("Paste the secret key", "sk_example");
    await waitForCheck();
    expect(fetchSpy).not.toHaveBeenCalled();

    paste("Paste the public key", "pk_example");
    await waitForCheck();

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(sentBody(fetchSpy, 0)).toEqual({ secretKey: "sk_example", publicKey: "pk_example" });
    expect(screen.getByRole("status").textContent).toBe("Connected to Northwind Founders");
    expect(screen.getByRole("button", { name: "Replace the keys" })).toBeTruthy();
    expect(onConnected).toHaveBeenCalledWith("Northwind Founders");
  });

  it("shows the reason a key failed, and checks again when a box changes", async () => {
    fetchSpy.mockResolvedValueOnce(answer(422, { message: "Village rejected this secret key.", code: "keys_rejected" }));
    render(createElement(VillageConnect, { appUrl: "https://village.ai", connectedAppName: null }));

    paste("Paste the secret key", "sk_wrong");
    paste("Paste the public key", "pk_example");
    await waitForCheck();

    expect(screen.getByRole("alert").textContent).toContain("Village rejected this secret key.");

    paste("Paste the secret key", "sk_right");
    await waitForCheck();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("status").textContent).toBe("Connected to Northwind Founders");
  });

  it("keeps one check in flight and runs the latest pair after it", async () => {
    let finishFirst: (response: Response) => void = () => undefined;
    fetchSpy.mockImplementationOnce(() => new Promise<Response>((resolve) => (finishFirst = resolve)));
    render(createElement(VillageConnect, { appUrl: "https://village.ai", connectedAppName: null }));

    paste("Paste the secret key", "sk_first");
    paste("Paste the public key", "pk_example");
    await waitForCheck();
    paste("Paste the secret key", "sk_second");
    await waitForCheck();
    expect(fetchSpy).toHaveBeenCalledTimes(1);

    await act(async () => finishFirst(answer(422, { message: "Village rejected this secret key." })));
    await waitForCheck();

    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(sentBody(fetchSpy, 1).secretKey).toBe("sk_second");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("says the keys are saved when a box changed during a check that saved them", async () => {
    let finishFirst: (response: Response) => void = () => undefined;
    fetchSpy.mockImplementationOnce(() => new Promise<Response>((resolve) => (finishFirst = resolve)));
    fetchSpy.mockResolvedValueOnce(answer(422, { message: "This public key doesn't belong to the same Village app as the secret key." }));
    const onConnected = vi.fn();
    render(createElement(VillageConnect, { appUrl: "https://village.ai", connectedAppName: null, onConnected }));

    paste("Paste the secret key", "sk_right");
    paste("Paste the public key", "pk_right");
    await waitForCheck();
    paste("Paste the public key", "pk_other");
    await waitForCheck();
    await act(async () => finishFirst(answer(200, { message: "Village keys saved.", appName: "Northwind Founders", notice: null })));
    await waitForCheck();

    expect(onConnected).toHaveBeenCalledWith("Northwind Founders");
    expect(screen.getByRole("alert").textContent).toContain("doesn't belong");
    expect(screen.getByRole("button", { name: "Keep the saved keys" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep the saved keys" }));
    expect(screen.getByRole("status").textContent).toBe("Connected to Northwind Founders");
  });

  it("shows what Village said about keys it accepted", async () => {
    const notice = "These are test keys: members see a made-up network and nothing is charged.";
    fetchSpy.mockResolvedValueOnce(answer(200, { message: "Village keys saved.", appName: "Northwind Founders", notice }));
    render(createElement(VillageConnect, { appUrl: "https://village.ai", connectedAppName: null }));

    paste("Paste the secret key", "sk_test_example");
    paste("Paste the public key", "pk_test_example");
    await waitForCheck();

    expect(screen.getByRole("status").textContent).toBe("Connected to Northwind Founders");
    expect(screen.getByText(notice)).toBeTruthy();
  });

  it("starts folded when keys are saved, and unfolds to replace them", () => {
    render(createElement(VillageConnect, { appUrl: "https://village.ai", connectedAppName: "" }));

    expect(screen.getByRole("status").textContent).toBe("Connected to your Village app");
    fireEvent.click(screen.getByRole("button", { name: "Replace the keys" }));

    expect(document.activeElement).toBe(screen.getByLabelText("Paste the secret key"));
    expect(screen.getByRole("button", { name: "Keep the saved keys" })).toBeTruthy();
  });
});
