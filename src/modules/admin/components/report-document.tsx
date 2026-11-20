import { LogoTile } from "@/components/logo-tile";
import { Ledger } from "@/components/ui/figures";
import { Note } from "@/components/ui/note";

import { formatDayMonth } from "../console-periods";
import { hoursWord, NO_ANSWER_DAYS, readConnectorRows, RESULT_ROWS, type BreakdownRow, type ReportStats } from "../report-stats";

// The page's foot. The partner email and the CSV keep the full words (REPORT_FOOT).
const REPORT_FOOT_SHORT = "Names, states and dates only; notes stay private.";

const percentOf = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : undefined);
const barOf = (part: number, whole: number) => (part / Math.max(whole, 1)) * 100;

type Column = { label: string; key: "asked" | "yes" | "made" | "declined" | "noAnswer" | "open" };

const CONNECTOR_COLUMNS: Column[] = [
  { label: "Asked", key: "asked" },
  { label: "Yes", key: "yes" },
  { label: "Introduced", key: "made" },
];
const BREAKDOWN_COLUMNS: Column[] = [
  { label: "Asked", key: "asked" },
  { label: "Made", key: "made" },
  { label: "Declined", key: "declined" },
  { label: "No answer", key: "noAnswer" },
  { label: "Open", key: "open" },
];

