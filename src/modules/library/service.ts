import "server-only";

import { and, eq, sql } from "drizzle-orm";

import { AUDIT_ACTIONS } from "../../platform/audit/actions.ts";
import { withAdminTransaction } from "../../platform/audit/admin-transaction.ts";
import { recordAdminAction } from "../../platform/audit/record.ts";
import { user } from "../../platform/database/auth-schema.ts";
import type { Database, Transaction } from "../../platform/database/client.ts";
import type { RequestContext, SessionMember } from "../../platform/http/request-context.ts";
import { RequestError } from "../../platform/http/request-error.ts";
import type { MemberRemoval } from "../../platform/modules/integration.ts";
import { logAdminAction } from "../../platform/observability/route-logging.ts";
import {
  LIBRARY_ERROR_CODES,
  LIBRARY_NOT_FOUND_MESSAGE,
  LIBRARY_VISIBILITIES,
  composeLibraryReportBody,
  type LibraryFeatureBody,
  type LibraryItemFields,
  type LibraryKind,
  type LibraryReviewBody,
  type LibraryUpload,
  type LibraryVisibility,
  type LibraryVoteBody,
} from "./contract.ts";
import { readLibraryViewer, readVisibleItemForAction } from "./reads.ts";
import { derivePitch, describePastedSecret, guessLibraryKind, scanPastedText } from "./rules-share.ts";
import { checkUploads } from "./rules-uploads.ts";
import { libraryFile, libraryItem, libraryItemCompany, libraryReview, libraryVersion, libraryVote } from "./schema.ts";

const NOT_FOUND_STATUS = 404;
const UNPROCESSABLE_STATUS = 422;

export function libraryItemGoneError() {
  return new RequestError(NOT_FOUND_STATUS, LIBRARY_ERROR_CODES.notFound, LIBRARY_NOT_FOUND_MESSAGE);
}

export type PublishedItem = { id: string; isNew: boolean; title: string; pitch: string; kind: LibraryKind; visibility: LibraryVisibility };

type ItemValues = Omit<LibraryItemFields, "itemId" | "companies" | "pitch" | "kind"> & { pitch: string; kind: LibraryKind };

// The kind and the one-line pitch the member left to the app: the same guesses the form shows.
function completeFields(fields: LibraryItemFields, files: readonly LibraryUpload[]): ItemValues {
  const fileNames = files.map(({ name }) => name);
  const kind = fields.kind ?? guessLibraryKind({ title: fields.title, text: fields.description ?? "", link: fields.link ?? "", fileNames });
  const pitch = fields.pitch ?? derivePitch({ title: fields.title, text: fields.description, link: fields.link, fileNames });
  return { ...fields, kind, pitch };
}

function itemValues(fields: ItemValues) {
  return {
    title: fields.title,
    pitch: fields.pitch,
    kind: fields.kind,
    job: fields.job,
    description: fields.description,
    install: fields.install,
    link: fields.link,
    visibility: fields.visibility,
  };
}

