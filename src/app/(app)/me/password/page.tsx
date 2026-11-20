import type { Metadata } from "next";

import { BackLink } from "@/components/page-header";
import { requireMember } from "@/platform/auth/session";
import { hasPassword } from "@/platform/auth/password-setup";
import { getDatabase } from "@/platform/database/client";
import { readResendConfig } from "@/platform/email/resend";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";
import { PasswordCard } from "@/modules/members/components/password-card";
import { membersManifest } from "@/modules/members/manifest";

export const metadata: Metadata = { title: "How you sign in" };

// My profile › How you sign in: the emailed link, and a password to add.
export default modulePage(membersManifest, async function PasswordPage() {
  const member = await requireMember();
  const memberHasPassword = await hasPassword(getDatabase(), member.id);
  return (
    <>
      <BackLink href={ROUTES.editCard}>My profile</BackLink>
      <div className="max-w-[720px] fh-section">
        <PasswordCard hasPassword={memberHasPassword} isLinkOn={readResendConfig(process.env) !== null} />
      </div>
    </>
  );
});
