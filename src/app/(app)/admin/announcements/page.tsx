import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FlashNote } from "@/components/flash";
import { isAdminMember } from "@/platform/auth/roles";
import { requireMember } from "@/platform/auth/session";
import { readBranding } from "@/platform/branding/branding";
import { getDatabase } from "@/platform/database/client";
import { readResendConfig } from "@/platform/email/resend";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { modulePage } from "@/platform/modules/module-page";
import { formatDayMonthTimeUtc } from "@/platform/text/format-date";

import { ANNOUNCEMENT_AUDIENCES } from "@/modules/admin/contract-announcements";
import { AnnouncementComposer } from "@/modules/admin/components/announcement-composer";
import { adminManifest } from "@/modules/admin/manifest";
import { readAnnouncementMembers, readCohortChoices, readSentAnnouncements, type SentAnnouncement } from "@/modules/admin/reads-announcements";
import { feedManifest } from "@/modules/feed/manifest";
import { ROUTES } from "@/platform/http/routes";
import { AdminSection } from "@/shell/admin-section";
import { DigestMailText } from "@/shell/digest-mail-text";
import { previewMemberDigest } from "@/shell/weekly-email";
import { WeeklyEmailScheduleForm } from "@/shell/weekly-email-schedule-form";
import { SCHEDULE_SAVED_FLASH } from "@/shell/weekly-email-rules";
import { readWeeklyEmailPlan } from "@/shell/weekly-email-settings";
import Link from "next/link";

export const metadata: Metadata = { title: "Announcements" };

const SENT_AUDIENCE_LABELS: Record<string, string> = {
  [ANNOUNCEMENT_AUDIENCES.everyone]: "Everyone",
  [ANNOUNCEMENT_AUDIENCES.founders]: "Founders",
  [ANNOUNCEMENT_AUDIENCES.experts]: "Mentors and experts",
};

function describeAudience({ audience, cohort }: SentAnnouncement) {
  return audience === ANNOUNCEMENT_AUDIENCES.cohort ? `Cohort: ${cohort}` : (SENT_AUDIENCE_LABELS[audience] ?? "Everyone");
}

function SentList({ sent }: { sent: readonly SentAnnouncement[] }) {
  if (sent.length === 0) return <p className="fh-hint">Nothing sent yet.</p>;
  return (
    <table className="fh-tbl">
      <thead>
        <tr>
          <th scope="col">Subject</th>
          <th scope="col">Audience</th>
          <th scope="col">Sent</th>
          <th scope="col" className="fh-n">
            Emails
          </th>
        </tr>
      </thead>
      <tbody>
        {sent.map((row) => (
          <tr key={row.id}>
            <td>
              <span className="fh-serif">{row.subject}</span>
              {row.isPosted ? <span className="fh-muted"> · pinned in the feed</span> : null}
            </td>
            <td>{describeAudience(row)}</td>
            <td>
              {formatDayMonthTimeUtc(row.sentAt)}
              <span className="fh-muted"> · {row.sentByName}</span>
            </td>
            <td className="fh-n">{row.queuedCount}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

type AnnouncementsPageProps = { searchParams?: Promise<{ m?: string }> };

// The weekly email on Announce: when it goes out, its schedule behind "Change the schedule", and this week's email as
// the admin gets it (any member's on the Weekly email tab).
async function WeeklyEmailSheet({ admin }: { admin: Awaited<ReturnType<typeof requireMember>> }) {
  const database = getDatabase();
  const [plan, preview] = await Promise.all([readWeeklyEmailPlan(database), previewMemberDigest(database, process.env, admin, admin.id)]);
  return (
    <section className="fh-sheet mt-6" aria-labelledby="weekly-heading" data-testid="announce-weekly-email">
      <div className="fh-sheet-head">
        <h2 id="weekly-heading" className="fh-h3">
          Weekly email
        </h2>
        <Link href={ROUTES.adminDigest}>Preview for anyone</Link>
      </div>
      <p className="fh-small">{plan.nextLabel ? <>Next: {plan.nextLabel}.</> : <b>Off.</b>}</p>
      <details className="mt-2">
        <summary className="cursor-pointer fh-small">Change the schedule</summary>
        <WeeklyEmailScheduleForm isEnabled={plan.isEnabled} schedule={plan.schedule} />
      </details>
      {preview ? (
        <div className="mt-3" data-testid="announce-weekly-preview">
          <div className="fh-mail">
            <div className="fh-mail-h">
              <div className="fh-subj">{preview.subject}</div>
            </div>
            <div className="fh-mail-b">
              <DigestMailText text={preview.text} />
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

// Announce: tell the community something by email (and pin it in the feed), see what went out, and the weekly email.
export default modulePage(adminManifest, async function AdminAnnouncementsPage({ searchParams }: AnnouncementsPageProps = {}) {
  // Only admins: a member gets a real 404, not a redirect that hints the page exists.
  const admin = await requireMember();
  if (!isAdminMember(admin)) notFound();
  const { m } = (await searchParams) ?? {};
  const database = getDatabase();
  const [members, sent, branding, isFeedOn] = await Promise.all([
    readAnnouncementMembers(database),
    readSentAnnouncements(database),
    readBranding(database),
    isModuleEnabled(database, feedManifest),
  ]);
  return (
    <>
      {m === SCHEDULE_SAVED_FLASH ? <FlashNote>Saved.</FlashNote> : null}
      <AdminSection title="Announce">
        <AnnouncementComposer
          members={members.map(({ id, name, company, cohort, communityRole, isWanted }) => ({ id, name, company, cohort, communityRole, isWanted }))}
          cohorts={readCohortChoices(members)}
          community={branding.name}
          adminId={admin.id}
          isEmailOn={readResendConfig(process.env) !== null}
          isFeedOn={isFeedOn}
        />
        <WeeklyEmailSheet admin={admin} />
        <section className="mt-8" aria-labelledby="sent-heading">
          <h2 id="sent-heading" className="fh-h2 mb-3">
            Sent
          </h2>
          <SentList sent={sent} />
        </section>
      </AdminSection>
    </>
  );
});
