import type { Metadata } from "next";
import Link from "next/link";

import { APP_VERSION } from "@/platform/app-version";
import { requireAdmin } from "@/platform/auth/session";
import { readBranding } from "@/platform/branding/branding";
import { PAGE_TITLES } from "@/platform/branding/page-metadata";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";
import { formatDayWord, PLANS, readPlanSettings } from "@/platform/settings/plan";
import { readVillageKeyState } from "@/platform/village/settings";
import { SettingsForm } from "@/modules/admin/components/settings-form";
import { VillageSecretLine } from "@/modules/admin/components/village-secret-card";
import { UPDATE_GUIDE_URL } from "@/modules/admin/copy";
import { adminManifest } from "@/modules/admin/manifest";
import { readMailOverview } from "@/modules/admin/reads-mail";
import { readSettingsValues } from "@/modules/admin/service-settings";
import { networkManifest } from "@/modules/network/manifest";
import { AdminSection } from "@/shell/admin-section";
import { AskAllowanceSetting, OutcomeDaysSetting } from "@/modules/admin/components/intro-log-controls";
import { asksManifest } from "@/modules/asks/manifest";
import { readWeeklyAllowance } from "@/modules/asks/reads";
import { introsManifest } from "@/modules/intros/manifest";
import { readOutcomeDays } from "@/modules/intros/reads-outcome-days";
import { readSetupPage, SETUP_ROW_PLACES } from "@/shell/admin-setup-rows";
import { SetupRowList } from "@/shell/admin-setup-rows-view";
import { VILLAGE_KEYS_ANCHOR } from "@/shell/admin-home-anchors";
import { readEnabledIds } from "@/shell/enabled-modules";

export const metadata: Metadata = { title: PAGE_TITLES.adminSettings };

function VersionLine() {
  return (
    <p className="fh-small fh-muted">
      Version <b className="fh-num">{APP_VERSION}</b>. Updates aren&apos;t automatic: <a href={UPDATE_GUIDE_URL} target="_blank" rel="noreferrer">the update guide</a>.
    </p>
  );
}

async function readVillageLine(isNetworkOn: boolean) {
  const { keys, status } = await readVillageKeyState(getDatabase());
  if (!isNetworkOn) return { text: "Switched off", href: ROUTES.adminFeatures, link: "Features", status };
  return { text: keys ? "Connected" : "Not connected", href: ROUTES.adminVillage, link: "Village settings", status };
}

// Set up (round 6): the one settings page. In view: the branding, Mail and Features, and the asks allowance and the
// outcome question. Folded under Advanced: the rest of the settings and every page for an engineer.
export default modulePage(adminManifest, async function AdminSettingsPage() {
  await requireAdmin();
  const database = getDatabase();
  const [saved, branding, plan, mail, enabledIds, rows, weeklyAllowance, outcomeDays] = await Promise.all([
    readSettingsValues(database),
    readBranding(database),
    readPlanSettings(database),
    readMailOverview(database, process.env),
    readEnabledIds(database),
    readSetupPage(database, process.env),
    readWeeklyAllowance(database),
    readOutcomeDays(database),
  ]);
  const village = await readVillageLine(enabledIds.has(networkManifest.id));

  const beside = (
    <>
      <section className="fh-sheet">
        <SetupRowList rows={rows.filter(({ place }) => place === SETUP_ROW_PLACES.essential)} />
      </section>
      {enabledIds.has(asksManifest.id) || enabledIds.has(introsManifest.id) ? <AskAllowanceSetting weeklyAllowance={weeklyAllowance} /> : null}
      {enabledIds.has(introsManifest.id) ? <OutcomeDaysSetting outcomeDays={outcomeDays} /> : null}
    </>
  );
  const aside = (
    <>
      <section className="fh-sheet">
        <SetupRowList rows={rows.filter(({ place }) => place === SETUP_ROW_PLACES.advanced)} />
      </section>
      <section className="fh-sheet" id={VILLAGE_KEYS_ANCHOR}>
        <h2 className="fh-h3">Village keys</h2>
        <p className="fh-small" style={{ marginTop: 6 }}>
          {village.text}. <Link href={village.href}>{village.link}</Link>
        </p>
        <VillageSecretLine status={village.status} isNetworkOn={village.link !== "Features"} />
      </section>
      <VersionLine />
    </>
  );

  return (
    <AdminSection title="Set up">
      <SettingsForm
        saved={saved}
        uploadedLogo={saved.logoUrl ? null : branding.logo}
        isMailOn={mail.isMailOn}
        serverPlan={PLANS.selfHost}
        managedBy={plan.managedSetupBy ? formatDayWord(plan.managedSetupBy) : null}
        aside={aside}
        beside={beside}
      />
    </AdminSection>
  );
});
