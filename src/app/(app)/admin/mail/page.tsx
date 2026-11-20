import type { Metadata } from "next";

import { AdvancedSection } from "@/components/advanced-section";
import { SelfHostBox } from "@/components/plumbing-notes";
import { StatusChecklist } from "@/components/ui/figures";
import { Pill, type PillTone } from "@/components/ui/pill";
import { requireAdmin } from "@/platform/auth/session";
import { PAGE_TITLES } from "@/platform/branding/page-metadata";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";
import { PLANS, readPlanSettings } from "@/platform/settings/plan";
import { formatDayMonth, formatDayMonthTimeUtc } from "@/platform/text/format-date";
import { DoNotSendRemove } from "@/modules/admin/components/do-not-send-remove";
import { CheckDnsButton, MailDnsSettings, SendTestButton } from "@/modules/admin/components/mail-forms";
import { readDnsCheckLine, readMailPageChecks, type MailPageCheck } from "@/modules/admin/mail-checks";
import { adminManifest } from "@/modules/admin/manifest";
import { MAIL_LOG_STATES, readMailOverview, type MailLogState, type MailOverview } from "@/modules/admin/reads-mail";
import { PRICING_URL } from "@/modules/network/components/admin-village-sections";
import { AdminSection } from "@/shell/admin-section";

export const metadata: Metadata = { title: PAGE_TITLES.adminMail };

const LOG_PILLS: Record<MailLogState, PillTone> = {
  [MAIL_LOG_STATES.sent]: "neutral",
  [MAIL_LOG_STATES.failed]: "needs",
  [MAIL_LOG_STATES.notSent]: "declined",
  [MAIL_LOG_STATES.waiting]: "open",
};

const SUPPRESSION_REASONS: Record<string, string> = { bounced: "Bounced", complained: "Marked as spam" };

// A ruled row with no avatar column: the subject (or address) over a 13 px line, a pill or button on the right.
const PLAIN_ROW = { gridTemplateColumns: "minmax(0,1fr) auto" };

function DnsLineValue({ value, toAdd }: Pick<MailPageCheck, "value" | "toAdd">) {
  return (
    <>
      {value}
      {toAdd ? (
        <span className="fh-mono mt-1 block">
          Add: {toAdd.type} {toAdd.name} {toAdd.value}
        </span>
      ) : null}
    </>
  );
}

// The one status line in view: on the managed plan Village handles mail; otherwise whether the mail service is set.
function MailStatus({ mail, isManaged }: { mail: MailOverview; isManaged: boolean }) {
  return (
    <section className="fh-sheet" aria-label="Mail status">
      <p className="fh-small" style={{ marginTop: 0 }}>
        {isManaged ? (
          <>
            <b>✓ Handled by Village</b> — invites send from <b className="wrap-anywhere">{mail.senderEmail}</b>
          </>
        ) : (
          <>
            Mail service: <b>{mail.isMailOn ? "connected" : "not set"}</b>, sending from <b className="wrap-anywhere">{mail.senderEmail}</b>
            {mail.isMailOn ? null : ". Until it is set, invite and sign-in links wait on Sign-in links."}
          </>
        )}
      </p>
      <div style={{ marginTop: 12 }}>
        <SendTestButton />
      </div>
    </section>
  );
}

function DnsChecklist({ mail }: { mail: MailOverview }) {
  const checks = readMailPageChecks({ mailService: mail.mailService, inbound: mail.inbound, dnsCheck: mail.settings.dnsCheck });
  return (
    <section className="fh-sheet">
      <div className="fh-sheet-head" style={{ alignItems: "center" }}>
        <h2 className="fh-h3">DNS checklist</h2>
        <CheckDnsButton />
      </div>
      <p className="fh-small fh-muted">{readDnsCheckLine(mail.settings.dnsCheck)}</p>
      <div style={{ marginTop: 8 }}>
        <StatusChecklist items={checks.map(({ key, state, label, value, note, toAdd }) => ({ key, state, title: label, value: <DnsLineValue value={value} toAdd={toAdd} />, status: note }))} />
      </div>
    </section>
  );
}

function LastThirtyDays({ counts }: { counts: MailOverview["lastThirtyDays"] }) {
  return (
    <section className="fh-sheet">
      <h2 className="fh-h3">Last 30 days</h2>
      <p className="fh-small" style={{ marginTop: 6 }}>
        <b>{counts.sent}</b> sent · <b>{counts.failed}</b> failed · <b>{counts.notSent}</b> not sent (on a do-not-send list) · <b>{counts.repliesIn}</b> replies in
      </p>
    </section>
  );
}

