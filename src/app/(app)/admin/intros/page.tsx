import type { Metadata } from "next";
import Link from "next/link";

import { ButtonRow } from "@/components/ui/button";
import { ChipCount, ChipRow, CHIP_CLASSES } from "@/components/ui/chip";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { requireAdmin } from "@/platform/auth/session";
import { modulePage } from "@/platform/modules/module-page";

import { adminManifest } from "@/modules/admin/manifest";
import { parseConsolePeriod, readConsolePeriod } from "@/modules/admin/console-periods";
import { PeriodSwitch } from "@/modules/admin/components/period-switch";
import { IntroLogTable } from "@/modules/admin/components/intro-log-table";
import { IntroLogCsvButton } from "@/modules/admin/components/intro-log-controls";
import { countIntroLog, INTRO_LOG_FILTER_LABELS, INTRO_LOG_FILTERS, parseIntroLogFilter, readIntroLog, type IntroLogFilter } from "@/modules/admin/reads-intro-log";
import { AdminSection } from "@/shell/admin-section";

export const metadata: Metadata = { title: "Intro log" };

type SearchParams = Promise<{ period?: string; f?: string }>;

const FILTER_ORDER = Object.values(INTRO_LOG_FILTERS) as IntroLogFilter[];

// Commonhall's Intro log (a tab of Asks & intros): every intro asked in the period, its state and dates. Admins see
// who asked whom; never the note. The allowance and the outcome question's timing are set on Set up.
export default modulePage(adminManifest, async function AdminIntroLogPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const { period: periodValue, f } = await searchParams;
  const period = readConsolePeriod(parseConsolePeriod(periodValue));
  const filter = parseIntroLogFilter(f);
  const database = getDatabase();
  const rows = await readIntroLog(database, { from: period.from, to: period.to });
  const counts = countIntroLog(rows);
  const shown = filter === INTRO_LOG_FILTERS.all ? rows : rows.filter((row) => row.filter === filter);

  return (
    <AdminSection title="Asks & intros">
      <div className="fh-pagehead">
        <div className="fh-period">
          <PeriodSwitch basePath={ROUTES.adminIntroLog} current={period.param} extra={filter === INTRO_LOG_FILTERS.all ? "" : `&f=${filter}`} />
          <ButtonRow>
            <IntroLogCsvButton period={period.param} />
          </ButtonRow>
        </div>
      </div>
      <ChipRow role="group" aria-label="Filter by state">
        {FILTER_ORDER.map((key) => (
          <Link key={key} className={CHIP_CLASSES} href={`${ROUTES.adminIntroLog}?period=${period.param}&f=${key}`} aria-pressed={filter === key}>
            {INTRO_LOG_FILTER_LABELS[key]} <ChipCount>{counts[key]}</ChipCount>
          </Link>
        ))}
      </ChipRow>
      <IntroLogTable rows={shown} hasAny={rows.length > 0} />
    </AdminSection>
  );
});
