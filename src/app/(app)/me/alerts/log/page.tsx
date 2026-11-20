import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { BackLink } from "@/components/page-header";
import { membersManifest } from "@/modules/members/manifest";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";
import { ALERT_LOG_STATUSES, isAlertLogOn, readAlertLog } from "@/platform/notifications/log";

export const metadata: Metadata = { title: "Alert log" };

const REASON_WORDS: Record<string, string> = { off: "alerts off", kind_off: "this kind off", quiet_hours: "quiet hours", muted: "muted" };

function formatMoment(date: Date) {
  return date.toISOString().slice(0, 16).replace("T", " ") + " UTC";
}

// Alerts › Log, for checking only: the member's last 20 alerts, sent or skipped and why. Demo mode and development
// only (platform/notifications/log.ts); a 404 everywhere else.
export default modulePage(membersManifest, async function AlertLogPage() {
  if (!isAlertLogOn(process.env)) notFound();
  const member = await requireMember();
  const entries = await readAlertLog(getDatabase(), member.id);
  return (
    <>
      <BackLink href={ROUTES.alerts}>Alerts</BackLink>
      <header data-slot="page-header" className="fh-pagehead">
        <h1 className="fh-h1">Alert log</h1>
        <p className="fh-lede">Your last 20 alerts. Demo and development only.</p>
      </header>
      {entries.length ? (
        <div className="fh-rows max-w-[720px]" data-testid="alert-log">
          {entries.map((entry) => (
            <div key={entry.id} className="fh-logrow" data-status={entry.status} data-kind={entry.kind}>
              <div className="fh-m-line">
                <b>{entry.title}</b>
                <span className="fh-small fh-muted block">
                  {entry.kind} · {entry.url}
                </span>
              </div>
              <div className="fh-small text-right">
                {entry.status === ALERT_LOG_STATUSES.sent ? "Sent" : `Skipped: ${REASON_WORDS[entry.reason ?? ""] ?? entry.reason}`}
                <span className="fh-muted block">{formatMoment(entry.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState title="No alerts yet" description="Alerts sent to you show here." />
      )}
    </>
  );
});