// Community's do-not-send list holds addresses that bounced or marked an email as spam; an admin can take one off.
function DoNotSendList({ entries }: { entries: MailOverview["suppressions"] }) {
  return (
    <section className="fh-sheet">
      <h2 className="fh-h3">Do-not-send list</h2>
      {entries.length === 0 ? (
        <p className="fh-small fh-muted" style={{ marginTop: 6 }}>
          Nobody yet. Addresses that bounce or mark an email as spam land here.
        </p>
      ) : (
        <div className="fh-rows" style={{ marginTop: 10 }} aria-label="Do-not-send list">
          {entries.map(({ email, reason, createdAt }) => (
            <div key={email} className="fh-r" style={PLAIN_ROW}>
              <span className="fh-who">
                <b className="fh-plain wrap-anywhere">{email}</b>
                <span>
                  {SUPPRESSION_REASONS[reason] ?? reason} · since {formatDayMonth(createdAt)}
                </span>
              </span>
              <span className="fh-end">
                <DoNotSendRemove email={email} />
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function SendingLog({ mail }: { mail: MailOverview }) {
  return (
    <section className="fh-sheet fh-c12" id="log">
      <h2 className="fh-h3">Sending log</h2>
      {mail.log.length === 0 ? (
        <p className="fh-small fh-muted" style={{ marginTop: 6 }}>
          Nothing sent yet.
        </p>
      ) : (
        <div className="fh-rows" style={{ marginTop: 12 }} aria-label="Sending log">
          {mail.log.map(({ id, subject, toEmail, kind, state, at }) => (
            <div key={id} className="fh-r" style={PLAIN_ROW}>
              <span className="fh-who">
                <b className="fh-plain">{subject}</b>
                <span>
                  to {toEmail} from {mail.senderEmail} · {kind.replace(/^email_/, "")}
                </span>
              </span>
              <span className="fh-end">
                <Pill tone={LOG_PILLS[state]}>{state}</Pill>
                <small>{formatDayMonthTimeUtc(at)}</small>
              </span>
            </div>
          ))}
        </div>
      )}
      <p className="fh-small fh-muted" style={{ marginTop: 12 }}>
        Subjects and addresses only; message text is never kept in the log.
      </p>
    </section>
  );
}

// Set up › Mail (Commonhall's mailPage). In view: one status line with a test, and the mail checks (the DNS checklist
// with Check DNS now, kept in view by the owner's pick). Under Advanced: the DNS settings, the last 30 days, the
// do-not-send list, the sending log and "Running it yourself". Community sends every kind of email from one address.
export default modulePage(adminManifest, async function AdminMailPage() {
  await requireAdmin();
  const database = getDatabase();
  const [mail, plan] = await Promise.all([readMailOverview(database, process.env), readPlanSettings(database)]);
  return (
    <AdminSection title="Mail" back={{ href: ROUTES.adminSettings, label: "Set up" }}>
      <div className="fh-grid">
        <div className="fh-c7 fh-stack">
          <MailStatus mail={mail} isManaged={plan.plan === PLANS.managed} />
          <DnsChecklist mail={mail} />
        </div>
        <AdvancedSection summary="DNS settings, the last 30 days, the do-not-send list, the sending log and running it yourself.">
          <div className="fh-grid">
            <div className="fh-c7 fh-stack">
              <MailDnsSettings saved={{ dkimSelector: mail.settings.dkimSelector, replyDomain: mail.settings.replyDomain }} defaultReplyDomain={mail.defaultReplyDomain} />
              <LastThirtyDays counts={mail.lastThirtyDays} />
              <DoNotSendList entries={mail.suppressions} />
            </div>
            <div className="fh-c5 fh-stack">
              <SelfHostBox pricingUrl={PRICING_URL} />
              <p className="fh-small fh-muted">
                Replies come back through <span className="fh-mono wrap-anywhere">{mail.replyDomain}</span>. Every kind of email goes out from {mail.senderEmail}.
              </p>
            </div>
            <SendingLog mail={mail} />
          </div>
        </AdvancedSection>
      </div>
    </AdminSection>
  );
});
