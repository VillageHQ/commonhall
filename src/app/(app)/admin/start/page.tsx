import type { Metadata } from "next";
import Link from "next/link";

import { StepPills } from "@/components/step-pills";
import { Note } from "@/components/ui/note";
import { requireAdmin } from "@/platform/auth/session";
import { readBranding } from "@/platform/branding/branding";
import { getDatabase, type Database } from "@/platform/database/client";
import { readResendConfig } from "@/platform/email/resend";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";
import { PLANS, formatDayWord, readPlanSettings } from "@/platform/settings/plan";
import { VILLAGE_KEY_STATUSES } from "@/platform/village/contract";
import { readVillageAppName, readVillageKeyState } from "@/platform/village/settings";
import { resolveVillageAppUrl } from "@/platform/village/urls";
import type { SessionMember } from "@/platform/http/request-context";
import { InviteSheet } from "@/modules/admin/components/invite-sheet";
import { adminManifest } from "@/modules/admin/manifest";
import { readInviterSignature } from "@/modules/admin/reads-members";
import { readMailOverview } from "@/modules/admin/reads-mail";
import { readSettingsValues } from "@/modules/admin/service-settings";
import { AvatarField } from "@/modules/members/components/avatar-field";
import { ImportMembersForm } from "@/modules/members/components/import-members-form";
import { readFillInSettings } from "@/modules/members/service-fill-in";
import { readAvatarUrl, readMemberProfile } from "@/modules/members/service-profile";
import { networkManifest } from "@/modules/network/manifest";
import { readEnabledIds } from "@/shell/enabled-modules";
import { GUIDED_STEP_PARAM, GUIDED_STEP_TITLES, GUIDED_STEPS, readGuidedSteps, resolveGuidedStep, type GuidedStepKey } from "@/shell/guided-start";

import { AboutForm } from "../../welcome/about-form";
import { FinishGuidedStart, LookStep, SkipForNow, VillageStep } from "./guided-parts";

export const metadata: Metadata = { title: "Get started" };

// One line per step: what it does for the organizer.
const STEP_LINES: Record<GuidedStepKey, string> = {
  look: "Members see your name, logo and colour on every page and email.",
  village: "Village shows which members know whom, so founders find a warm intro to the people they need.",
  card: "You are a member too: founders see your card in the directory and on every intro you make.",
  invite: "Founders get a one-tap sign-in link; nobody needs a password.",
};

async function LookContent({ database, nextHref }: { database: Database; nextHref: string }) {
  const [saved, branding, plan, mail] = await Promise.all([readSettingsValues(database), readBranding(database), readPlanSettings(database), readMailOverview(database, process.env)]);
  return (
    <LookStep
      nextHref={nextHref}
      saved={saved}
      uploadedLogo={saved.logoUrl ? null : branding.logo}
      isMailOn={mail.isMailOn}
      serverPlan={PLANS.selfHost}
      managedBy={plan.managedSetupBy ? formatDayWord(plan.managedSetupBy) : null}
    />
  );
}

async function VillageContent({ database, nextHref }: { database: Database; nextHref: string }) {
  const [keyState, appName] = await Promise.all([readVillageKeyState(database), readVillageAppName(database)]);
  const isReadable = keyState.status === VILLAGE_KEY_STATUSES.sealed || keyState.status === VILLAGE_KEY_STATUSES.plain;
  return <VillageStep appUrl={resolveVillageAppUrl(process.env)} connectedAppName={keyState.keys && isReadable ? (appName ?? "") : null} nextHref={nextHref} />;
}

// The member welcome an organizer never gets otherwise: their photo and their card's words.
async function CardContent({ database, admin, nextHref }: { database: Database; admin: SessionMember & { name: string }; nextHref: string }) {
  const [community, profile, avatarUrl] = await Promise.all([readBranding(database), readMemberProfile(database, admin.id), readAvatarUrl(database, admin.id)]);
  return (
    <>
      <p className="fh-h3 mb-2">Welcome to {community.name}</p>
      <AvatarField memberId={admin.id} name={admin.name} avatarUrl={avatarUrl} />
      <AboutForm
        nextHref={nextHref}
        secondary={<SkipForNow href={nextHref} />}
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

async function InviteContent({ database, admin }: { database: Database; admin: SessionMember }) {
  const [branding, signature, fillIn, enabledIds] = await Promise.all([readBranding(database), readInviterSignature(database, admin.id), readFillInSettings(database), readEnabledIds(database)]);
  const isEmailOn = readResendConfig(process.env) !== null;
  return (
    <>
      {isEmailOn ? null : (
        <Note className="mb-3" role="status">
          This server has no mail service yet, so nobody is emailed: their links wait on <Link href={ROUTES.adminLinks}>Sign-in links</Link> for you to send.
        </Note>
      )}
      <InviteSheet
        community={branding.name}
        inviterName={signature.name}
        inviterRole={signature.role}
        isEmailOn={isEmailOn}
        isFillInShown={enabledIds.has(networkManifest.id)}
        savedBasis={fillIn.basis}
        savedTermsDate={fillIn.termsDate}
      />
      <details className="fh-sheet mt-4">
        <summary className="fh-h3 cursor-pointer">Or upload a CSV</summary>
        <div className="mt-3">
          <ImportMembersForm communityBasis={fillIn.basis} communityTermsDate={fillIn.termsDate} today={new Date().toISOString().slice(0, 10)} />
        </div>
      </details>
      <div className="fh-btn-row mt-4">
        <FinishGuidedStart label="Finish" />
        <FinishGuidedStart label="Skip for now" variant="quiet" />
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
  const steps = readGuidedSteps((await readEnabledIds(database)).has(networkManifest.id));
  const { step, nextHref } = resolveGuidedStep(steps, query[GUIDED_STEP_PARAM]);
  // Only the last step has no next one, and it finishes instead.
  const next = nextHref ?? ROUTES.admin;

  return (
    <div className="fh-narrow">
      <div className="flex items-start justify-between gap-3">
        <StepPills label="Guided start" steps={steps.map((key) => ({ id: key, label: GUIDED_STEP_TITLES[key] }))} current={step} />
        <FinishGuidedStart label="Skip the guided start" variant="link" />
      </div>
      <h1 className="fh-h1">{GUIDED_STEP_TITLES[step]}</h1>
      <p className="fh-lede mb-4">{STEP_LINES[step]}</p>
      {step === GUIDED_STEPS.look ? <LookContent database={database} nextHref={next} /> : null}
      {step === GUIDED_STEPS.village ? <VillageContent database={database} nextHref={next} /> : null}
      {step === GUIDED_STEPS.card ? <CardContent database={database} admin={admin} nextHref={next} /> : null}
      {step === GUIDED_STEPS.invite ? <InviteContent database={database} admin={admin} /> : null}
    </div>
  );
});
