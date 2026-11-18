import { COMMUNITY_ROLE_LABELS, setCommunityRoleBodySchema } from "@/modules/members/contract-community-roles";
import { setCommunityRole } from "@/modules/members/service-community-role";
import { logAdminAction } from "@/platform/observability/route-logging";
import { adminRoutes } from "@/modules/admin/routes";

export const POST = adminRoutes.member(
  "admin-member-community-role",
  setCommunityRoleBodySchema,
  async (context, body) => {
    const name = await setCommunityRole(context, body);
    logAdminAction("member_community_role", context.member.id, body.memberId);
    return Response.json({ message: `${name} is now listed as ${COMMUNITY_ROLE_LABELS[body.communityRole]}.` });
  },
  { adminOnly: true },
);
