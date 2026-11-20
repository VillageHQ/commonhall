import type { Metadata } from "next";

import { FeatureScreen } from "@/modules/admin/components/feature-screen";
import { adminManifest } from "@/modules/admin/manifest";
import { requireAdmin } from "@/platform/auth/session";
import { PAGE_TITLES } from "@/platform/branding/page-metadata";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";
import { AdminSection } from "@/shell/admin-section";
import { readFeatureScreen } from "@/shell/module-settings";

export const metadata: Metadata = { title: PAGE_TITLES.adminFeatures };

export default modulePage(adminManifest, async function AdminFeaturesPage() {
  await requireAdmin();
  const { features } = await readFeatureScreen(getDatabase());

  return (
    <AdminSection title="Features" back={{ href: ROUTES.adminSettings, label: "Set up" }}>
      <FeatureScreen features={features} />
    </AdminSection>
  );
});
