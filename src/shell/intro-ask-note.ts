// The forwardable note, drafted from the asker's own profile (Commonhall's intros/flow.mjs draftNote and shortNote).
// The asker changes anything before it goes.

export type AskerProfile = { name: string; title: string | null; company: string | null; bio: string | null };

export const NOTE_MAXIMUM = 700;

function readFirst(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}

function readFirstSentence(text: string | null) {
  return (text ?? "").trim().split(/(?<=[.!?])\s/)[0]?.replace(/[.!]$/, "") ?? "";
}

function readRoleAt({ title, company }: Pick<AskerProfile, "title" | "company">) {
  return [title, company].filter(Boolean).join(" at ");
}

// One paragraph, built only from the asker's own card and the person asked for (round 7: never from an earlier need
// on the profile, which may be about someone else). "I’m Sam, Co-founder & CEO at Tallyhealth: prior-authorisation
// automation for outpatient clinics. Could you introduce me to Rosa Lindqvist (VP Procurement, Halcyon Health)?"
export type IntroTarget = { name: string; about: string | null };

export function draftIntroNote(asker: AskerProfile, { name, about }: IntroTarget) {
  const targetName = name.trim();
  const ask = `Could you introduce me to ${targetName || "them"}${about?.trim() ? ` (${about.trim()})` : ""}?`;
  const roleAt = readRoleAt(asker);
  const work = readFirstSentence(asker.bio);
  const what = !work ? "" : /^(a|an|the)\s/i.test(work) ? `: ${work.charAt(0).toLowerCase()}${work.slice(1)}` : `. ${work}`;
  return [`I’m ${readFirst(asker.name)}${roleAt ? `, ${roleAt}` : ""}${what}.`, ask].join(" ").slice(0, NOTE_MAXIMUM);
}

// "VP Procurement at Halcyon Health" from the two boxes of the ask form.
export function describeTargetAbout(role: string, company: string) {
  return [role.trim(), company.trim()].filter(Boolean).join(" at ") || null;
}

export type NoteParts = { who: string; why: string; proof: string };

export function joinNoteParts({ who, why, proof }: NoteParts) {
  return [who, why, proof].map((part) => part.trim()).filter(Boolean).join("\n\n");
}
