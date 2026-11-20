import type { Metadata } from "next";

import { adminManifest } from "@/modules/admin/manifest";
import { ImportMembersForm } from "@/modules/members/components/import-members-form";
import { readFillInSettings } from "@/modules/members/service-fill-in";
import { requireAdmin } from "@/platform/auth/session";
import { PAGE_TITLES } from "@/platform/branding/page-metadata";
import { getDatabase } from "@/platform/database/client";
import { modulePage } from "@/platform/modules/module-page";
import { AdminSection } from "@/shell/admin-section";

export const metadata: Metadata = { title: PAGE_TITLES.adminImport };

// Members › Import: a whole alumni list from a CSV. The paste-a-list invite stays on Invites.
export default modulePage(adminManifest, async function AdminImportPage() {
  await requireAdmin();
  const database = getDatabase();
  const fillIn = await readFillInSettings(database);

  return (
    <AdminSection title="Members">
      <ImportMembersForm communityBasis={fillIn.basis} communityTermsDate={fillIn.termsDate} today={new Date().toISOString().slice(0, 10)} />
    </AdminSection>
  );
});