// Publishes an item, or a new version of the author's own item. Every file passes the type, size and secret checks
// before the transaction starts, so a refused upload stores nothing.
export async function publishLibraryItem({ database, member }: RequestContext, given: LibraryItemFields, files: readonly LibraryUpload[]): Promise<PublishedItem> {
  const problem = checkUploads(files);
  if (problem) throw new RequestError(UNPROCESSABLE_STATUS, problem.code, problem.message);
  // Pasted words get the same scan as files: a key pasted into the box is the likeliest leak.
  const pasted = scanPastedText([
    { label: "The title", text: given.title },
    { label: "The one-line pitch", text: given.pitch },
    { label: "The pasted text", text: given.description },
    { label: "How to install", text: given.install },
    { label: "The link", text: given.link },
  ]);
  if (pasted) throw new RequestError(UNPROCESSABLE_STATUS, LIBRARY_ERROR_CODES.secret, describePastedSecret(pasted));
  const fields = { ...completeFields(given, files), itemId: given.itemId, companies: given.companies };
  if (!fields.itemId && files.length === 0 && !fields.link && !fields.description && !fields.install) {
    throw new RequestError(UNPROCESSABLE_STATUS, LIBRARY_ERROR_CODES.nothingToShare, "Paste it, link it or attach a file, so others have something to use.");
  }
  return database.transaction(async (transaction) => {
    const now = new Date();
    let itemId = fields.itemId ?? null;
    let versionNumber = 1;
    if (itemId) {
      const [own] = await transaction
        .select({ authorId: libraryItem.authorId, versionCount: libraryItem.versionCount })
        .from(libraryItem)
        .where(eq(libraryItem.id, itemId))
        .for("update");
      if (!own || own.authorId !== member.id) throw libraryItemGoneError();
      // Words alone change the item; files make a new version.
      versionNumber = files.length > 0 ? own.versionCount + 1 : own.versionCount;
      await transaction
        .update(libraryItem)
        .set({ ...itemValues(fields), versionCount: versionNumber, updatedAt: now })
        .where(eq(libraryItem.id, itemId));
      await transaction.delete(libraryItemCompany).where(eq(libraryItemCompany.itemId, itemId));
    } else {
      const [created] = await transaction
        .insert(libraryItem)
        .values({ ...itemValues(fields), authorId: member.id, createdAt: now, updatedAt: now })
        .returning({ id: libraryItem.id });
      if (!created) throw libraryItemGoneError();
      itemId = created.id;
    }
    if (fields.visibility === LIBRARY_VISIBILITIES.companies) {
      await transaction.insert(libraryItemCompany).values(fields.companies.map(([companyKey, company]) => ({ itemId: itemId ?? "", companyKey, company })));
    }
    if (!fields.itemId || files.length > 0) {
      const [version] = await transaction.insert(libraryVersion).values({ itemId, number: versionNumber, createdAt: now }).returning({ id: libraryVersion.id });
      if (!version) throw libraryItemGoneError();
      if (files.length > 0) {
        await transaction.insert(libraryFile).values(files.map(({ name, bytes }) => ({ versionId: version.id, name, bytes, size: bytes.byteLength, createdAt: now })));
      }
    }
    return { id: itemId, isNew: !fields.itemId, title: fields.title, pitch: fields.pitch, kind: fields.kind, visibility: fields.visibility };
  });
}

async function readItemForMember(transaction: Transaction, member: SessionMember, itemId: string) {
  const viewer = await readLibraryViewer(transaction, member);
  const item = await readVisibleItemForAction(transaction, viewer, itemId);
  if (!item) throw libraryItemGoneError();
  return item;
}

async function countUpvotes(transaction: Transaction, itemId: string) {
  const [row] = await transaction.select({ upvotes: sql<number>`count(*)`.mapWith(Number) }).from(libraryVote).where(eq(libraryVote.itemId, itemId));
  return row?.upvotes ?? 0;
}

// One upvote per member per item: a second upvote changes nothing, undoing removes it. Never on your own item.
export async function setLibraryVote({ database, member }: RequestContext, { itemId, isUpvoted }: LibraryVoteBody) {
  return database.transaction(async (transaction) => {
    const item = await readItemForMember(transaction, member, itemId);
    if (item.authorId === member.id) throw new RequestError(UNPROCESSABLE_STATUS, LIBRARY_ERROR_CODES.ownItem, "This is your own item, so you can’t upvote it.");
    if (isUpvoted) await transaction.insert(libraryVote).values({ itemId, voterId: member.id }).onConflictDoNothing();
    else await transaction.delete(libraryVote).where(and(eq(libraryVote.itemId, itemId), eq(libraryVote.voterId, member.id)));
    return { upvotes: await countUpvotes(transaction, itemId), isUpvoted };
  });
}

// "Worked for us": one line per member per item. Writing again replaces your line.
export async function saveLibraryReview({ database, member }: RequestContext, { itemId, body }: LibraryReviewBody) {
  await database.transaction(async (transaction) => {
    const item = await readItemForMember(transaction, member, itemId);
    if (item.authorId === member.id) throw new RequestError(UNPROCESSABLE_STATUS, LIBRARY_ERROR_CODES.ownItem, "This is your own item. Reviews are for the people who used it.");
    await transaction
      .insert(libraryReview)
      .values({ itemId, authorId: member.id, body })
      .onConflictDoUpdate({ target: [libraryReview.itemId, libraryReview.authorId], set: { body, createdAt: new Date() } });
  });
}

