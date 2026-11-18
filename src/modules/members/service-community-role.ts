import "server-only";

import { and, eq } from "drizzle-orm";

import { AUDIT_ACTIONS } from "../../platform/audit/actions.ts";
import { withAdminTransaction } from "../../platform/audit/admin-transaction.ts";
import { recordAdminAction } from "../../platform/audit/record.ts";
import { isActiveMember } from "../../platform/auth/member-status.ts";
import { user } from "../../platform/database/auth-schema.ts";
import { REQUEST_ERROR_CODES } from "../../platform/http/error-codes.ts";
import type { RequestContext } from "../../platform/http/request-context.ts";
import { RequestError } from "../../platform/http/request-error.ts";
import { COMMUNITY_ROLE_LABELS, type SetCommunityRoleBody } from "./contract-community-roles.ts";
import { memberProfile } from "./schema.ts";

const NOT_FOUND_STATUS = 404;

// Only an admin sets a member's community role, in the audited transaction. -> the member's name.
export async function setCommunityRole({ database, member }: RequestContext, { memberId, communityRole }: SetCommunityRoleBody) {
  return withAdminTransaction(database, member.id, async (transaction) => {
    const [target] = await transaction.select({ name: user.name }).from(user).where(and(eq(user.id, memberId), isActiveMember()));
    if (!target) throw new RequestError(NOT_FOUND_STATUS, REQUEST_ERROR_CODES.memberNotFound, "This member isn't here anymore. Reload the page.");
    await transaction
      .insert(memberProfile)
      .values({ userId: memberId, communityRole })
      .onConflictDoUpdate({ target: memberProfile.userId, set: { communityRole } });
    await recordAdminAction(transaction, member.id, {
      action: AUDIT_ACTIONS.communityRoleChanged,
      targetMemberId: memberId,
      targetName: target.name,
      detail: COMMUNITY_ROLE_LABELS[communityRole],
    });
    return target.name;
  });
}
