import "server-only";

import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, or, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { isActiveMember } from "../../platform/auth/member-status.ts";
import { isAdminMember } from "../../platform/auth/roles.ts";
import { user } from "../../platform/database/auth-schema.ts";
import type { Database, DatabaseOrTransaction } from "../../platform/database/client.ts";
import type { SessionMember } from "../../platform/http/request-context.ts";
import { COMMUNITY_ROLES } from "../members/contract-community-roles.ts";
import { companyLogoColumn, shownCompanyColumn, shownFaceColumns, toShownFaceUrl } from "../members/reads-pictures.ts";
import { memberBlock, memberProfile, memberRemoval } from "../members/schema.ts";
import {
  LIBRARY_BOARD_PERIODS,
  LIBRARY_LIMITS,
  LIBRARY_VISIBILITIES,
  toCompanyKey,
  type LibraryBoardPeriod,
  type LibraryJob,
  type LibraryKind,
  type LibraryVisibility,
} from "./contract.ts";
import { libraryFile, libraryItem, libraryItemCompany, libraryReview, libraryVersion, libraryVote } from "./schema.ts";

// Who is looking, with the facts the visibility rule needs: admins see everything, the fund team sees "fund team only"
// items, and a member's company on show decides the "chosen companies" items.
export type LibraryViewer = { id: string; isAdmin: boolean; isFundTeam: boolean; companyKey: string | null };

export async function readLibraryViewer(connection: DatabaseOrTransaction, member: SessionMember): Promise<LibraryViewer> {
  const [row] = await connection
    .select({ communityRole: memberProfile.communityRole, company: shownCompanyColumn(user.id) })
    .from(user)
    .leftJoin(memberProfile, eq(memberProfile.userId, user.id))
    .where(eq(user.id, member.id));
  const company = row?.company?.trim() ? toCompanyKey(row.company) : null;
  return { id: member.id, isAdmin: isAdminMember(member), isFundTeam: row?.communityRole === COMMUNITY_ROLES.fundTeam, companyKey: company };
}

function hasNoBlockBetween(viewerId: string, otherMemberId: AnyPgColumn) {
  return sql`not exists (select 1 from ${memberBlock} where (${memberBlock.blockerId} = ${viewerId} and ${memberBlock.blockedId} = ${otherMemberId})
      or (${memberBlock.blockerId} = ${otherMemberId} and ${memberBlock.blockedId} = ${viewerId}))`;
}

// An author still counts while active, or after removal when the admin kept their content (as the feed does).
export function isAuthorShown(now = new Date()) {
  return or(
    isActiveMember(now),
    sql`exists (select 1 from ${memberRemoval} where ${memberRemoval.userId} = ${user.id} and ${memberRemoval.keepsContent} = true)`,
  );
}

// The one rule every read and every action goes through. The item's author must still be an active member, and
// neither of the two may have blocked the other.
export function isItemVisibleTo(viewer: LibraryViewer, now = new Date()): SQL {
  const audience = viewer.isAdmin
    ? sql`true`
    : or(
        eq(libraryItem.authorId, viewer.id),
        eq(libraryItem.visibility, LIBRARY_VISIBILITIES.portfolio),
        viewer.isFundTeam ? eq(libraryItem.visibility, LIBRARY_VISIBILITIES.fundTeam) : sql`false`,
        viewer.companyKey
          ? and(
              eq(libraryItem.visibility, LIBRARY_VISIBILITIES.companies),
              sql`exists (select 1 from ${libraryItemCompany} where ${libraryItemCompany.itemId} = ${libraryItem.id} and ${libraryItemCompany.companyKey} = ${viewer.companyKey})`,
            )
          : sql`false`,
      );
  return and(audience, isAuthorShown(now), viewer.isAdmin ? sql`true` : hasNoBlockBetween(viewer.id, libraryItem.authorId)) as SQL;
}

export type LibraryMember = { id: string; name: string; title: string | null; company: string | null; avatarUrl: string | null; companyLogoUrl: string | null };

function authorColumns() {
  return {
    authorId: libraryItem.authorId,
    authorName: user.name,
    authorTitle: memberProfile.title,
    authorCompany: shownCompanyColumn(libraryItem.authorId),
    authorLogo: companyLogoColumn(libraryItem.authorId),
    ...shownFaceColumns(libraryItem.authorId),
  };
}

