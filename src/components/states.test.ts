import { Inbox } from "lucide-react";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { EmptyState } from "./empty-state";
import { ErrorState, RetryButton } from "./error-state";
import { LoadingState } from "./loading-state";

describe("the empty state", () => {
  it("shows its title and description", () => {
    const markup = renderToStaticMarkup(createElement(EmptyState, { title: "Nothing yet", description: "Check back." }));

    expect(markup).toContain("Nothing yet");
    expect(markup).toContain("Check back.");
  });

  it("draws no picture unless it is given an icon", () => {
    const markup = renderToStaticMarkup(createElement(EmptyState, { title: "Nothing yet", description: "Check back." }));

    expect(markup).not.toContain("<svg");
  });

  it("draws its icon over the headline, hidden from screen readers", () => {
    const markup = renderToStaticMarkup(createElement(EmptyState, { icon: Inbox, title: "No messages yet", description: "Check back." }));

    expect(markup).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(markup.indexOf("<svg")).toBeLessThan(markup.indexOf("No messages yet"));
  });
});

describe("the loading state", () => {
  it("announces itself as a status", () => {
    const markup = renderToStaticMarkup(createElement(LoadingState, { title: "Searching" }));

    expect(markup).toContain('role="status"');
    expect(markup).toContain("Searching");
  });
});

describe("the error state", () => {
  it("announces itself as an alert", () => {
    const markup = renderToStaticMarkup(
      createElement(ErrorState, { title: "Broken", description: "It failed." }, createElement(RetryButton)),
    );

    expect(markup).toContain('role="alert"');
    expect(markup).toContain("Try again");
  });
});
