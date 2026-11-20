import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/page-header";
import { AllowancePips } from "@/components/ui/search-box";
import { Stepper } from "@/components/ui/stepper";
import { requireMember } from "@/platform/auth/session";
import { readBrandingForPage } from "@/platform/branding/branding";
import { PAGE_TITLES } from "@/platform/branding/page-metadata";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";
import { INTRO_LIFETIME_DAYS, OUTCOME_PROMPT_AFTER_DAYS } from "@/modules/intros/contract";
import { readPrivacyLine } from "@/modules/intros/components/intro-words";
import { introsManifest } from "@/modules/intros/manifest";
import { describeAllowanceUsed, readAskAllowance } from "@/shell/ask-helpers";
import { readAskerProfile, readIntroConnectorCard } from "@/shell/intro-ask";
import { draftNoteParts, joinNoteParts } from "@/shell/intro-ask-note";

import { IntroAskForm } from "./intro-ask-form";

export const metadata: Metadata = { title: PAGE_TITLES.introAsk };

type NewIntroPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// "Ask Ada for an intro": the ask from a member's profile (/intros/new?via=…). In view: the allowance once, who, and a
// note drafted from the asker's profile. How an intro works stays under its fold. Needs no Village.
export default modulePage(introsManifest, async function NewIntroPage({ searchParams }: NewIntroPageProps) {
  const member = await requireMember();
  const database = getDatabase();
  const params = await searchParams;
  const connectorId = typeof params.via === "string" ? params.via.trim() : "";
  if (!connectorId) notFound();
  const [connector, asker, allowance, branding] = await Promise.all([
    readIntroConnectorCard(database, connectorId, member.id),
    readAskerProfile(database, member.id),
    readAskAllowance(database, member.id),
    readBrandingForPage(),
  ]);
  if (!connector) notFound();
  const connectorFirst = connector.name.split(" ")[0] ?? connector.name;
  const blockedReason = !connector.canBeAsked ? `${connector.name} has paused intro asks.` : allowance.left === 0 ? describeAllowanceUsed(allowance) : null;
  const allowanceText = `${allowance.left} of ${allowance.cap} asks left this week`;
  return (
    <>
      <BackLink href={`${ROUTES.people}/${connector.id}`}>{connector.name}</BackLink>
      <h1 className="fh-h1" style={{ marginTop: 14 }}>
        Ask {connectorFirst} for an intro
      </h1>
      <div className="fh-allow" aria-label={allowanceText}>
        <AllowancePips left={allowance.left} total={allowance.cap} label={allowanceText} />
      </div>
      <IntroAskForm
        connector={{ id: connector.id, name: connector.name }}
        draftNote={joinNoteParts(draftNoteParts(asker, { targetName: "", targetCompany: null }))}
        blockedReason={blockedReason}
      />
      <details className="fh-section">
        <summary className="fh-small">How intros work</summary>
        <Stepper
          className="mt-3.5"
          steps={[
            { key: "ask", state: "now", title: `You ask ${connectorFirst}`, detail: "It uses one of your asks this week." },
            { key: "connector", state: "todo", title: `${connectorFirst} decides`, detail: `By email or here, within ${INTRO_LIFETIME_DAYS} days. If it’s a no, your ask comes back; you’re never told why.` },
            { key: "target", state: "todo", title: "They decide", detail: `One email from ${branding.name}, one reminder, ${INTRO_LIFETIME_DAYS} days.` },
            { key: "introduced", state: "todo", title: "Introduced by email", detail: "Only when both said yes. Replies land in your Inbox too." },
            { key: "outcome", state: "todo", title: "Was it helpful?", detail: `One question, ${OUTCOME_PROMPT_AFTER_DAYS} days later.` },
          ]}
        />
        <p className="fh-small fh-muted mt-2.5">{readPrivacyLine(branding.name)}</p>
      </details>
    </>
  );
});