type AuthorRow = { authorId: string; authorName: string; authorTitle: string | null; authorCompany: string | null; authorLogo: string | null; avatarUpdatedAt: Date | null; filledFace: string | null };

function toAuthor(row: AuthorRow): LibraryMember {
  return {
    id: row.authorId,
    name: row.authorName,
    title: row.authorTitle,
    company: row.authorCompany,
    avatarUrl: toShownFaceUrl(row.authorId, row.avatarUpdatedAt, row.filledFace),
    companyLogoUrl: row.authorLogo,
  };
}

const upvoteCount = sql<number>`(select count(*) from ${libraryVote} where ${libraryVote.itemId} = ${libraryItem.id})`.mapWith(Number);

function isUpvotedBy(viewerId: string) {
  return sql<boolean>`exists (select 1 from ${libraryVote} where ${libraryVote.itemId} = ${libraryItem.id} and ${libraryVote.voterId} = ${viewerId})`;
}

export type LibraryCard = {
  id: string;
  title: string;
  pitch: string;
  kind: LibraryKind;
  // Empty when the member didn't say.
  job: LibraryJob | null;
  visibility: LibraryVisibility;
  author: LibraryMember;
  upvotes: number;
  isUpvoted: boolean;
  isFeatured: boolean;
  isMine: boolean;
  updatedAt: string;
};

export type LibraryFilters = { kind: LibraryKind | null; job: LibraryJob | null; search: string | null; mine?: boolean; top?: boolean };

function readSearchWords(search: string | null) {
  return (search ?? "").split(/\s+/).filter(Boolean).slice(0, 8);
}

