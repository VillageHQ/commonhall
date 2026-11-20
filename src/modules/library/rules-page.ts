import { z } from "zod";

import { LIBRARY_BOARD_PERIODS, LIBRARY_JOBS, LIBRARY_KINDS, LIBRARY_LIMITS, LIBRARY_SORTS, type LibraryBoardPeriod } from "./contract.ts";

type SearchParamValue = string | string[] | undefined;
export type LibrarySearchParams = Record<string, SearchParamValue>;

export function readFirst(value: SearchParamValue) {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

const kindSchema = z.enum(LIBRARY_KINDS).nullable().catch(null);
const jobSchema = z.enum(LIBRARY_JOBS).nullable().catch(null);
const periodSchema = z.enum(LIBRARY_BOARD_PERIODS).catch(LIBRARY_BOARD_PERIODS.month);

// The browse page's address: ?kind=prompt&job=sales&q=email&mine=1&sort=top. Anything unknown is ignored. The page
// calls `job` a role; the address keeps `job`, so old links still filter.
export function parseLibraryFilters(params: LibrarySearchParams) {
  return {
    kind: kindSchema.parse(readFirst(params.kind) || null),
    job: jobSchema.parse(readFirst(params.job) || null),
    search: readFirst(params.q)?.replace(/\s+/g, " ").trim().slice(0, LIBRARY_LIMITS.searchLength) || null,
    mine: readFirst(params.mine) === "1",
    top: readFirst(params.sort) === LIBRARY_SORTS.top,
  };
}

export function parseBoardPeriod(params: LibrarySearchParams): LibraryBoardPeriod {
  return periodSchema.parse(readFirst(params.period));
}

const FLASHES: Record<string, string> = {
  shared: "Shared in the library.",
  saved: "Saved.",
  removed: "Removed from the library.",
};

export function readLibraryFlash(params: LibrarySearchParams) {
  return FLASHES[readFirst(params.m) ?? ""] ?? null;
}
