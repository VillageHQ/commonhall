import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/page-header";
import { readBrandingForPage } from "@/platform/branding/branding";
import { isAdminMember } from "@/platform/auth/roles";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { modulePage } from "@/platform/modules/module-page";
import { membersManifest } from "@/modules/members/manifest";
import { readMemberProfile } from "@/modules/members/service-profile";
import { OurJobsSection } from "@/modules/job-board/components/our-jobs-section";
import { jobBoardManifest } from "@/modules/job-board/manifest";
import { isPublicBoardOn, readMemberSources, readSourceJobs } from "@/modules/job-board/reads";

export const metadata: Metadata = { title: "Our jobs" };

// My profile › Our jobs: the companies and boards a founder links to the job board. A page of My profile, so the
// members module owns it; it is a 404 while the job board is off.
export default modulePage(membersManifest, async function OurJobsPage() {
  const member = await requireMember();
  const database = getDatabase();
  if (!(await isModuleEnabled(database, jobBoardManifest))) notFound();
  const [community, profile, sources, isBoardPublic] = await Promise.all([
    readBrandingForPage(),
    readMemberProfile(database, member.id),
    readMemberSources(database, member.id),
    isPublicBoardOn(database),
  ]);
  const jobsBySource = await readSourceJobs(database, sources.map(({ id }) => id));
  return (
    <>
      <BackLink href={ROUTES.editCard}>My profile</BackLink>
      <OurJobsSection
        sources={sources}
        jobsBySource={jobsBySource}
        company={profile?.company ?? ""}
        isCompanyFixed={!isAdminMember(member)}
        communityName={community.name}
        isPublicBoardOn={isBoardPublic}
      />
    </>
  );
});