export async function setLibraryItemFeatured({ database, member }: RequestContext, { itemId, isFeatured }: LibraryFeatureBody) {
  await withAdminTransaction(database, member.id, async (transaction) => {
    const item = await readItemForMember(transaction, member, itemId);
    if (isFeatured === (item.featuredAt !== null)) return;
    await transaction
      .update(libraryItem)
      .set({ featuredAt: isFeatured ? new Date() : null, featuredByUserId: isFeatured ? member.id : null })
      .where(eq(libraryItem.id, itemId));
    await recordAdminAction(transaction, member.id, {
      action: isFeatured ? AUDIT_ACTIONS.libraryItemFeatured : AUDIT_ACTIONS.libraryItemUnfeatured,
      targetMemberId: item.authorId,
      targetName: item.authorName,
      detail: item.title,
    });
  });
  logAdminAction(isFeatured ? "library_item_featured" : "library_item_unfeatured", member.id, itemId);
}

// What a removal leaves for the caller to clean up: the feed post that announced the item, if any.
export type RemovedLibraryItem = { feedPostId: string | null };
export type OnLibraryItemRemoved = (transaction: Transaction, removed: RemovedLibraryItem) => Promise<void>;

// An admin's removal, from the item's page or the report queue: the item, its files, votes and reviews go, and the
// audit log keeps its title and pitch.
export async function removeLibraryItemWithin(transaction: Transaction, admin: SessionMember, itemId: string): Promise<RemovedLibraryItem> {
  const [item] = await transaction
    .select({ authorId: libraryItem.authorId, title: libraryItem.title, pitch: libraryItem.pitch, feedPostId: libraryItem.feedPostId })
    .from(libraryItem)
    .where(eq(libraryItem.id, itemId))
    .for("update");
  if (!item) throw libraryItemGoneError();
  await transaction.delete(libraryItem).where(eq(libraryItem.id, itemId));
  await recordAdminAction(transaction, admin.id, {
    action: AUDIT_ACTIONS.libraryItemRemoved,
    targetMemberId: item.authorId,
    targetName: await readName(transaction, item.authorId),
    detail: composeLibraryReportBody(item.title, item.pitch),
  });
  return { feedPostId: item.feedPostId };
}

async function readName(transaction: Transaction, memberId: string) {
  const [author] = await transaction.select({ name: user.name }).from(user).where(eq(user.id, memberId));
  return author?.name ?? null;
}

// The author takes their own item down (not audited), or an admin removes any item (audited). `onRemoved` runs in the
// same transaction; the route passes the shell's, which deletes the item's feed post.
export async function removeLibraryItem({ database, member }: RequestContext, itemId: string, isAdmin: boolean, onRemoved: OnLibraryItemRemoved) {
  if (isAdmin) {
    await withAdminTransaction(database, member.id, async (transaction) => onRemoved(transaction, await removeLibraryItemWithin(transaction, member, itemId)));
    logAdminAction("library_item_removed", member.id, itemId);
    return;
  }
  await database.transaction(async (transaction) => {
    const [removed] = await transaction
      .delete(libraryItem)
      .where(and(eq(libraryItem.id, itemId), eq(libraryItem.authorId, member.id)))
      .returning({ feedPostId: libraryItem.feedPostId });
    if (!removed) throw libraryItemGoneError();
    await onRemoved(transaction, removed);
  });
}

// The feed post that announced a new item, so a removal can take it away too.
export async function saveLibraryFeedPost(database: Database, itemId: string, feedPostId: string) {
  await database.update(libraryItem).set({ feedPostId }).where(eq(libraryItem.id, itemId));
}

// A download counts once per file fetched.
export async function countLibraryDownload(database: Database, itemId: string) {
  await database
    .update(libraryItem)
    .set({ downloadCount: sql`${libraryItem.downloadCount} + 1` })
    .where(eq(libraryItem.id, itemId));
}

// A member who leaves keeps no visible items unless the admin keeps their content (as `your-data` does for posts).
// When content goes, their upvotes and reviews on others' items go too.
export async function deleteMemberLibrary(transaction: Transaction, { memberId, memberName, actorId, keepsContent }: MemberRemoval) {
  if (keepsContent) return;
  const items = await transaction.select({ title: libraryItem.title, pitch: libraryItem.pitch }).from(libraryItem).where(eq(libraryItem.authorId, memberId));
  for (const { title, pitch } of items) {
    await recordAdminAction(transaction, actorId, {
      action: AUDIT_ACTIONS.libraryItemRemoved,
      targetMemberId: memberId,
      targetName: memberName,
      detail: composeLibraryReportBody(title, pitch),
    });
  }
  await transaction.delete(libraryItem).where(eq(libraryItem.authorId, memberId));
  await transaction.delete(libraryReview).where(eq(libraryReview.authorId, memberId));
  await transaction.delete(libraryVote).where(eq(libraryVote.voterId, memberId));
}
