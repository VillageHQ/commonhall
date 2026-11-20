import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { adminManifest } from "@/modules/admin/manifest";
import { WaitingLinkRow } from "@/modules/members/components/waiting-link-row";
import { readWaitingInviteLinks } from "@/modules/members/service-invite-links";
import { requireAdmin } from "@/platform/auth/session";
import { PAGE_TITLES } from "@/platform/branding/page-metadata";
import { getDatabase } from "@/platform/database/client";
import { readResendConfig } from "@/platform/email/resend";
import { modulePage } from "@/platform/modules/module-page";
import { AdminSection } from "@/shell/admin-section";

export const metadata: Metadata = { title: PAGE_TITLES.adminLinks };

const MAIL_OFF_LINE = "Mail isn’t set up: copy each link and send it yourself.";
const MAIL_ON_LINE = "Links whose email failed. Copy one and send it yourself.";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "11 Nov": the day is enough here (a link lasts 14 days).
function formatMoment(date: Date) {
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

// Set up › Sign-in links: Commonhall's links page, for the invites a person can only get by hand.
export default modulePage(adminManifest, async function AdminLinksPage() {
  await requireAdmin();
  const isMailOn = readResendConfig(process.env) !== null;
  const links = await readWaitingInviteLinks(getDatabase(), { isMailOn });

  return (
    <AdminSection title="Members">
      <p className="fh-small mb-3">{isMailOn ? MAIL_ON_LINE : MAIL_OFF_LINE}</p>
      {links.length ? (
        <div className="fh-rows">
          {links.map(({ id, email, createdAt, expiresAt }) => (
            <WaitingLinkRow key={id} inviteId={id} email={email} detail={`Made ${formatMoment(createdAt)} · ends ${formatMoment(expiresAt)}`} />
          ))}
        </div>
      ) : (
        <EmptyState title="No links waiting" description="A link shows here when its email can’t go out." />
      )}
      {links.length ? (
        <p className="fh-small fh-muted" style={{ marginTop: 12 }}>
          A link signs in as that person. Copy makes a new one; the old one stops working.
        </p>
      ) : null}
    </AdminSection>
  );
});