function escapeLike(word: string) {
  return word.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function cardColumns(viewerId: string) {
  return {
    id: libraryItem.id,
    title: libraryItem.title,
    pitch: libraryItem.pitch,
    kind: libraryItem.kind,
    job: libraryItem.job,
    visibility: libraryItem.visibility,
    featuredAt: libraryItem.featuredAt,
    updatedAt: libraryItem.updatedAt,
    upvotes: upvoteCount,
    isUpvoted: isUpvotedBy(viewerId),
    ...authorColumns(),
  };
}

type CardRow = AuthorRow & {
  id: string;
  title: string;
  pitch: string;
  kind: string;
  job: string | null;
  visibility: string;
  featuredAt: Date | null;
  updatedAt: Date;
  upvotes: number;
  isUpvoted: boolean;
};

function toCard(row: CardRow, viewerId: string): LibraryCard {
  return {
    id: row.id,
    title: row.title,
    pitch: row.pitch,
    kind: row.kind as LibraryKind,
    job: row.job as LibraryJob | null,
    visibility: row.visibility as LibraryVisibility,
    author: toAuthor(row),
    upvotes: row.upvotes,
    isUpvoted: row.isUpvoted,
    isFeatured: row.featuredAt !== null,
    isMine: row.authorId === viewerId,
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Browse: featured items first (not under "Top"), then the most upvoted, then the newest. Search matches every typed word in the title
// or the pitch.
export async function readLibraryItems(database: Database, viewer: LibraryViewer, { kind, job, search, mine = false, top = false }: LibraryFilters, now = new Date()) {
  const words = readSearchWords(search);
  const rows = await database
    .select(cardColumns(viewer.id))
    .from(libraryItem)
    .innerJoin(user, eq(user.id, libraryItem.authorId))
    .leftJoin(memberProfile, eq(memberProfile.userId, libraryItem.authorId))
    .where(
      and(
        isItemVisibleTo(viewer, now),
        kind ? eq(libraryItem.kind, kind) : undefined,
        job ? eq(libraryItem.job, job) : undefined,
        mine ? eq(libraryItem.authorId, viewer.id) : undefined,
        ...words.map((word) => or(ilike(libraryItem.title, `%${escapeLike(word)}%`), ilike(libraryItem.pitch, `%${escapeLike(word)}%`))),
      ),
    )
    .orderBy(...(top ? [] : [sql`${libraryItem.featuredAt} is null`]), desc(upvoteCount), desc(libraryItem.updatedAt), desc(libraryItem.id))
    .limit(LIBRARY_LIMITS.itemsPerPage);
  return rows.map((row) => toCard(row, viewer.id));
}

export type LibraryFileShape = { id: string; name: string; size: number };
export type LibraryReviewShape = { id: string; author: LibraryMember; body: string; createdAt: string; isMine: boolean };
export type LibraryItemDetail = LibraryCard & {
  description: string | null;
  install: string | null;
  link: string | null;
  companies: string[];
  versionCount: number;
  downloadCount: number;
  files: LibraryFileShape[];
  reviews: LibraryReviewShape[];
  createdAt: string;
};

async function readItemReviews(database: Database, viewer: LibraryViewer, itemId: string, now: Date): Promise<LibraryReviewShape[]> {
  const rows = await database
    .select({
      id: libraryReview.id,
      body: libraryReview.body,
      createdAt: libraryReview.createdAt,
      authorId: libraryReview.authorId,
      authorName: user.name,
      authorTitle: memberProfile.title,
      authorCompany: shownCompanyColumn(libraryReview.authorId),
      authorLogo: companyLogoColumn(libraryReview.authorId),
      ...shownFaceColumns(libraryReview.authorId),
    })
    .from(libraryReview)
    .innerJoin(user, eq(user.id, libraryReview.authorId))
    .leftJoin(memberProfile, eq(memberProfile.userId, libraryReview.authorId))
    .where(and(eq(libraryReview.itemId, itemId), isActiveMember(now), hasNoBlockBetween(viewer.id, libraryReview.authorId)))
    .orderBy(desc(libraryReview.createdAt));
  return rows.map((row) => ({ id: row.id, author: toAuthor(row), body: row.body, createdAt: row.createdAt.toISOString(), isMine: row.authorId === viewer.id }));
}

// One item's page, or null when the viewer may not see it (the route answers 404 then).
export async function readLibraryItem(database: Database, viewer: LibraryViewer, itemId: string, now = new Date()): Promise<LibraryItemDetail | null> {
  const [row] = await database
    .select({
      ...cardColumns(viewer.id),
      description: libraryItem.description,
      install: libraryItem.install,
      link: libraryItem.link,
      versionCount: libraryItem.versionCount,
      downloadCount: libraryItem.downloadCount,
      createdAt: libraryItem.createdAt,
    })
    .from(libraryItem)
    .innerJoin(user, eq(user.id, libraryItem.authorId))
    .leftJoin(memberProfile, eq(memberProfile.userId, libraryItem.authorId))
    .where(and(eq(libraryItem.id, itemId), isItemVisibleTo(viewer, now)));
  if (!row) return null;
  const [files, companies, reviews] = await Promise.all([
    database
      .select({ id: libraryFile.id, name: libraryFile.name, size: libraryFile.size })
      .from(libraryFile)
      .innerJoin(libraryVersion, eq(libraryVersion.id, libraryFile.versionId))
      .where(and(eq(libraryVersion.itemId, itemId), eq(libraryVersion.number, row.versionCount)))
      .orderBy(asc(libraryFile.name)),
    database.select({ company: libraryItemCompany.company }).from(libraryItemCompany).where(eq(libraryItemCompany.itemId, itemId)).orderBy(asc(libraryItemCompany.company)),
    readItemReviews(database, viewer, itemId, now),
  ]);
  return {
    ...toCard(row, viewer.id),
    description: row.description,
    install: row.install,
    link: row.link,
    companies: companies.map(({ company }) => company),
    versionCount: row.versionCount,
    downloadCount: row.downloadCount,
    files,
    reviews,
    createdAt: row.createdAt.toISOString(),
  };
}

// The visible item an action is about, locked for the rest of the transaction; null when the viewer may not see it.
export async function readVisibleItemForAction(connection: DatabaseOrTransaction, viewer: LibraryViewer, itemId: string) {
  const [row] = await connection
    .select({ id: libraryItem.id, authorId: libraryItem.authorId, authorName: user.name, title: libraryItem.title, pitch: libraryItem.pitch, featuredAt: libraryItem.featuredAt, createdAt: libraryItem.createdAt })
    .from(libraryItem)
    .innerJoin(user, eq(user.id, libraryItem.authorId))
    .where(and(eq(libraryItem.id, itemId), isItemVisibleTo(viewer)))
    .for("share", { of: libraryItem });
  return row ?? null;
}

// A file to download: only from an item the viewer may see, any of its versions.
export async function readLibraryFile(database: Database, viewer: LibraryViewer, fileId: string) {
  const [row] = await database
    .select({ itemId: libraryItem.id, name: libraryFile.name, bytes: libraryFile.bytes })
    .from(libraryFile)
    .innerJoin(libraryVersion, eq(libraryVersion.id, libraryFile.versionId))
    .innerJoin(libraryItem, eq(libraryItem.id, libraryVersion.itemId))
    .innerJoin(user, eq(user.id, libraryItem.authorId))
    .where(and(eq(libraryFile.id, fileId), isItemVisibleTo(viewer)));
  return row ?? null;
}

export type LeaderboardPerson = { member: LibraryMember; upvotes: number };
export type LeaderboardCompany = { company: string; logoUrl: string | null; upvotes: number; people: number };
export type Leaderboard = { people: LeaderboardPerson[]; companies: LeaderboardCompany[] };

export function startOfMonth(now: Date) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

// Upvotes received on items, counted in SQL: by the item's author, and by the author's company on show (without case).
// "This month" counts upvotes given since the first of the month (UTC). A removed item's votes went with it; a removed
// author's items leave the board with them, unless the admin kept their content. Only items the viewer may see count,
// so the board never hints at an item hidden from them.
export async function readLeaderboard(database: Database, viewer: LibraryViewer, period: LibraryBoardPeriod, now = new Date()): Promise<Leaderboard> {
  const since = period === LIBRARY_BOARD_PERIODS.month ? gte(libraryVote.createdAt, startOfMonth(now)) : undefined;
  const received = sql<number>`count(*)`.mapWith(Number);
  const company = shownCompanyColumn(libraryItem.authorId);
  const companyKey = sql<string>`lower(regexp_replace(trim(${company}), '\\s+', ' ', 'g'))`;
  const [people, companies] = await Promise.all([
    database
      .select({
        upvotes: received,
        authorId: libraryItem.authorId,
        authorName: user.name,
        authorTitle: memberProfile.title,
        authorCompany: company,
        authorLogo: companyLogoColumn(libraryItem.authorId),
        ...shownFaceColumns(libraryItem.authorId),
      })
      .from(libraryVote)
      .innerJoin(libraryItem, eq(libraryItem.id, libraryVote.itemId))
      .innerJoin(user, eq(user.id, libraryItem.authorId))
      .leftJoin(memberProfile, eq(memberProfile.userId, libraryItem.authorId))
      .where(and(isItemVisibleTo(viewer, now), since))
      .groupBy(libraryItem.authorId, user.name, memberProfile.title)
      .orderBy(desc(received), asc(user.name))
      .limit(LIBRARY_LIMITS.leaderboardRows),
    database
      .select({
        companyKey,
        company: sql<string>`min(trim(${company}))`,
        logoUrl: sql<string | null>`max(${companyLogoColumn(libraryItem.authorId)})`,
        upvotes: received,
        people: sql<number>`count(distinct ${libraryItem.authorId})`.mapWith(Number),
      })
      .from(libraryVote)
      .innerJoin(libraryItem, eq(libraryItem.id, libraryVote.itemId))
      .innerJoin(user, eq(user.id, libraryItem.authorId))
      .where(and(isItemVisibleTo(viewer, now), since, sql`nullif(trim(${company}), '') is not null`))
      // By position: the key's subquery carries bound values, so writing it again wouldn't match the select.
      .groupBy(sql.raw("1"))
      .orderBy(desc(received), sql.raw("1"))
      .limit(LIBRARY_LIMITS.leaderboardRows),
  ]);
  return {
    people: people.map((row) => ({ member: toAuthor(row), upvotes: row.upvotes })),
    companies: companies.map(({ company: name, logoUrl, upvotes, people: count }) => ({ company: name, logoUrl, upvotes, people: count })),
  };
}

export async function countFeaturedItems(connection: DatabaseOrTransaction) {
  const [row] = await connection.select({ featured: sql<number>`count(*)`.mapWith(Number) }).from(libraryItem).where(isNotNull(libraryItem.featuredAt));
  return row?.featured ?? 0;
}

export async function readItemsByIds(connection: DatabaseOrTransaction, itemIds: readonly string[]) {
  if (itemIds.length === 0) return [];
  return connection.select({ id: libraryItem.id }).from(libraryItem).where(inArray(libraryItem.id, [...itemIds]));
}
