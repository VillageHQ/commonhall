import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { z } from "zod";

import { PageHeader } from "@/components/page-header";
import { EMPTY_DRAFT, PublishForm, type PublishDraft } from "@/modules/library/components/publish-form";
import { LIBRARY_PAGES, LIBRARY_VISIBILITIES, toLibraryItemPage } from "@/modules/library/contract";
import { libraryManifest } from "@/modules/library/manifest";
import { readLibraryItem, readLibraryViewer } from "@/modules/library/reads";
import { readFirst, type LibrarySearchParams } from "@/modules/library/rules-page";
import { readMemberProfile } from "@/modules/members/service-profile";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { modulePage } from "@/platform/modules/module-page";

export const metadata: Metadata = { title: "Share in the library" };

type PublishPageProps = { searchParams: Promise<LibrarySearchParams> };

// A new item, or (?item=<id>) the author's own item to edit or give a new version.
export default modulePage(libraryManifest, async function PublishPage({ searchParams }: PublishPageProps) {
  const member = await requireMember();
  const database = getDatabase();
  const itemId = readFirst((await searchParams).item);
  const profile = await readMemberProfile(database, member.id);
  let initial: PublishDraft = EMPTY_DRAFT;
  if (itemId) {
    if (!z.uuid().safeParse(itemId).success) notFound();
    const item = await readLibraryItem(database, await readLibraryViewer(database, member), itemId);
    if (!item || !item.isMine) notFound();
    initial = {
      itemId: item.id,
      title: item.title,
      pitch: item.pitch,
      kind: item.kind,
      job: item.job ?? "",
      // The one box shows the pasted text, or the link when there is no text.
      box: item.description ?? item.link ?? "",
      link: item.description ? (item.link ?? "") : "",
      install: item.install ?? "",
      visibility: item.visibility,
      companies: item.visibility === LIBRARY_VISIBILITIES.companies ? item.companies.join(", ") : "",
    };
  }
  return (
    <>
      <PageHeader
        back={itemId ? { href: toLibraryItemPage(itemId), label: initial.title } : { href: LIBRARY_PAGES.browse, label: "Library" }}
        title={itemId ? "Edit or upload a new version" : "Share in the library"}
        description={itemId ? "New files make a new version; the words change in place." : undefined}
      />
      <PublishForm initial={initial} ownCompany={profile?.company?.trim() || null} />
    </>
  );
});
