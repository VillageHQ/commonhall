import { describe, expect, it } from "vitest";

import { renderSignInLinkEmail } from "./sign-in-link-email";

const LINK = "https://community.example/auth?token=abc";

// Commonhall's email (fh-reference copy/emails/email-signin-link.md), plus the 6-digit code for the phone app.
describe("the sign-in link email", () => {
  const email = renderSignInLinkEmail({ link: LINK, code: "048213", communityName: "Northwind Founders" });

  it("has Commonhall's subject", () => {
    expect(email.subject).toBe("Your sign-in link for Northwind Founders");
  });

  it("has Commonhall's plain-text body", () => {
    expect(email.text).toBe(
      [
        "Hi,",
        "",
        "Open this link to sign in to Northwind Founders:",
        LINK,
        "",
        "Or type this code where you asked for the link: 048213",
        "",
        "They work once, for the next 15 minutes. If you did not ask for them, ignore this email.",
        "",
        "Sent by Northwind Founders via its member portal.",
      ].join("\n"),
    );
  });

  it("sends the same words as HTML, with no button", () => {
    expect(email.html).toContain("Open this link to sign in to Northwind Founders:");
    expect(email.html).toContain(`<a href="${LINK}">${LINK}</a>`);
    expect(email.html).not.toContain("border-radius");
  });

  it("escapes a community name that looks like HTML", () => {
    expect(renderSignInLinkEmail({ link: LINK, code: "048213", communityName: "<b>Fund</b>" }).html).not.toContain("<b>Fund");
  });
});
