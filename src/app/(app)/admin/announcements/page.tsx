import type { Metadata } from "next";

import { PageHeader } from "@/components/page-header";
import { requireAdmin } from "@/platform/auth/session";
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

export const metadata: Metadata = { title: "Announcements" };

function describeAudience({ audience, cohort }: SentAnnouncement) {
  return audience === ANNOUNCEMENT_AUDIENCES.cohort ? `Cohort: ${cohort}` : "Everyone";
}

function SentList({ sent }: { sent: readonly SentAnnouncement[] }) {
  if (sent.length === 0) return <p className="fh-hint">Nothing sent yet. What you send shows here, with who got it and how many emails went out.</p>;
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

// Admin › Announcements (under Asks & updates): tell the community something by email, and pin it in the feed.
export default modulePage(adminManifest, async function AdminAnnouncementsPage() {
  const admin = await requireAdmin();
  const database = getDatabase();
  const [members, sent, branding, isFeedOn] = await Promise.all([
    readAnnouncementMembers(database),
    readSentAnnouncements(database),
    readBranding(database),
    isModuleEnabled(database, feedManifest),
  ]);
  return (
    <>
      <PageHeader title="Announcements" description={`Tell the whole community, or one cohort, something from the ${branding.name} team. One email each, and a pinned post in the feed.`} />
      <AnnouncementComposer
        members={members.map(({ id, name, company, cohort, isWanted }) => ({ id, name, company, cohort, isWanted }))}
        cohorts={readCohortChoices(members)}
        community={branding.name}
        adminId={admin.id}
        isEmailOn={readResendConfig(process.env) !== null}
        isFeedOn={isFeedOn}
      />
      <section className="mt-8" aria-labelledby="sent-heading">
        <h2 id="sent-heading" className="fh-h2 mb-3">
          Sent
        </h2>
        <SentList sent={sent} />
      </section>
    </>
  );
});
