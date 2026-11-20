import "server-only";

import { and, count, desc, eq, inArray, isNull, max, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { isActiveMember } from "../platform/auth/member-status.ts";
import type { Database } from "../platform/database/client.ts";
import { user } from "../platform/database/auth-schema.ts";
import { REPORT_TARGETS } from "../modules/admin/contract.ts";
import { contentReport } from "../modules/admin/schema.ts";
import { ASK_KINDS, ASK_LIMITS, ASK_OUTCOMES, ASK_STATES } from "../modules/asks/contract.ts";
import { readAskState } from "../modules/asks/rules-state.ts";
import { ask, askAnswer, askHelper, askOffer } from "../modules/asks/schema.ts";

const REPORTED_SHOWN = 10;
const answerAuthor = alias(user, "admin_answer_author");
const ROWS_SHOWN = 200;

// Open reports on asks and their answers, one line per reported thing, newest report first. The copy is the one the
// reports queue shows; removing from here resolves every open report on it, as the queue does.
async function readReportedAsks(database: Database) {
  const askTargets = [REPORT_TARGETS.ask, REPORT_TARGETS.askAnswer];
  const rows = await database
    .select({
      targetType: contentReport.targetType,
      targetId: contentReport.targetId,
      reportId: sql<string>`(array_agg(${contentReport.id} order by ${contentReport.createdAt} desc))[1]`,
      body: sql<string>`(array_agg(${contentReport.body} order by ${contentReport.createdAt} desc))[1]`,
      reportCount: count(),
      lastReportedAt: max(contentReport.createdAt),
    })
    .from(contentReport)
    .where(and(isNull(contentReport.resolvedAt), inArray(contentReport.targetType, askTargets)))
    .groupBy(contentReport.targetType, contentReport.targetId)
    .orderBy(desc(max(contentReport.createdAt)))
    .limit(REPORTED_SHOWN);
  return rows.map(({ targetType, reportId, body, reportCount, lastReportedAt }) => ({
    reportId,
    targetType: targetType === REPORT_TARGETS.askAnswer ? REPORT_TARGETS.askAnswer : REPORT_TARGETS.ask,
    body,
    reportCount,
    lastReportedAt: (lastReportedAt ?? new Date()).toISOString(),
  }));
}

export type ReportedAsk = Awaited<ReturnType<typeof readReportedAsks>>[number];

export const ASK_ROW_STATUSES = { open: "open", answered: "answered", closed: "closed", expired: "expired", update: "update" } as const;

export type AskRowStatus = (typeof ASK_ROW_STATUSES)[keyof typeof ASK_ROW_STATUSES];

export type AdminAskRow = {
  id: string;
  kind: string;
  title: string;
  authorName: string;
  createdAt: string;
  helperCount: number;
  offerCount: number;
  answerCount: number;
  status: AskRowStatus;
  isPinned: boolean;
  canClose: boolean;
};

function readRowStatus(row: { kind: string; listedAt: Date; closedAt: Date | null; outcome: string | null }, now: Date): AskRowStatus {
  if (row.kind === ASK_KINDS.update) return ASK_ROW_STATUSES.update;
  const state = readAskState(row, now);
  if (state === ASK_STATES.open) return ASK_ROW_STATUSES.open;
  if (state === ASK_STATES.expired) return ASK_ROW_STATUSES.expired;
  return row.outcome === ASK_OUTCOMES.noLongerNeeded ? ASK_ROW_STATUSES.closed : ASK_ROW_STATUSES.answered;
}

// Every ask and update, newest first: Commonhall's moderation rows. Names and dates only, never an answer's words.
async function readAskRows(database: Database, now: Date): Promise<AdminAskRow[]> {
  const helperCount = database.select({ askId: askHelper.askId, n: count().as("helper_n") }).from(askHelper).groupBy(askHelper.askId).as("helper_counts");
  const offerCount = database.select({ askId: askOffer.askId, n: count().as("offer_n") }).from(askOffer).groupBy(askOffer.askId).as("offer_counts");
  // Answers members can see: the author is still an active member, as on the board.
  const answerCount = database
    .select({ askId: askAnswer.askId, n: count().as("answer_n") })
    .from(askAnswer)
    .innerJoin(answerAuthor, eq(answerAuthor.id, askAnswer.authorId))
    .where(isActiveMember(now, answerAuthor))
    .groupBy(askAnswer.askId)
    .as("answer_counts");
  const rows = await database
    .select({
      id: ask.id,
      kind: ask.kind,
      title: ask.title,
      authorName: user.name,
      createdAt: ask.createdAt,
      listedAt: ask.listedAt,
      closedAt: ask.closedAt,
      outcome: ask.outcome,
      pinnedAt: ask.pinnedAt,
      helperCount: helperCount.n,
      offerCount: offerCount.n,
      answerCount: answerCount.n,
    })
    .from(ask)
    .innerJoin(user, eq(user.id, ask.authorId))
    .leftJoin(helperCount, eq(helperCount.askId, ask.id))
    .leftJoin(offerCount, eq(offerCount.askId, ask.id))
    .leftJoin(answerCount, eq(answerCount.askId, ask.id))
    .orderBy(desc(ask.createdAt), desc(ask.id))
    .limit(ROWS_SHOWN);
  return rows.map((row) => {
    const status = readRowStatus(row, now);
    return {
      id: row.id,
      kind: row.kind,
      title: row.title,
      authorName: row.authorName,
      createdAt: row.createdAt.toISOString(),
      helperCount: Number(row.helperCount ?? 0),
      offerCount: Number(row.offerCount ?? 0),
      answerCount: Number(row.answerCount ?? 0),
      status,
      isPinned: row.pinnedAt !== null,
      canClose: row.closedAt === null,
    };
  });
}

// An open ask nobody has offered help on or answered: Asks & intros lists these first.
export function hasNoHelp({ status, offerCount, answerCount }: Pick<AdminAskRow, "status" | "offerCount" | "answerCount">) {
  return status === ASK_ROW_STATUSES.open && offerCount === 0 && answerCount === 0;
}

// Everything the console's Asks page shows: asks with no help first, then the rest, newest first.
export async function readAdminAsks(database: Database, now = new Date()) {
  const [rows, reported] = await Promise.all([readAskRows(database, now), readReportedAsks(database)]);
  const pinnedCount = rows.filter(({ isPinned }) => isPinned).length;
  return {
    rows,
    noHelp: rows.filter(hasNoHelp),
    rest: rows.filter((row) => !hasNoHelp(row)),
    reported,
    canPin: pinnedCount < ASK_LIMITS.pinnedAsks,
  };
}

export type AdminAsks = Awaited<ReturnType<typeof readAdminAsks>>;
