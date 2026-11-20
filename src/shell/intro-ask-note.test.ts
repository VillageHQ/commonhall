import { describe, expect, it } from "vitest";

import { describeTargetAbout, draftIntroNote } from "./intro-ask-note";

const SAM = { name: "Sam Lee", title: "Co-founder & CEO", company: "Tallyhealth", bio: "Prior-authorisation automation for outpatient clinics. We raised a seed." };

describe("the drafted intro note", () => {
  it("names the person asked for, with their role and company, and the asker from their own card", () => {
    expect(draftIntroNote(SAM, { name: "Rosa Lindqvist", about: describeTargetAbout("VP Procurement", "Halcyon Health") })).toBe(
      "I’m Sam, Co-founder & CEO at Tallyhealth. Prior-authorisation automation for outpatient clinics. Could you introduce me to Rosa Lindqvist (VP Procurement at Halcyon Health)?",
    );
  });

  it("carries nothing but the asker and the person: a profile's earlier need never comes along", () => {
    const withNeeds = { ...SAM, needs: "An intro to procurement at a US hospital group" } as typeof SAM;
    const note = draftIntroNote(withNeeds, { name: "Tom Okafor", about: null });

    expect(note).toBe("I’m Sam, Co-founder & CEO at Tallyhealth. Prior-authorisation automation for outpatient clinics. Could you introduce me to Tom Okafor?");
    expect(note).not.toContain("hospital");
  });
});
