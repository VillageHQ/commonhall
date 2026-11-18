import { describe, expect, it } from "vitest";

import { buildCandidateQuery, draftHiringAsk, mayFindCandidates } from "./rules-candidates";

describe("the search a job turns into", () => {
  it("uses the title and the place", () => {
    expect(buildCandidateQuery({ title: "Senior Product Designer", location: "Berlin, Germany" })).toBe("Senior Product Designer in Berlin, Germany");
  });

  it("uses the title alone with no place, or a place that is no place", () => {
    expect(buildCandidateQuery({ title: "Founding Engineer", location: "" })).toBe("Founding Engineer");
    expect(buildCandidateQuery({ title: "Founding Engineer", location: "Remote" })).toBe("Founding Engineer");
    expect(buildCandidateQuery({ title: "Clinical product lead", location: "Remote (US)" })).toBe("Clinical product lead");
    expect(buildCandidateQuery({ title: "Founding Engineer", location: " — " })).toBe("Founding Engineer");
  });

  it("drops the hiring tools' gender tags and stray symbols", () => {
    expect(buildCandidateQuery({ title: "  Backend Engineer (m/w/d) ★ ", location: "" })).toBe("Backend Engineer");
    expect(buildCandidateQuery({ title: "*** Head of Sales ***", location: "" })).toBe("Head of Sales");
  });

  it("never sends an empty or symbols-only search", () => {
    for (const title of ["", "   ", "???", "—", "(m/f/d)", "#1"]) expect(buildCandidateQuery({ title, location: "Berlin" })).toBeNull();
  });

  it("keeps titles in other scripts and cuts long ones", () => {
    expect(buildCandidateQuery({ title: "Ingénieur·e données", location: "" })).toBe("Ingénieur·e données");
    expect(buildCandidateQuery({ title: "Engineer ".repeat(60), location: "" })?.length).toBeLessThanOrEqual(200);
  });

  it("drafts the hiring request from the title and company", () => {
    expect(draftHiringAsk({ title: "Product Designer", company: "Kilnworks" })).toBe("We're hiring a Product Designer at Kilnworks. Who do you know?");
    expect(draftHiringAsk({ title: "???", company: "Kilnworks" })).toBe("We're hiring at Kilnworks. Who do you know?");
  });
});

describe("who may find candidates for a job", () => {
  const job = { companySlug: "kilnworks", memberId: "founder-1" };

  it("lets the company's members, the member who linked it and admins in", () => {
    expect(mayFindCandidates({ id: "teammate", isAdmin: false, companySlug: "kilnworks" }, job)).toBe(true);
    expect(mayFindCandidates({ id: "founder-1", isAdmin: false, companySlug: null }, job)).toBe(true);
    expect(mayFindCandidates({ id: "admin", isAdmin: true, companySlug: "other-co" }, job)).toBe(true);
  });

  it("keeps everyone else out, a member with no company too", () => {
    expect(mayFindCandidates({ id: "someone", isAdmin: false, companySlug: "other-co" }, job)).toBe(false);
    expect(mayFindCandidates({ id: "someone", isAdmin: false, companySlug: null }, job)).toBe(false);
  });
});
