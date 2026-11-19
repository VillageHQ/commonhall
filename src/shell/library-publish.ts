import "server-only";

import { eq } from "drizzle-orm";

import { POST_TYPES } from "@/modules/feed/contract";
import { feedManifest } from "@/modules/feed/manifest";
import { createPost } from "@/modules/feed/service";
import { LIBRARY_KIND_LABELS, LIBRARY_VISIBILITIES, toLibraryItemPage } from "@/modules/library/contract";
import { post } from "@/modules/feed/schema";
import { saveLibraryFeedPost, type PublishedItem, type RemovedLibraryItem } from "@/modules/library/service";
import type { Transaction } from "@/platform/database/client";
import { resolveAppUrl } from "@/platform/http/app-url";
import type { RequestContext } from "@/platform/http/request-context";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { logError } from "@/platform/observability/route-logging";

export function composeLibraryPost(item: PublishedItem, appUrl: string | null) {
  const where = appUrl ? `\n${appUrl}${toLibraryItemPage(item.id)}` : "";
  return `Shared in the library: ${item.title} (${LIBRARY_KIND_LABELS[item.kind].toLowerCase()}). ${item.pitch}${where}`;
}

// A new item seen by the whole portfolio gets a feed post from its author, while the feed is on. An item for the fund
// team or chosen companies never does, so the post can't show it to anyone else. The item is saved already: a failed
// post is logged, never shown as a failed publish.
export async function postNewLibraryItem(context: RequestContext, item: PublishedItem) {
  if (!item.isNew || item.visibility !== LIBRARY_VISIBILITIES.portfolio) return;
  try {
    if (!(await isModuleEnabled(context.database, feedManifest))) return;
    let appUrl: string | null = null;
    try {
      appUrl = resolveAppUrl(context.environment);
    } catch {
      appUrl = null;
    }
    const created = await createPost(context, { type: POST_TYPES.plain, body: composeLibraryPost(item, appUrl) });
    await saveLibraryFeedPost(context.database, item.id, created.id);
  } catch (error) {
    logError("library-feed-post", error);
  }
}

// A removed item takes its announcing post with it, so the feed never links to a page that's gone.
export async function deleteLibraryFeedPost(transaction: Transaction, { feedPostId }: RemovedLibraryItem) {
  if (feedPostId) await transaction.delete(post).where(eq(post.id, feedPostId));
}
