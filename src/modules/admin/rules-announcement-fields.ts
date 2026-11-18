// The fill-in fields an admin may write in an announcement, and what each becomes for one member. A field with no
// value takes a plain word instead, and an unknown field is dropped: a member never sees a raw "{...}".
export const ANNOUNCEMENT_FIELDS = {
  firstName: "{first name}",
  fullName: "{full name}",
  company: "{company}",
  community: "{community}",
} as const;

export type AnnouncementFieldValues = { fullName: string | null; company: string | null; community: string };

const FIELD_PATTERN = /\{([^{}\n]{0,40})\}/g;
const FALLBACKS = { name: "there", company: "your company" } as const;

function readKey(inside: string) {
  return inside.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

function readFirstWord(name: string) {
  return name.trim().split(/\s+/)[0] ?? "";
}

function readValue(key: string, { fullName, company, community }: AnnouncementFieldValues): string | null {
  const name = fullName?.trim() || null;
  switch (key) {
    case "first name":
    case "firstname":
      return (name && readFirstWord(name)) || FALLBACKS.name;
    case "full name":
    case "fullname":
    case "name":
      return name ?? FALLBACKS.name;
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