function Table({ first, columns, rows }: { first: string; columns: Column[]; rows: readonly BreakdownRow[] }) {
  return (
    <table className="fh-tbl">
      <thead>
        <tr>
          <th>{first}</th>
          {columns.map(({ label }) => (
            <th key={label} className="fh-n">
              {label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.name}>
            <td>
              <span className="fh-serif">{row.name}</span>
              {row.isCredited === false ? <small className="fh-muted block">not credited</small> : null}
            </td>
            {columns.map(({ key }) => (
              <td key={key} className="fh-n">
                {row[key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type BreakdownProps = { title: string; first: string; columns: Column[]; rows: readonly BreakdownRow[]; empty?: string };

const isAllZero = (row: BreakdownRow, columns: Column[]) => columns.every(({ key }) => !row[key]);

// Rows that are all zero are left out. A breakdown left with one row says nothing (every intro in one place), so it
// is left out too, unless it is the only row there is; with none it says its empty line.
function Breakdown({ title, first, columns, rows, empty }: BreakdownProps) {
  const shown = rows.filter((row) => !isAllZero(row, columns));
  if (shown.length === 0 && !empty) return null;
  if (shown.length === 1 && rows.length > 1) return null;
  return (
    <div>
      <h2>{title}</h2>
      {shown.length > 0 ? <Table first={first} columns={columns} rows={shown} /> : <p className="fh-small fh-muted">{empty}</p>}
    </div>
  );
}

function Outcomes({ report }: { report: ReportStats }) {
  const { intros: stats } = report;
  // Results at zero are left out.
  const rows: { label: string; note: string | null; value: string }[] = [
    ...Object.entries(RESULT_ROWS)
      .map(([key, label]) => ({ label, count: stats.results[key as keyof typeof stats.results] }))
      .filter(({ count }) => count > 0)
      .map(({ label, count }) => ({ label, note: null, value: String(count) })),
    ...(stats.pending ? [{ label: "Not asked yet", note: null, value: String(stats.pending) }] : []),
  ];
  if (rows.length === 0) return null;
  return (
    <section className="fh-outcomes" aria-labelledby="outcomes-h">
      <div className="fh-ohead">
        <h2 id="outcomes-h">What came of the intros</h2>
      </div>
      {rows.map(({ label, note, value }) => (
        <div key={label} className="fh-orow">
          <span>
            {label}
            {note ? <small>{note}</small> : null}
          </span>
          <b>{value}</b>
        </div>
      ))}
    </section>
  );
}

function AsksAndUpdates({ asks }: { asks: NonNullable<ReportStats["asks"]> }) {
  return (
    <>
      <h2>Asks &amp; updates</h2>
      <div className="fh-kv">
        <div>
          <b>{asks.posted}</b>
          <span>asks posted</span>
        </div>
        <div className="fh-good">
          <b>{asks.answered}</b>
          <span>answered</span>
        </div>
        <div>
          <b>{asks.open}</b>
          <span>still open</span>
        </div>
        <div>
          <b>{hoursWord(asks.medianHours)}</b>
          <span>median time to first help</span>
        </div>
      </div>
    </>
  );
}

type ReportDocumentProps = { report: ReportStats; preparedBy: string; logo: Parameters<typeof LogoTile>[0]["logo"]; now?: Date };

// Commonhall's partner report (crop report-document.png): a printable paper document with an Ink rule on top.
export function ReportDocument({ report, preparedBy, logo, now = new Date() }: ReportDocumentProps) {
  const { intros: stats, asks, period } = report;
  return (
    <article className="fh-report">
      <div className="fh-report-brand">
        <LogoTile name={report.communityName} logo={logo} sizePx={28} className="ml-0 text-[11px]" />
        <b>{report.communityName}</b>
        <span>
          Partner report
          <br />
          {period.range}
        </span>
      </div>
      {/* The verdict first: the one line for the partner meeting (the email's subject is the report's title). */}
      <h1 className="fh-h2" data-testid="report-verdict">
        {report.summary}
      </h1>
      <p className="fh-by">
        Prepared by {preparedBy} · {formatDayMonth(now)}
      </p>
      <div className="fh-kv" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div>
          <b>{stats.asked}</b>
          <span>intros asked for</span>
        </div>
        <div className="fh-good">
          <b>{stats.made}</b>
          <span>introduced, both said yes</span>
        </div>
        <div className="fh-good">
          <b>{stats.answered ? stats.helpful : "–"}</b>
          <span>found it helpful</span>
        </div>
      </div>
      <Outcomes report={report} />
      <h2>Every step, counted</h2>
      <Ledger
        rows={[
          { label: "Asked for an intro", value: stats.asked, percent: barOf(stats.asked, stats.asked) },
          { label: "Connector said yes", value: stats.connectorYes, share: percentOf(stats.connectorYes, stats.asked), percent: barOf(stats.connectorYes, stats.asked), tone: "yes" as const },
          { label: <b>Introduced</b>, value: stats.made, percent: barOf(stats.made, stats.asked), tone: "made" as const, hasBookmark: true },
          { label: "Declined", value: stats.declined, percent: barOf(stats.declined, stats.asked), tone: "declined" as const },
          { label: `No answer in ${NO_ANSWER_DAYS} days`, value: stats.noAnswer, percent: barOf(stats.noAnswer, stats.asked), tone: "declined" as const },
          { label: "Withdrawn", value: stats.withdrawn, percent: barOf(stats.withdrawn, stats.asked), tone: "declined" as const },
          { label: "Still open", value: stats.open, percent: barOf(stats.open, stats.asked), tone: "open" as const },
        ].filter(({ value }) => value > 0)}
      />
      <div className="fh-two">
        <div>
          {/* The admin's view names every connector (the owner's decision); the printed copy, the CSV and the partner
              email name only those who turned on "Credit me in reports". */}
          <div className="fh-no-print">
            <Breakdown title="Top connectors" first="Member" columns={CONNECTOR_COLUMNS} rows={readConnectorRows(stats, { everyone: true })} empty="No connectors yet." />
            <p className="fh-small fh-muted mt-2">Partners see only those who turned on “Credit me in reports”.</p>
          </div>
          <div className="fh-print-only">
            <Breakdown title="Top connectors" first="Member" columns={CONNECTOR_COLUMNS} rows={readConnectorRows(stats)} empty="No connectors yet." />
          </div>
        </div>
        <Breakdown title="By sector" first="Sector" columns={BREAKDOWN_COLUMNS} rows={stats.sectors} empty="No sectors yet." />
      </div>
      <div className="fh-two" id="breakdown">
        <Breakdown title="By what the founder needed" first="Need" columns={BREAKDOWN_COLUMNS} rows={stats.needs} />
        <Breakdown title="By cohort" first="Cohort" columns={BREAKDOWN_COLUMNS} rows={stats.cohorts} empty="No intros yet." />
      </div>
      {stats.asked ? null : <Note className="mt-4">No intros in this period yet.</Note>}
      {asks ? <AsksAndUpdates asks={asks} /> : null}
      <p className="fh-foot">{REPORT_FOOT_SHORT}</p>
    </article>
  );
}
