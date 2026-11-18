import { z } from "zod";

import { removeNullBytes } from "../../platform/text/safe-text.ts";

// A member's place in the community, set by an admin (the "admin" role is separate: it is who runs the console).
// Other parts (announcements) read these values by name: keep them as they are.
export const COMMUNITY_ROLES = {
  founder: "founder",
  mentor: "mentor",
  expert: "expert",
  advisor: "advisor",
  entrepreneurInResidence: "entrepreneur_in_residence",
  fundTeam: "fund_team",
} as const;

export type CommunityRole = (typeof COMMUNITY_ROLES)[keyof typeof COMMUNITY_ROLES];

export const COMMUNITY_ROLE_VALUES = Object.values(COMMUNITY_ROLES) as [CommunityRole, ...CommunityRole[]];

export const COMMUNITY_ROLE_LABELS: Record<CommunityRole, string> = {
  [COMMUNITY_ROLES.founder]: "Founder",
  [COMMUNITY_ROLES.mentor]: "Mentor",
  [COMMUNITY_ROLES.expert]: "Expert",
  [COMMUNITY_ROLES.advisor]: "Advisor",
  [COMMUNITY_ROLES.entrepreneurInResidence]: "Entrepreneur in residence",
  [COMMUNITY_ROLES.fundTeam]: "Fund team",
};

// The roles the directory's "Experts and mentors" view lists: not founders, not the fund's own team.
export const EXPERT_ROLES: readonly CommunityRole[] = [COMMUNITY_ROLES.mentor, COMMUNITY_ROLES.expert, COMMUNITY_ROLES.advisor, COMMUNITY_ROLES.entrepreneurInResidence];

export function isCommunityRole(value: string): value is CommunityRole {
  return (COMMUNITY_ROLE_VALUES as readonly string[]).includes(value);
}

export function isExpertRole(role: string | null | undefined) {
  return Boolean(role && (EXPERT_ROLES as readonly string[]).includes(role));
}

// A CSV cell or a typed word: "Mentor", "mentor", "Entrepreneur in residence", "EIR", "fund_team". -> the role, or null.
export function readCommunityRole(value: string): CommunityRole | null {
  const word = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (!word) return null;
  if (word === "eir") return COMMUNITY_ROLES.entrepreneurInResidence;
  if (word === "team") return COMMUNITY_ROLES.fundTeam;
  return isCommunityRole(word) ? word : null;
}

export const setCommunityRoleBodySchema = z.object({ memberId: z.string().min(1), communityRole: z.enum(COMMUNITY_ROLE_VALUES) });
export type SetCommunityRoleBody = z.infer<typeof setCommunityRoleBodySchema>;

// Who sees a member's booking link: everyone in the community, or only people whose intro they accepted.
export const BOOKING_VISIBILITIES = { community: "community", introduced: "introduced" } as const;
export type BookingVisibility = (typeof BOOKING_VISIBILITIES)[keyof typeof BOOKING_VISIBILITIES];

export const MAXIMUM_BOOKING_URL_LENGTH = 300;
export const BOOKING_URL_ERROR = "Use a full https:// address, like https://cal.com/your-name.";

// Only https links: a booking page opens from a button, so nothing else (http, javascript:, mailto:) is allowed.
export function parseBookingUrl(value: string): string | null {
  const text = value.trim();
  if (!text || text.length > MAXIMUM_BOOKING_URL_LENGTH || /\s/.test(text)) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" || !url.hostname.includes(".") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const bookingBodySchema = z.object({
  bookingUrl: z
    .string()
    .overwrite(removeNullBytes)
    .trim()
    .max(MAXIMUM_BOOKING_URL_LENGTH, `Keep the link under ${MAXIMUM_BOOKING_URL_LENGTH} characters.`)
    .transform((text, context) => {
      if (!text) return null;
      const url = parseBookingUrl(text);
      if (url) return url;
      context.addIssue({ code: "custom", message: BOOKING_URL_ERROR });
      return z.NEVER;
    }),
  bookingVisibility: z.enum(BOOKING_VISIBILITIES).default(BOOKING_VISIBILITIES.community),
});
export type BookingBody = z.infer<typeof bookingBodySchema>;

export const BOOKING_API_ROUTE = "/api/profile/booking";
export const CALL_REQUEST_API_ROUTE = "/api/members/call";

export const callRequestBodySchema = z.object({ memberId: z.string().min(1).max(200) });
