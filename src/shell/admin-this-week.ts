import "server-only";

import { and, countDistinct, eq, gte, inArray, lt, or, sql } from "drizzle-orm";
import { unionAll } from "drizzle-orm/pg-core";

import { isActiveMember } from "../platform/auth/member-status.ts";
import { session, user } from "../platform/database/auth-schema.ts";
import type { Database } from "../platform/database/client.ts";
import { ASK_KINDS, ASK_STATES } from "../modules/asks/contract.ts";
import { asksManifest } from "../modules/asks/manifest.ts";
import { readAskState } from "../modules/asks/rules-state.ts";
import { ask, askAnswer, askOffer } from "../modules/asks/schema.ts";
import { comment, post, reaction } from "../modules/feed/schema.ts";
import { INTRO_STATES } from "../modules/intros/contract.ts";
import { introsManifest } from "../modules/intros/manifest.ts";
import { introRequest } from "../modules/intros/schema.ts";
import { COMMUNITY_ROLES } from "../modules/members/contract-community-roles.ts";
import { memberProfile } from "../modules/members/schema.ts";
import { directMessage } from "../modules/messages/schema.ts";
import { countRoomJoins } from "../modules/voice/reads-live.ts";
import { voiceManifest } from "../modules/voice/manifest.ts";
import { INTRO_WAIT_DAYS, THIS_WEEK_DAYS } from "./admin-this-week-rules.ts";
import { readEnabledIds } from "./enabled-modules.ts";

// Admin Home's "This week" (round 6): four numbers over the last 7 days. Counts only, never names.

const DAY_MS = 24 * 60 * 60 * 1000;

const OPEN_INTRO_STATES: string[] = [INTRO_STATES.requested, INTRO_STATES.askingTarget];

// Founders who used the portal in the window: signed in (a session made or refreshed), or posted, answered, offered,
// reacted, wrote a message or asked for an intro.
async function countActiveFounders(database: Database, since: Date, now: Date) {
  const memberId = (column: unknown) => sql<string>`${column}`.as("member_id");
  const activity = unionAll(
    database.select({ memberId: memberId(session.userId) }).from(session).where(or(gte(session.updatedAt, since), gte(session.createdAt, since))),
    database.select({ memberId: memberId(ask.authorId) }).from(ask).where(gte(ask.createdAt, since)),
    database.select({ memberId: memberId(askAnswer.authorId) }).from(askAnswer).where(gte(askAnswer.createdAt, since)),
    database.select({ memberId: memberId(askOffer.helperId) }).from(askOffer).where(gte(askOffer.createdAt, since)),
    database.select({ memberId: memberId(post.authorId) }).from(post).where(gte(post.createdAt, since)),
    database.select({ memberId: memberId(comment.authorId) }).from(comment).where(gte(comment.createdAt, since)),
    database.select({ memberId: memberId(reaction.userId) }).from(reaction).where(gte(reaction.createdAt, since)),
    database.select({ memberId: memberId(directMessage.senderId) }).from(directMessage).where(gte(directMessage.createdAt, since)),
    database.select({ memberId: memberId(introRequest.requesterId) }).from(introRequest).where(gte(introRequest.createdAt, since)),
  ).as("activity");
  const [row] = await database
    .select({ founders: countDistinct(activity.memberId) })
    .from(activity)
    .innerJoin(user, eq(user.id, activity.memberId))
    .leftJoin(memberProfile, eq(memberProfile.userId, activity.memberId))
    // A member with no profile yet has the default role: founder.
    .where(and(isActiveMember(now), sql`coalesce(${memberProfile.communityRole}, ${COMMUNITY_ROLES.founder}) = ${COMMUNITY_ROLES.founder}`));
  return row?.founders ?? 0;
}

// Open asks nobody has helped with yet: no offer and no answer.
export async function countAsksWithNoHelp(database: Database, now: Date) {
  const rows = await database
    .select({ listedAt: ask.listedAt, closedAt: ask.closedAt })
    .from(ask)
    .where(
      and(
        eq(ask.kind, ASK_KINDS.ask),
        sql`not exists (select 1 from ${askOffer} where ${askOffer.askId} = ${ask.id})`,
        sql`not exists (select 1 from ${askAnswer} where ${askAnswer.askId} = ${ask.id})`,
      ),
    );
  return rows.filter((row) => readAskState(row, now) === ASK_STATES.open).length;
}

export async function countWaitingIntros(database: Database, now: Date) {
  const before = new Date(now.getTime() - INTRO_WAIT_DAYS * DAY_MS);
  const [row] = await database
    .select({ waiting: countDistinct(introRequest.id) })
    .from(introRequest)
    .where(and(eq(introRequest.isWithheld, false), inArray(introRequest.state, OPEN_INTRO_STATES), lt(introRequest.createdAt, before)));
  return row?.waiting ?? 0;
}

// A number whose module is off is null, and Home leaves its tile out.
export async function readThisWeek(database: Database, now = new Date()) {
  const since = new Date(now.getTime() - THIS_WEEK_DAYS * DAY_MS);
  const enabledIds = await readEnabledIds(database);
  const [activeFounders, asksWithNoHelp, introsWaiting, roomJoins] = await Promise.all([
    countActiveFounders(database, since, now),
    enabledIds.has(asksManifest.id) ? countAsksWithNoHelp(database, now) : null,
    enabledIds.has(introsManifest.id) ? countWaitingIntros(database, now) : null,
    enabledIds.has(voiceManifest.id) ? countRoomJoins(database, since) : null,
  ]);
  return { activeFounders, asksWithNoHelp, introsWaiting, roomJoins };
}

export type ThisWeek = Awaited<ReturnType<typeof readThisWeek>>;
