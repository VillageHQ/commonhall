import "server-only";

import { and, asc, desc, eq, notLike, sql } from "drizzle-orm";

import { memberProfile } from "../members/schema.ts";
import { isActiveMember } from "../../platform/auth/member-status.ts";
import { RECLAIMED_EMAIL_DOMAIN } from "../../platform/auth/reclaimed-email.ts";
import { user } from "../../platform/database/auth-schema.ts";
import type { DatabaseOrTransaction } from "../../platform/database/client.ts";
import { EMAIL_TOPICS } from "../../platform/email/kinds.ts";
import { emailOptOut, emailSuppression } from "../../platform/email/schema.ts";
import { ANNOUNCEMENT_AUDIENCES, type AnnouncementAudience } from "./contract-announcements.ts";
import { announcement } from "./schema.ts";

export type AnnouncementRecipient = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  cohort: string | null;
  // False when the member turned announcements off, or their address bounced or complained before.
  isWanted: boolean;
};

function readCohortKey(cohort: string | null) {
  return cohort?.trim().toLowerCase() ?? "";
}

// Every member who can hear from the team: not removed, not banned, not a deleted account.
export async function readAnnouncementMembers(connection: DatabaseOrTransaction): Promise<AnnouncementRecipient[]> {
  const rows = await connection
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      company: memberProfile.company,
      cohort: memberProfile.cohort,
      optedOut: sql<boolean>`exists (select 1 from ${emailOptOut} where ${emailOptOut.memberId} = ${user.id} and ${emailOptOut.topic} = ${EMAIL_TOPICS.announcements})`,
      suppressed: sql<boolean>`exists (select 1 from ${emailSuppression} where ${emailSuppression.email} = lower(${user.email}))`,
    })
    .from(user)
    .leftJoin(memberProfile, eq(memberProfile.userId, user.id))
    .where(and(isActiveMember(), notLike(user.email, `%@${RECLAIMED_EMAIL_DOMAIN}`)))
    .orderBy(asc(user.name), asc(user.id));
  return rows.map(({ optedOut, suppressed, ...row }) => ({ ...row, isWanted: !optedOut && !suppressed }));
}

// A cohort matches as a whole value, ignoring case and spaces at the ends, like the directory's filter.
export function isInAudience(recipient: Pick<AnnouncementRecipient, "cohort">, audience: AnnouncementAudience) {
  if (audience.audience === ANNOUNCEMENT_AUDIENCES.everyone) return true;
  return readCohortKey(recipient.cohort) === readCohortKey(audience.cohort);
}

export type CohortChoice = { name: string; memberCount: number; wantedCount: number };

// The cohorts members are in, spelled as most of them spell it, with how many would get an email.
export function readCohortChoices(members: readonly AnnouncementRecipient[]): CohortChoice[] {
  const groups = new Map<string, { spellings: Map<string, number>; memberCount: number; wantedCount: number }>();
  for (const member of members) {
    const key = readCohortKey(member.cohort);
    if (!key) continue;
    const group = groups.get(key) ?? { spellings: new Map(), memberCount: 0, wantedCount: 0 };
    const spelling = member.cohort?.trim() ?? key;
    group.spellings.set(spelling, (group.spellings.get(spelling) ?? 0) + 1);
    group.memberCount += 1;
    if (member.isWanted) group.wantedCount += 1;
    groups.set(key, group);
  }
  return [...groups.values()]
    .map(({ spellings, memberCount, wantedCount }) => ({
      name: [...spellings.entries()].sort((first, second) => second[1] - first[1])[0]?.[0] ?? "",
      memberCount,
      wantedCount,
    }))
    .sort((first, second) => first.name.localeCompare(second.name));
}

export async function readSentAnnouncements(connection: DatabaseOrTransaction) {
  return connection
    .select({
      id: announcement.id,
      subject: announcement.subject,
      audience: announcement.audience,
      cohort: announcement.cohort,
      queuedCount: announcement.queuedCount,
      isPosted: sql<boolean>`${announcement.postId} is not null`,
      sentByName: announcement.sentByName,
      sentAt: announcement.sentAt,
    })
    .from(announcement)
    .orderBy(desc(announcement.sentAt))
    .limit(100);
}

export type SentAnnouncement = Awaited<ReturnType<typeof readSentAnnouncements>>[number];
