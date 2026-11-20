import type { Metadata } from "next";

import { FlashNote } from "@/components/flash";
import { adminManifest } from "@/modules/admin/manifest";
import { requireAdmin } from "@/platform/auth/session";
import { readBranding } from "@/platform/branding/branding";
import { getDatabase } from "@/platform/database/client";
import { readResendConfig } from "@/platform/email/resend";
import { modulePage } from "@/platform/modules/module-page";
import { AdminSection } from "@/shell/admin-section";
import { DigestMailText } from "@/shell/digest-mail-text";
import { DigestMemberPicker, DigestTestButton } from "@/shell/digest-preview-parts";
import { previewMemberDigest, readDigestMembers, SAMPLE_PREVIEW, TEST_SEND_OUTCOMES } from "@/shell/weekly-email";

export const metadata: Metadata = { title: "Weekly email" };

const FLASHES: Record<string, { text: string; isOk: boolean }> = {
  digesttest: { text: "Test sent to you.", isOk: true },
  [TEST_SEND_OUTCOMES.emailOff]: { text: "Mail isn't set up, so no test was sent.", isOk: false },
  [TEST_SEND_OUTCOMES.refused]: { text: "The mail service refused the test. Check the sending address in Set up.", isOk: false },
  [TEST_SEND_OUTCOMES.switchedOff]: { text: "Your own weekly email is off (Email settings), so no test was sent.", isOk: false },
};

type DigestPageProps = { searchParams: Promise<{ member?: string; m?: string }> };

// The fund's own address in From: "Northwind Founders <hello@…>".
function readFrom(community: string, fromAddress: string | null) {
  if (!fromAddress) return community;
  return fromAddress.includes("<") ? fromAddress : `${community} <${fromAddress}>`;
}

// Announce › Weekly email (Commonhall's /admin/digest): the email as it goes out, for any member, and a test send.
export default modulePage(adminManifest, async function AdminDigestPage({ searchParams }: DigestPageProps) {
  const admin = await requireAdmin();
  const { member, m } = await searchParams;
  const database = getDatabase();
  const [members, branding] = await Promise.all([readDigestMembers(database), readBranding(database)]);
  const requested = member && (member === SAMPLE_PREVIEW || members.some(({ id }) => id === member)) ? member : admin.id;
  const preview = (await previewMemberDigest(database, process.env, admin, requested)) ?? (await previewMemberDigest(database, process.env, admin, admin.id));
  const from = readFrom(branding.name, readResendConfig(process.env)?.fromAddress ?? null);
  const flash = m ? FLASHES[m] : undefined;
  const choices = [...members.map(({ id, name }) => ({ id, label: name })), { id: SAMPLE_PREVIEW, label: "A made-up member" }];

  return (
    <>
      {flash ? <FlashNote kind={flash.isOk ? "ok" : "needs"}>{flash.text}</FlashNote> : null}
      <AdminSection title="Announce">
      <div className="fh-flow">
        <div>
          <DigestMemberPicker members={choices} selected={requested} />
          {preview ? (
            <div className="fh-mail mt-3.5">
              <div className="fh-mail-h">
                <div>
                  <span className="fh-k">From</span>
                  <span className="fh-v">{from}</span>
                </div>
                <div>
                  <span className="fh-k">To</span>
                  <span className="fh-v">{preview.recipientName}</span>
                </div>
                <div className="fh-subj">{preview.subject}</div>
              </div>
              <div className="fh-mail-b">
                <DigestMailText text={preview.text} />
              </div>
            </div>
          ) : null}
        </div>
        <aside>
          <section className="fh-sheet">
            <h2 className="fh-h3">Send me a test</h2>
            <p className="fh-small mt-1.5">To {admin.email}, with your own items.</p>
            <DigestTestButton />
          </section>
        </aside>
      </div>
      </AdminSection>
    </>
  );
});
