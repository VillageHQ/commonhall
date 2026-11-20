import type { BoardCompany } from "./contract.ts";

// Commonhall's job board words (copy/member-jobs-board.md, public-jobs-board.md).

function plural(count: number, one: string, many = `${one}s`) {
  return `${count.toLocaleString("en-US")} ${count === 1 ? one : many}`;
}

export function readCompaniesWithJobs(companies: readonly BoardCompany[]) {
  return companies.filter(({ jobCount }) => jobCount > 0);
}

export const APPLY_LINE = "Apply on each company’s own page.";

// The members' board's one line: "5 open jobs at 3 companies." (`communityName` is no longer shown.)
export function describeMemberBoard({ total, companies, current }: { total: number; companies: readonly BoardCompany[]; current: BoardCompany | null; communityName?: string }) {
  if (total === 0) return "No open jobs yet.";
  const where = current ? current.name : plural(readCompaniesWithJobs(companies).length, "company", "companies");
  return `${plural(total, "open job")} at ${where}.`;
}

// "5 open jobs at 3 companies backed by Northwind Founders, newest first. Apply on each company’s own page."
export function describePublicBoard({ total, companies, current, communityName }: { total: number; companies: readonly BoardCompany[]; current: BoardCompany | null; communityName: string }) {
  if (total === 0) return "No open jobs right now.";
  const where = current ? "" : ` at ${plural(readCompaniesWithJobs(companies).length, "company", "companies")} backed by ${communityName}`;
  return `${plural(total, "open job")}${where}, newest first. ${APPLY_LINE}`;
}

export function describeEmptyBoard(current: BoardCompany | null) {
  return {
    title: `No open jobs${current ? ` at ${current.name}` : ""} yet`,
    description: "Founders link their job board on My profile.",
  };
}

// After the board's line: "Hiring? Add yours" (to Our jobs on My profile).
export const HIRING_LINE = { before: "Hiring? ", link: "Add yours", after: "" } as const;

export function describePublicTitle(communityName: string, current: BoardCompany | null) {
  return current ? `Jobs at ${current.name}` : `Jobs at ${communityName} companies`;
}
