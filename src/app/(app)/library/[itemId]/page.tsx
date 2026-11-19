import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { LibraryItemPage } from "@/modules/library/components/library-item";
import { LIBRARY_PAGE_TITLE } from "@/modules/library/contract";
import { libraryManifest } from "@/modules/library/manifest";
import { readLibraryItem, readLibraryViewer } from "@/modules/library/reads";
import { readLibraryFlash, type LibrarySearchParams } from "@/modules/library/rules-page";
import { isAdminMember } from "@/platform/auth/roles";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";

export const metadata: Metadata = { title: LIBRARY_PAGE_TITLE };

type LibraryItemRouteProps = { params: Promise<{ itemId: string }>; searchParams: Promise<LibrarySearchParams> };

// One item. A member outside its audience gets the not-found page, as if it didn't exist.
export default modulePage(libraryManifest, async function LibraryItemRoute({ params, searchParams }: LibraryItemRouteProps) {
  const member = await requireMember();
  const { itemId } = await params;
  if (!z.uuid().safeParse(itemId).success) notFound();
  const database = getDatabase();
  const item = await readLibraryItem(database, await readLibraryViewer(database, member), itemId);
  if (!item) notFound();
  return <LibraryItemPage item={item} isAdmin={isAdminMember(member)} profileHref={`${ROUTES.people}/${item.author.id}`} flash={readLibraryFlash(await searchParams)} />;
});
