import "server-only";

import { eq, isNotNull, sql } from "drizzle-orm";

import { user } from "../../platform/database/auth-schema.ts";
import type { Database } from "../../platform/database/client.ts";
import { isActiveMember } from "../../platform/auth/member-status.ts";
import type { VillagePaths } from "../../platform/village/client.ts";
import { readLinkedinSlug } from "../members/contract-linkedin.ts";
import { memberNetwork } from "../members/schema.ts";

// A member who hasn't agreed to share is never named on a path, not even as the outside contact a sharing member goes
// through. Any path naming one is dropped, for every searcher. The person being reached is not a step on the path.
export function dropNonSharingMembers(villagePaths: VillagePaths | null, nonSharingSlugs: ReadonlySet<string>): VillagePaths | null {
  if (!villagePaths || nonSharingSlugs.size === 0) return villagePaths;
  const isNonSharing = (linkedinUrl: string | null | undefined) => nonSharingSlugs.has(readLinkedinSlug(linkedinUrl) ?? "");
  const paths = villagePaths.paths.filter(
    ({ introducer, starters }) =>
      !isNonSharing(introducer?.profile.linkedin_url) &&
      !starters.some(({ is_current_user, profile }) => !is_current_user && isNonSharing(profile.linkedin_url)),
  );
  return { ...villagePaths, paths };
}

// Members with a LinkedIn link who aren't sharing now: never joined, left, or no longer active.
export async function readNonSharingSlugs(database: Database, exceptSlugs: ReadonlyArray<string | null>) {
  const members = await database
    .select({ linkedinSlug: memberNetwork.linkedinSlug, groupJoinedAt: memberNetwork.groupJoinedAt, isActive: sql<boolean>`${isActiveMember()}` })
    .from(memberNetwork)
    .innerJoin(user, eq(user.id, memberNetwork.userId))
    .where(isNotNull(memberNetwork.linkedinSlug));
  const kept = new Set(exceptSlugs);
  return new Set(
    members.flatMap(({ linkedinSlug, groupJoinedAt, isActive }) =>
      linkedinSlug && !kept.has(linkedinSlug) && (!groupJoinedAt || !isActive) ? [linkedinSlug] : [],
    ),
  );
}
