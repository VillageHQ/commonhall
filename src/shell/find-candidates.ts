import "server-only";

import type { Database, DatabaseOrTransaction } from "@/platform/database/client";
import { isAdminMember } from "@/platform/auth/roles";
import type { SessionMember } from "@/platform/http/request-context";
import { ROUTES } from "@/platform/http/routes";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { toAskDraftHref } from "@/platform/modules/manifest";
import { asksManifest } from "@/modules/asks/manifest";
import { ASK_CATEGORIES } from "@/modules/asks/contract";
import { toCompanySlug, type BoardJob } from "@/modules/job-board/contract";
import { jobBoardManifest } from "@/modules/job-board/manifest";
import { readBoardJob, readMemberCompany } from "@/modules/job-board/reads";
import { buildCandidateQuery, draftHiringAsk, mayFindCandidates, readRole, type CandidateViewer } from "@/modules/job-board/rules-candidates";
import { networkManifest } from "@/modules/network/manifest";

// "Find candidates" on a job (the job board and network search meet here, so neither imports the other).
export const FIND_CANDIDATES_JOB_PARAM = "job";

export function toFindCandidatesHref(jobId: string) {
  return `${ROUTES.findCandidates}?${new URLSearchParams({ [FIND_CANDIDATES_JOB_PARAM]: jobId }).toString()}`;
}

async function readCandidateViewer(database: DatabaseOrTransaction, member: SessionMember): Promise<CandidateViewer> {
  const company = await readMemberCompany(database, member.id);
  return { id: member.id, isAdmin: isAdminMember(member), companySlug: company.trim() ? toCompanySlug(company) : null };
}

// The board's button: a reader of which jobs this member may find candidates for, or null while search is off.
export async function readFindCandidatesLink(database: Database, member: SessionMember) {
  if (!(await isModuleEnabled(database, networkManifest))) return null;
  const viewer = await readCandidateViewer(database, member);
  return (job: Pick<BoardJob, "id" | "companySlug" | "memberId">) => (mayFindCandidates(viewer, job) ? toFindCandidatesHref(job.id) : null);
}

export type FindCandidatesPage = {
  job: Pick<BoardJob, "id" | "title" | "company" | "location" | "url">;
  // The role in the job's title, without the tools' tags; null when the title has no words.
  role: string | null;
  // The search the job turns into, or null when its title has no words (the founder types the role).
  query: string | null;
  hiringAskHref: string | null;
};

// The page behind the button. Null (a 404) for a job that isn't listed, or a member outside its company.
export async function readFindCandidatesPage(database: Database, member: SessionMember, jobId: string): Promise<FindCandidatesPage | null> {
  if (!(await isModuleEnabled(database, jobBoardManifest))) return null;
  const job = await readBoardJob(database, jobId);
  if (!job) return null;
  if (!mayFindCandidates(await readCandidateViewer(database, member), job)) return null;
  const canAskCommunity = await isModuleEnabled(database, asksManifest);
  return {
    job: { id: job.id, title: job.title, company: job.company, location: job.location, url: job.url },
    role: readRole(job.title),
    query: buildCandidateQuery(job),
    hiringAskHref: canAskCommunity ? toAskDraftHref(draftHiringAsk(job), { category: ASK_CATEGORIES.hire, detail: toJobLinkLine(job.url) }) : null,
  };
}

function toJobLinkLine(url: string) {
  return /^https?:\/\//i.test(url) ? `The job: ${url}` : null;
}
