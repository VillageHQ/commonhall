import "server-only";

import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { user } from "../../platform/database/auth-schema.ts";
import type { Database } from "../../platform/database/client.ts";
import { callRequest, memberProfile } from "../members/schema.ts";
import { COMMUNITY_ROLES, isCommunityRole, type CommunityRole } from "../members/contract-community-roles.ts";
import { DELETED_MEMBER_NAME } from "../members/contract-privacy.ts";
import { countCalls, type CallRow } from "./calls.ts";

const requester = alias(user, "call_requester");
const booked = alias(user, "call_member");

// Every "Book a call" click, newest first: who asked whom, and when. Admins see names (the owner's rule: admins see
// who asked whom). A deleted member stays counted as "Deleted member".
export async function readCallRows(database: Database): Promise<CallRow[]> {
  const rows = await database
    .select({
      id: callRequest.id,
      createdAt: callRequest.createdAt,
      requesterName: requester.name,
      memberId: callRequest.memberId,
      memberName: booked.name,
      memberRole: memberProfile.communityRole,
    })
    .from(callRequest)
    .leftJoin(requester, eq(requester.id, callRequest.requesterId))
    .leftJoin(booked, eq(booked.id, callRequest.memberId))
    .leftJoin(memberProfile, eq(memberProfile.userId, callRequest.memberId))
    .orderBy(desc(callRequest.createdAt), desc(callRequest.id));
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    requesterName: row.requesterName ?? DELETED_MEMBER_NAME,
    memberId: row.memberId,
    memberName: row.memberName ?? DELETED_MEMBER_NAME,
    memberRole: readRole(row.memberRole),
  }));
}

function readRole(role: string | null): CommunityRole {
  return role && isCommunityRole(role) ? role : COMMUNITY_ROLES.founder;
}

// The page, the CSV and console Home read the same rows, so their numbers agree.
export async function readCalls(database: Database, now = new Date()) {
  const rows = await readCallRows(database);
  return { rows, ...countCalls(rows, now) };
}
