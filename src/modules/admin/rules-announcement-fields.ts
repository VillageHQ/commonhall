// The fill-in fields an admin may write in an announcement, and what each becomes for one member. A field with no
// value takes a plain word instead, and an unknown field is dropped: a member never sees a raw "{...}".
export const ANNOUNCEMENT_FIELDS = {
  firstName: "{first name}",
  fullName: "{full name}",
  company: "{company}",
  community: "{community}",
} as const;

// `nameFallback` is the word for a missing name: "there" in a member's email ("Hi there"), "everyone" in the feed.
export type AnnouncementFieldValues = { fullName: string | null; company: string | null; community: string; nameFallback?: string };

// Doubled braces ("{{first name}}") count as one field, so no brace is left behind.
const FIELD_PATTERN = /\{+([^{}\n]*)\}+/g;
const FALLBACKS = { name: "there", company: "your company" } as const;

function readKey(inside: string) {
  return inside.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

function readFirstWord(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}

function readValue(key: string, { fullName, company, community, nameFallback = FALLBACKS.name }: AnnouncementFieldValues): string | null {
  const name = fullName?.trim() || null;
  switch (key) {
    case "first name":
    case "firstname":
      return (name && readFirstWord(name)) || nameFallback;
    case "full name":
    case "fullname":
    case "name":
      return name ?? nameFallback;
    case "company":
      return company?.trim() || FALLBACKS.company;
    case "community":
      return community.trim() || null;
    default:
      return null;
  }
}

export function fillAnnouncementFields(text: string, values: AnnouncementFieldValues) {
  return text.replace(FIELD_PATTERN, (_match, inside: string) => readValue(readKey(inside), values) ?? "");
}

// The fields the preview warns about: written in braces, but not one Commonhall knows.
export function readUnknownFields(text: string) {
  const unknown = new Set<string>();
  for (const [match, inside] of text.matchAll(FIELD_PATTERN)) {
    if (readValue(readKey(inside ?? ""), { fullName: "x", company: "x", community: "x" }) === null) unknown.add(match);
  }
  return [...unknown];
}

// The email one member gets, as plain text: their fields filled in, the stop line (a sent email carries the outbox's
// unsubscribe mark there) and the sign-off every member email ends with (Commonhall's foot()).
export function renderAnnouncementText({ subject, body }: { subject: string; body: string }, values: AnnouncementFieldValues, stopUrl: string) {
  const text = [fillAnnouncementFields(body, values), "", `Stop announcement emails: ${stopUrl}`, "", `Sent by ${values.community} via its member portal.`].join("\n");
  return { subject: fillAnnouncementFields(subject, values).replace(/\s+/g, " ").trim(), text };
}

// The team's feed post is one for everyone, so its name fields read "everyone" ("Hi everyone"), and the subject is its
// heading line.
export function renderAnnouncementPost({ subject, body }: { subject: string; body: string }, community: string) {
  const values = { fullName: null, company: null, community, nameFallback: "everyone" };
  return `${fillAnnouncementFields(subject, values).replace(/\s+/g, " ").trim()}\n${fillAnnouncementFields(body, values)}`;
}
