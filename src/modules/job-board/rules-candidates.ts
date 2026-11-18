// "Find candidates" on a job: who may use it, and the network search a job turns into. Pure.

const QUERY_MAX_LENGTH = 200;
const MIN_WORD_CHARACTERS = 2;
const WORD_CHARACTER = /[\p{L}\p{N}]/gu;
// Hiring tools add these to titles; they are no help to a people search.
const TITLE_NOISE = /\((?:[mwfdx]\s*\/\s*)+[mwfdx]\)|\b[mwfd]\/[mwfd](?:\/[mwfdx])?\b/giu;
const NO_PLACE = /^(?:remote\b.*|anywhere|worldwide|global|n\/?a|tbd|-+)$/iu;

function tidy(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function countWordCharacters(text: string) {
  return text.match(WORD_CHARACTER)?.length ?? 0;
}

// The role in a job's title, or null when the title has fewer than two letters or digits.
export function readRole(title: string): string | null {
  const role = tidy(title.replace(TITLE_NOISE, " ")).replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, "");
  return countWordCharacters(role) < MIN_WORD_CHARACTERS ? null : role;
}

// "Senior Product Designer (m/f/d)" in "Berlin" → "Senior Product Designer in Berlin". A title with fewer than two
// letters or digits (empty, "???", "—") gives null: the founder types the role instead of an empty search.
export function buildCandidateQuery({ title, location }: { title: string; location: string }): string | null {
  const role = readRole(title);
  if (!role) return null;
  const place = tidy(location);
  const hasPlace = countWordCharacters(place) >= MIN_WORD_CHARACTERS && !NO_PLACE.test(place);
  return (hasPlace ? `${role} in ${place}` : role).slice(0, QUERY_MAX_LENGTH).trim();
}

export type CandidateViewer = { id: string; isAdmin: boolean; companySlug: string | null };

// Only the job's own company (a member whose card names it, or who linked its hiring tool) and admins.
export function mayFindCandidates(viewer: CandidateViewer, job: { companySlug: string; memberId: string }) {
  if (viewer.isAdmin) return true;
  if (viewer.id === job.memberId) return true;
  return viewer.companySlug !== null && viewer.companySlug === job.companySlug;
}

// The hiring request's one line, cut to the ask's title length by the asks page.
export function draftHiringAsk({ title, company }: { title: string; company: string }) {
  const role = readRole(title);
  return role ? `We're hiring a ${role} at ${tidy(company)}. Who do you know?` : `We're hiring at ${tidy(company)}. Who do you know?`;
}
