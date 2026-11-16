import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { prerender } from "react-dom/static";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MyNetworkScreen, type MyNetworkScreenProps } from "./my-network-screen";

vi.mock("@villagehq/sdk", () => ({ openSyncModal: vi.fn() }));

const PROPS: MyNetworkScreenProps = {
  communityName: "Northwind Founders",
  processedLine: "In EU, Frankfurt.",
  connectedAtLabel: null,
  myProfileHref: "/me/card#network",
  emailConfirmation: null,
  villageLine: null,
  needsFullName: false,
};

async function readStream(stream: ReadableStream<Uint8Array>) {
  return new Response(stream).text();
}

describe("My network while the server renders the page", () => {
  afterEach(() => vi.unstubAllGlobals());

  // The status request is a browser fetch to this site's own API: on the server it can't reach it, so the page logged
  // "We couldn't reach the server" and the browser reported React error #419 on every load.
  it("sends the loading state and never asks the API from the server", async () => {
    const fetchSpy = vi.fn(() => Promise.reject(new TypeError("Failed to parse URL")));
    vi.stubGlobal("fetch", fetchSpy);
    const renderErrors: unknown[] = [];

    const { prelude } = await prerender(
      createElement(QueryClientProvider, { client: new QueryClient() }, createElement(MyNetworkScreen, PROPS)),
      { onError: (error) => void renderErrors.push(error) },
    );
    const html = await readStream(prelude);

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(renderErrors).toEqual([]);
    expect(html).toContain("Checking your network…");
  });
});
