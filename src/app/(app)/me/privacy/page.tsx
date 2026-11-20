import type { Metadata } from "next";

import { BackLink } from "@/components/page-header";
import { readBrandingForPage } from "@/platform/branding/branding";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { modulePage } from "@/platform/modules/module-page";
import { MESSAGE_POLICIES } from "@/modules/members/contract-privacy";
import { PrivacySheet } from "@/modules/members/components/privacy-sheet";
import { membersManifest } from "@/modules/members/manifest";
import { readCommunityMessagePolicy, readPrivacy } from "@/modules/members/service-privacy";
import { introsManifest } from "@/modules/intros/manifest";
import { messagesManifest } from "@/modules/messages/manifest";

export const metadata: Metadata = { title: "Privacy" };

// My profile › Privacy: who sees me in People, intro asks, and who can message me.
export default modulePage(membersManifest, async function PrivacyPage() {
  const member = await requireMember();
  const database = getDatabase();
  const [community, privacy, communityPolicy, isIntrosOn, isMessagesOn] = await Promise.all([
    readBrandingForPage(),
    readPrivacy(database, member.id),
    readCommunityMessagePolicy(database),
    isModuleEnabled(database, introsManifest),
    isModuleEnabled(database, messagesManifest),
  ]);
  return (
    <>
      <BackLink href={ROUTES.editCard}>My profile</BackLink>
      <header data-slot="page-header" className="fh-pagehead">
        <h1 className="fh-h1">Privacy</h1>
        <p className="fh-lede">Admins can’t read your messages here.</p>
      </header>
      <div className="max-w-[720px]">
        <PrivacySheet
          communityName={community.name}
          isHidden={privacy.isHidden}
          acceptsIntroAsks={isIntrosOn ? privacy.acceptsIntroAsks !== false : null}
          // Two choices: a stored "community default" reads as the community's policy today.
          messagePolicy={isMessagesOn ? (privacy.messagePolicy === MESSAGE_POLICIES.communityDefault ? communityPolicy : privacy.messagePolicy) : null}
        />
      </div>
    </>
  );
});
