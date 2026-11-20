import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { CompanyFilter, JobList } from "@/modules/job-board/components/job-list";
import { COMPANY_PARAM, JOB_BOARD_PAGE_TITLES, JOB_BOARD_PAGES } from "@/modules/job-board/contract";
import { describeEmptyBoard, describeMemberBoard, HIRING_LINE, readCompaniesWithJobs } from "@/modules/job-board/copy";
import { jobBoardManifest } from "@/modules/job-board/manifest";
import { readBoardCompanies, readBoardJobs } from "@/modules/job-board/reads";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { modulePage } from "@/platform/modules/module-page";
import { messagesManifest } from "@/modules/messages/manifest";
import { readFindCandidatesLink } from "@/shell/find-candidates";

export const metadata: Metadata = { title: JOB_BOARD_PAGE_TITLES.board };

type JobsPageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

// Commonhall's members' board (memberBoardPage): the head with one line ("5 open jobs at 3 companies. Hiring? Add
// yours"), the Company select, the job rows. Empty: one line and "Add your jobs".
export default modulePage(jobBoardManifest, async function JobsPage({ searchParams }: JobsPageProps) {
  const member = await requireMember();
  const value = (await searchParams)[COMPANY_PARAM];
  const company = typeof value === "string" && value.trim() ? value.trim() : null;
  const database = getDatabase();
  const [jobs, companies, findCandidatesHref, isMessagingOn] = await Promise.all([
    readBoardJobs(database, company),
    readBoardCompanies(database),
    readFindCandidatesLink(database, member),
    isModuleEnabled(database, messagesManifest),
  ]);
  // A job with no apply link: Apply messages the founder who added it (never yourself).
  const applyByMessageHref = isMessagingOn ? (memberId: string) => (memberId === member.id ? null : `${ROUTES.newMessage}?${new URLSearchParams({ to: memberId }).toString()}`) : undefined;
  const current = company ? (companies.find(({ slug }) => slug === company) ?? null) : null;
  if (company && !current) notFound();
  const empty = describeEmptyBoard(current);

  return (
    <>
      <header className="fh-pagehead">
        <h1 className="fh-h1">{current ? `Jobs at ${current.name}` : JOB_BOARD_PAGE_TITLES.board}</h1>
        {jobs.length > 0 ? (
          <p className="fh-lede">
            {`${describeMemberBoard({ total: jobs.length, companies, current })} `}
            {HIRING_LINE.before}
            <Link href={JOB_BOARD_PAGES.ours}>{HIRING_LINE.link}</Link>
            {HIRING_LINE.after}
          </p>
        ) : null}
      </header>
      <CompanyFilter basePath={JOB_BOARD_PAGES.board} companies={readCompaniesWithJobs(companies)} selected={company} />
      {jobs.length > 0 ? (
        <JobList jobs={jobs} memberHref={(memberId) => `${ROUTES.people}/${memberId}`} findCandidatesHref={findCandidatesHref ?? undefined} applyByMessageHref={applyByMessageHref} />
      ) : (
        <div className="mt-4">
          <EmptyState title={empty.title} description={empty.description}>
            <Button asChild variant="secondary">
              <Link href={JOB_BOARD_PAGES.ours}>Add your jobs</Link>
            </Button>
          </EmptyState>
        </div>
      )}
    </>
  );
});
