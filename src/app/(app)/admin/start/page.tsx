import type { Metadata } from "next";

import { StepPills } from "@/components/step-pills";
import { requireAdmin } from "@/platform/auth/session";
import { readBranding } from "@/platform/branding/branding";
import { getDatabase, type Database } from "@/platform/database/client";
import { readResendConfig } from "@/platform/email/resend";
import { modulePage } from "@/platform/modules/module-page";
import type { SessionMember } from "@/platform/http/request-context";
import { InviteSheet } from "@/modules/admin/components/invite-sheet";
import { adminManifest } from "@/modules/admin/manifest";
import { readInviterSignature, readIsFillInOffered } from "@/modules/admin/reads-members";
import { AvatarField } from "@/modules/members/components/avatar-field";
import { ImportMembersForm } from "@/modules/members/components/import-members-form";
import { readFillInSettings } from "@/modules/members/service-fill-in";
import { readAvatarUrl, readMemberProfile } from "@/modules/members/service-profile";
import { networkManifest } from "@/modules/network/manifest";
import { readEnabledIds } from "@/shell/enabled-modules";
import { GUIDED_STEP_ORDER, GUIDED_STEP_PARAM, GUIDED_STEP_TITLES, GUIDED_STEPS, resolveGuidedStep, type GuidedStepKey } from "@/shell/guided-start";

import { FinishGuidedStart, GuidedCardForm, NextStepLink } from "./guided-parts";

export const metadata: Metadata = { title: "Get started" };

// One line per step: what it does for the organizer.
const STEP_LINES: Record<GuidedStepKey, string> = {
  invite: "Paste their emails: each founder gets a one-tap sign-in link.",
  card: "Founders see your card in People and on your intros.",
};

// The member welcome an organizer never gets otherwise: their photo and their card's words. The last step: saving it
// finishes the guided start.
async function CardContent({ database, admin }: { database: Database; admin: SessionMember & { name: string } }) {
  const [community, profile, avatarUrl] = await Promise.all([readBranding(database), readMemberProfile(database, admin.id), readAvatarUrl(database, admin.id)]);
  return (
    <>
      <p className="fh-h3 mb-2">Welcome to {community.name}</p>
      <AvatarField memberId={admin.id} name={admin.name} avatarUrl={avatarUrl} />
      <GuidedCardForm
        initialValues={{
          name: admin.name === admin.email.split("@")[0] ? "" : admin.name,
          workingOn: profile?.bio ?? "",
          canHelpWith: profile?.canHelpWith ?? "",
          role: profile?.title ?? "",
          company: profile?.company ?? "",
          city: profile?.location ?? "",
        }}
      />
    </>
  );
}

// The first step: one box and one button ("Create invite links" with mail off, "Send invites" with it on), then a
// Copy per founder.
async function InviteContent({ database, admin, nextHref }: { database: Database; admin: SessionMember; nextHref: string }) {
  const [branding, signature, fillIn, enabledIds] = await Promise.all([readBranding(database), readInviterSignature(database, admin.id), readFillInSettings(database), readEnabledIds(database)]);
  const isEmailOn = readResendConfig(process.env) !== null;
  const isFillInShown = await readIsFillInOffered(database, enabledIds.has(networkManifest.id));
  return (
    <>
      <InviteSheet
        community={branding.name}
        inviterName={signature.name}
        inviterRole={signature.role}
        isEmailOn={isEmailOn}
        isFillInShown={isFillInShown}
        isNetworkSearchOn={isFillInShown}
        savedBasis={fillIn.basis}
        savedTermsDate={fillIn.termsDate}
      />
      <details className="mt-4">
        <summary className="fh-h3 cursor-pointer">Or upload a CSV</summary>
        <div className="mt-3">
          <ImportMembersForm communityBasis={fillIn.basis} communityTermsDate={fillIn.termsDate} today={new Date().toISOString().slice(0, 10)} isCompact />
        </div>
      </details>
      <div className="fh-btn-row mt-4">
        <NextStepLink href={nextHref} />
      </div>
    </>
  );
}

// The guided start: a new admin's steps, one screen each (src/shell/guided-start.ts). Sign-ins land here until it is
// finished or skipped; the console's checklist links back to it.
export default modulePage(adminManifest, async function GuidedStartPage({ searchParams }: { searchParams?: Promise<Record<string, string | undefined>> } = {}) {
  const admin = await requireAdmin();
  const database = getDatabase();
  const query = (await searchParams) ?? {};
  const { step, nextHref } = resolveGuidedStep(GUIDED_STEP_ORDER, query[GUIDED_STEP_PARAM]);

  return (
    <div className="fh-narrow">
      <div className="flex items-start justify-between gap-3">
        <StepPills label="Guided start" steps={GUIDED_STEP_ORDER.map((key) => ({ id: key, label: GUIDED_STEP_TITLES[key] }))} current={step} />
        <FinishGuidedStart label="Skip the guided start" variant="link" />
      </div>
      <h1 className="fh-h1">{GUIDED_STEP_TITLES[step]}</h1>
      <p className="fh-lede mb-4">{STEP_LINES[step]}</p>
      {step === GUIDED_STEPS.invite && nextHref ? <InviteContent database={database} admin={admin} nextHref={nextHref} /> : null}
      {step === GUIDED_STEPS.card ? <CardContent database={database} admin={admin} /> : null}
    </div>
  );
});
