import { z } from "zod";

import { feedTextSchema } from "../../platform/text/text-schema.ts";

// Admin › Announcements: one email per member through the outbox, and the team's pinned post in the feed.
export const ANNOUNCEMENT_PAGE = "/admin/announcements";
export const ANNOUNCEMENT_API = {
  base: "/api/admin/announcements",
  send: "/api/admin/announcements/send",
  test: "/api/admin/announcements/test",
} as const;

// The subject is the feed post's heading line, so it stays under the feed's heading length; subject + line break +
// message fit one feed post.
export const ANNOUNCEMENT_LIMITS = { subjectLength: 100, bodyLength: 2800, cohortLength: 200 } as const;

// "founders" and "mentors and experts" wait on the community role (mentors-calls).
export const ANNOUNCEMENT_AUDIENCES = { everyone: "everyone", cohort: "cohort" } as const;

export type AnnouncementAudienceKind = (typeof ANNOUNCEMENT_AUDIENCES)[keyof typeof ANNOUNCEMENT_AUDIENCES];

export const ANNOUNCEMENT_ERROR_CODES = {
  emailOff: "announcement_email_off",
  emptyAudience: "announcement_empty_audience",
  tooFast: "announcement_too_fast",
  memberGone: "announcement_member_gone",
} as const;

const audienceSchema = z.discriminatedUnion("audience", [
  z.object({ audience: z.literal(ANNOUNCEMENT_AUDIENCES.everyone) }),
  z.object({ audience: z.literal(ANNOUNCEMENT_AUDIENCES.cohort), cohort: z.string().trim().min(1, "Pick a cohort.").max(ANNOUNCEMENT_LIMITS.cohortLength) }),
]);

const messageSchema = z.object({
  subject: feedTextSchema("a subject", ANNOUNCEMENT_LIMITS.subjectLength).refine((text) => !text.includes("\n"), "Keep the subject on one line."),
  body: feedTextSchema("the message", ANNOUNCEMENT_LIMITS.bodyLength),
});

// The send key is made when the form opens: a second click, or a retry after a lost answer, finds the first send.
export const announcementSendBodySchema = z.intersection(messageSchema.extend({ sendKey: z.uuid() }), audienceSchema);

export const announcementTestBodySchema = messageSchema.extend({ memberId: z.string().min(1).max(200) });

export const announcementSentSchema = z.object({ id: z.uuid(), queued: z.number().int(), isPosted: z.boolean(), isRepeat: z.boolean() });
export const announcementTestSentSchema = z.object({ to: z.string() });

export type AnnouncementSendBody = z.infer<typeof announcementSendBodySchema>;
export type AnnouncementTestBody = z.infer<typeof announcementTestBodySchema>;
export type AnnouncementAudience = z.infer<typeof audienceSchema>;
export type AnnouncementSent = z.infer<typeof announcementSentSchema>;
