import Link from "next/link";

import { CompanyName } from "@/components/company-name";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ChipRow, CHIP_CLASSES } from "@/components/ui/chip";

import { LIBRARY_BOARD_PERIODS, LIBRARY_PAGES, type LibraryBoardPeriod } from "../contract";
import type { Leaderboard } from "../reads";
import { MemberLine } from "./library-parts";

const PERIOD_LABELS: Record<LibraryBoardPeriod, string> = { month: "This month", all: "All time" };

function upvotesLabel(upvotes: number) {
  return `${upvotes} upvote${upvotes === 1 ? "" : "s"}`;
}

// Top contributors and companies by upvotes received on what they shared.
export function LibraryLeaderboard({ board, period, peopleHref }: { board: Leaderboard; period: LibraryBoardPeriod; peopleHref: string }) {
  return (
    <>
      <PageHeader back={{ href: LIBRARY_PAGES.browse, label: "Library" }} title="Leaderboard" description="Who shares what others use: upvotes received on library items." />
      <ChipRow className="fh-tabs" aria-label="Period">
        {(Object.values(LIBRARY_BOARD_PERIODS) as LibraryBoardPeriod[]).map((key) => (
          <Link key={key} className={CHIP_CLASSES} href={`${LIBRARY_PAGES.leaderboard}?period=${key}`} aria-pressed={period === key}>
            {PERIOD_LABELS[key]}
          </Link>
        ))}
      </ChipRow>
      {board.people.length === 0 ? (
        <div className="mt-3">
          <EmptyState title="No upvotes yet" description={period === LIBRARY_BOARD_PERIODS.month ? "Nobody has been upvoted this month yet." : "Share something and it can be first."} />
        </div>
      ) : (
        <div className="fh-lib-boards mt-3">
          <section className="fh-sheet" aria-labelledby="board-people">
            <h2 id="board-people" className="fh-h3">
              People
            </h2>
            <ol className="fh-lib-rank" data-testid="board-people">
              {board.people.map(({ member, upvotes }, index) => (
                <li key={member.id}>
                  <span className="fh-lib-place">{index + 1}</span>
                  <MemberLine member={member} href={`${peopleHref}/${member.id}`} sizePx={32} />
                  <b className="fh-lib-score">{upvotesLabel(upvotes)}</b>
                </li>
              ))}
            </ol>
          </section>
          <section className="fh-sheet" aria-labelledby="board-companies">
            <h2 id="board-companies" className="fh-h3">
              Companies
            </h2>
            <ol className="fh-lib-rank" data-testid="board-companies">
              {board.companies.map(({ company, logoUrl, upvotes, people }, index) => (
                <li key={company}>
                  <span className="fh-lib-place">{index + 1}</span>
                  <span className="min-w-0">
                    <CompanyName company={company} logoUrl={logoUrl} logoSizePx={18} />
                    <span className="fh-small fh-muted"> · {people === 1 ? "1 person" : `${people} people`}</span>
                  </span>
                  <b className="fh-lib-score">{upvotesLabel(upvotes)}</b>
                </li>
              ))}
            </ol>
          </section>
        </div>
      )}
    </>
  );
}
