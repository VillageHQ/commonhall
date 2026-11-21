import { Building2 } from "lucide-react";
import Link from "next/link";

import { CompanyLogo } from "@/components/company-name";
import { Button } from "@/components/ui/button";
import { formatDay } from "@/platform/text/day-month";

import { COMPANY_PARAM, isMailtoLink, type BoardCompany, type BoardJob, type PublicJob } from "../contract";
import { CompanySelectSubmit } from "./company-select-submit";

type ListedJob = PublicJob & Partial<Pick<BoardJob, "memberId" | "memberName">>;

function toCompanyHref(basePath: string, slug: string) {
  return `${basePath}?${new URLSearchParams({ [COMPANY_PARAM]: slug }).toString()}`;
}

// The members' board filter (Commonhall's `.dirform` select): "All companies", then each company with its count.
// It applies on change; without scripts, the Filter button sends it.
export function CompanyFilter({ basePath, companies, selected }: { basePath: string; companies: readonly BoardCompany[]; selected: string | null }) {
  if (companies.length < 2 && selected === null) return null;
  return (
    <form method="get" action={basePath} role="search" className="fh-dirform">
      <div className="fh-filters">
        <label className="fh-filt">
          <span className="sr-only">Company</span>
          <CompanySelectSubmit name={COMPANY_PARAM} defaultValue={selected ?? ""}>
            <option value="">All companies</option>
            {companies.map((company) => (
              <option key={company.slug} value={company.slug}>
                {`${company.name} (${company.jobCount})`}
              </option>
            ))}
          </CompanySelectSubmit>
        </label>
        <noscript>
          <Button type="submit" variant="secondary" size="sm">
            Filter
          </Button>
        </noscript>
        {selected ? (
          <Button asChild variant="quiet" size="sm">
            <Link href={basePath}>Clear</Link>
          </Button>
        ) : null}
      </div>
    </form>
  );
}

// The public board's company tags ("Kilnworks · 1").
export function CompanyTags({ basePath, companies }: { basePath: string; companies: readonly BoardCompany[] }) {
  if (companies.length < 2) return null;
  return (
    <nav aria-label="Companies" className="fh-tags mt-3">
      {companies.map((company) => (
        <Link key={company.slug} href={toCompanyHref(basePath, company.slug)} className="fh-tag">
          {`${company.name} · ${company.jobCount}`}
        </Link>
      ))}
    </nav>
  );
}

// Commonhall's job row (jobRow(), crop rows-jobs.png): the logo, the serif title, "Company · place · team · posted
// 10 Nov" (+ "· via Name" for members), and Apply.
// "Find candidates" shows on a job when `findCandidatesHref` gives it a link (its company's members and admins).
// A job with no apply link (added by hand, round 7): Apply messages the founder who added it, when
// `applyByMessageHref` gives a link (the members' board, while messages are on); public views show no Apply.
export function JobList({
  jobs,
  memberHref,
  findCandidatesHref,
  applyByMessageHref,
}: {
  jobs: readonly ListedJob[];
  memberHref?: (memberId: string) => string;
  findCandidatesHref?: (job: Pick<BoardJob, "id" | "companySlug" | "memberId">) => string | null;
  applyByMessageHref?: (job: { memberId: string; title: string; company: string }) => string | null;
}) {
  return (
    <div className="fh-rows fh-jobrows mt-3.5">
      {jobs.map((job) => {
        const bits = [job.company, job.location, job.department].filter(Boolean).join(" · ");
        const when = job.postedAt ? ` · posted ${formatDay(job.postedAt)}` : "";
        const candidatesHref = findCandidatesHref && job.memberId ? findCandidatesHref({ id: job.id, companySlug: job.companySlug, memberId: job.memberId }) : null;
        const messageHref = !job.url && applyByMessageHref && job.memberId ? applyByMessageHref({ memberId: job.memberId, title: job.title, company: job.company }) : null;
        return (
          <div key={job.id} className="fh-r">
            <span className="fh-jl">
              {job.companyLogoUrl ? <CompanyLogo url={job.companyLogoUrl} sizePx={20} className="mt-0" /> : <Building2 aria-hidden="true" className="fh-i fh-s" strokeWidth={1.5} />}
            </span>
            <div className="fh-who">
              <b>{job.title}</b>
              <span>
                {bits}
                {when}
                {job.memberId && job.memberName && memberHref ? (
                  <>
                    {" · via "}
                    <Link href={memberHref(job.memberId)}>{job.memberName}</Link>
                  </>
                ) : null}
              </span>
            </div>
            <div className="fh-end">
              {candidatesHref ? (
                <Button asChild variant="secondary" size="sm">
                  <Link href={candidatesHref} aria-label={`Find candidates for ${job.title} at ${job.company}`}>
                    Find candidates
                  </Link>
                </Button>
              ) : null}
              {job.url ? (
                <Button asChild variant="secondary" size="sm">
                  <a href={job.url} {...(isMailtoLink(job.url) ? {} : { target: "_blank", rel: "noopener noreferrer" })} aria-label={`Apply for ${job.title} at ${job.company}`}>
                    Apply
                  </a>
                </Button>
              ) : messageHref ? (
                <Button asChild variant="secondary" size="sm">
                  <Link href={messageHref} aria-label={`Apply for ${job.title} at ${job.company}: message ${job.memberName ?? "the founder"}`}>
                    Apply
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
