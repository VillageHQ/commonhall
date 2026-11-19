import { z } from "zod";

import { feedTextSchema } from "../../platform/text/text-schema.ts";
import { removeBidiControls, removeNullBytes } from "../../platform/text/safe-text.ts";

export const LIBRARY_PAGE = "/library";
export const LIBRARY_PAGE_TITLE = "Library";
export const LIBRARY_PAGES = {
  browse: LIBRARY_PAGE,
  publish: `${LIBRARY_PAGE}/new`,
  leaderboard: `${LIBRARY_PAGE}/leaderboard`,
} as const;

export function toLibraryItemPage(itemId: string) {
  return `${LIBRARY_PAGE}/${itemId}`;
}

export const LIBRARY_API_PREFIX = "/api/library";
export const LIBRARY_API_ROUTES = {
  publish: `${LIBRARY_API_PREFIX}/publish`,
  item: `${LIBRARY_API_PREFIX}/item`,
  vote: `${LIBRARY_API_PREFIX}/vote`,
  review: `${LIBRARY_API_PREFIX}/review`,
  feature: `${LIBRARY_API_PREFIX}/feature`,
  remove: `${LIBRARY_API_PREFIX}/remove`,
  report: `${LIBRARY_API_PREFIX}/report`,
  files: `${LIBRARY_API_PREFIX}/files`,
} as const;

export function toLibraryFileUrl(fileId: string) {
  return `${LIBRARY_API_ROUTES.files}/${fileId}`;
}

// The report queue's name for a library item (content_report.target_type).
export const LIBRARY_REPORT_TARGET = "library_item";

export const LIBRARY_KINDS = {
  skill: "skill",
  agent: "agent",
  prompt: "prompt",
  toolConnection: "tool_connection",
  automation: "automation",
  playbook: "playbook",
} as const;
export type LibraryKind = (typeof LIBRARY_KINDS)[keyof typeof LIBRARY_KINDS];
export const LIBRARY_KIND_LABELS: Record<LibraryKind, string> = {
  skill: "Skill",
  agent: "Agent",
  prompt: "Prompt",
  tool_connection: "Tool connection",
  automation: "Automation",
  playbook: "Playbook",
};

export const LIBRARY_JOBS = {
  sales: "sales",
  marketing: "marketing",
  engineering: "engineering",
  product: "product",
  hiring: "hiring",
  financeLegal: "finance_legal",
  supportOps: "support_ops",
  fundraising: "fundraising",
  founder: "founder",
} as const;
export type LibraryJob = (typeof LIBRARY_JOBS)[keyof typeof LIBRARY_JOBS];
export const LIBRARY_JOB_LABELS: Record<LibraryJob, string> = {
  sales: "Sales",
  marketing: "Marketing",
  engineering: "Engineering",
  product: "Product",
  hiring: "Hiring",
  finance_legal: "Finance and legal",
  support_ops: "Support and ops",
  fundraising: "Fundraising",
  founder: "Founder’s own work",
};

// Who sees an item: the whole portfolio (the default), only the fund's team, or people at chosen companies. The author
// and admins always see it.
export const LIBRARY_VISIBILITIES = { portfolio: "portfolio", fundTeam: "fund_team", companies: "companies" } as const;
export type LibraryVisibility = (typeof LIBRARY_VISIBILITIES)[keyof typeof LIBRARY_VISIBILITIES];
export const LIBRARY_VISIBILITY_LABELS: Record<LibraryVisibility, string> = {
  portfolio: "The whole portfolio",
  fund_team: "Only the fund team",
  companies: "Only people at chosen companies",
};

const MEGABYTE = 1024 * 1024;

export const LIBRARY_LIMITS = {
  titleLength: 120,
  pitchLength: 160,
  descriptionLength: 5000,
  installLength: 3000,
  reviewLength: 200,
  linkLength: 500,
  companyLength: 120,
  companies: 20,
  filesPerVersion: 10,
  fileNameLength: 120,
  // The owner's cap: every file, and all the files of one upload together.
  maximumBytes: 10 * MEGABYTE,
  searchLength: 120,
  itemsPerPage: 60,
  leaderboardRows: 10,
  todayItems: 3,
  todayDays: 14,
} as const;

// The request carries the files and a small form part, so it may be a little larger than the files' own cap.
export const LIBRARY_UPLOAD_BODY_BYTES = LIBRARY_LIMITS.maximumBytes + 256 * 1024;
export const LIBRARY_TOO_LARGE_MESSAGE = "Files can be 10 MB at most, all of them together.";

// The file types the owner allowed, by extension, with the type each is served as. Every one is served as a download.
export const LIBRARY_FILE_TYPES = {
  zip: "application/zip",
  md: "text/markdown; charset=utf-8",
  txt: "text/plain; charset=utf-8",
  json: "application/json",
  yaml: "application/yaml",
  yml: "application/yaml",
  py: "text/x-python; charset=utf-8",
  js: "text/javascript; charset=utf-8",
  ts: "text/plain; charset=utf-8",
} as const;
export type LibraryFileExtension = keyof typeof LIBRARY_FILE_TYPES;
export const LIBRARY_FILE_ACCEPT = Object.keys(LIBRARY_FILE_TYPES)
  .map((extension) => `.${extension}`)
  .join(",");
export const LIBRARY_WRONG_TYPE_MESSAGE = "Only zip, md, txt, json, yaml, py, js and ts files can be shared.";

export function readFileExtension(name: string): LibraryFileExtension | null {
  const match = /\.([a-z0-9]+)$/i.exec(name.trim());
  const extension = match?.[1]?.toLowerCase();
  return extension && extension in LIBRARY_FILE_TYPES ? (extension as LibraryFileExtension) : null;
}

export const LIBRARY_ERROR_CODES = {
  notFound: "library_not_found",
  secret: "library_secret",
  wrongType: "library_wrong_type",
  tooLarge: "library_too_large",
  ownItem: "library_own_item",
  notYours: "library_not_yours",
  nothingToShare: "library_nothing_to_share",
  noCompany: "library_no_company",
} as const;

export const LIBRARY_NOT_FOUND_MESSAGE = "This item isn’t in the library anymore.";

function plainLine(label: string, maximumLength: number) {
  return feedTextSchema(label, maximumLength).refine((text) => !/[\r\n]/.test(text), `Keep ${label} on one line.`);
}

function optionalText(maximumLength: number, label: string) {
  const text = z
    .string()
    .overwrite(removeNullBytes)
    .overwrite(removeBidiControls)
    .trim()
    .max(maximumLength, `Keep ${label} under ${maximumLength.toLocaleString("en-US")} characters.`);
  return z
    .string()
    .nullish()
    .transform((value) => value ?? "")
    .pipe(text)
    .transform((value) => value || null);
}

// Only an https or http link that a browser opens as a page: never javascript:, data: or a login part.
export function parseLibraryLink(value: string): string | null {
  const text = value.trim();
  if (!text || text.length > LIBRARY_LIMITS.linkLength || /\s/.test(text)) return null;
  try {
    const url = new URL(text);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || !url.hostname.includes(".") || url.username || url.password) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function toCompanyKey(company: string) {
  return company.trim().toLowerCase().replace(/\s+/g, " ");
}

export const libraryItemFieldsSchema = z
  .object({
    // Set when the author uploads a new version of their own item.
    itemId: z.uuid().optional(),
    title: plainLine("a title", LIBRARY_LIMITS.titleLength),
    pitch: plainLine("a one-line pitch", LIBRARY_LIMITS.pitchLength),
    kind: z.enum(LIBRARY_KINDS, { error: "Pick what kind of thing it is." }),
    job: z.enum(LIBRARY_JOBS, { error: "Pick the job it helps with." }),
    description: optionalText(LIBRARY_LIMITS.descriptionLength, "the description"),
    install: optionalText(LIBRARY_LIMITS.installLength, "the install steps"),
    link: optionalText(LIBRARY_LIMITS.linkLength, "the link").transform((text, context) => {
      if (!text) return null;
      const url = parseLibraryLink(text);
      if (url) return url;
      context.addIssue({ code: "custom", message: "Use a full https:// link." });
      return z.NEVER;
    }),
    visibility: z.enum(LIBRARY_VISIBILITIES).default(LIBRARY_VISIBILITIES.portfolio),
    companies: z
      .array(z.string().overwrite(removeNullBytes).trim().max(LIBRARY_LIMITS.companyLength))
      .max(LIBRARY_LIMITS.companies, `Pick at most ${LIBRARY_LIMITS.companies} companies.`)
      .default([])
      .transform((names) => [...new Map(names.filter(Boolean).map((name) => [toCompanyKey(name), name])).entries()]),
  })
  .refine((fields) => fields.visibility !== LIBRARY_VISIBILITIES.companies || fields.companies.length > 0, {
    message: "Pick at least one company that can see it.",
    path: ["companies"],
  });
export type LibraryItemFields = z.infer<typeof libraryItemFieldsSchema>;

export type LibraryUpload = { name: string; bytes: Buffer };

export const libraryItemIdBodySchema = z.object({ itemId: z.uuid() });
export const libraryVoteBodySchema = z.object({ itemId: z.uuid(), isUpvoted: z.boolean() });
export const libraryFeatureBodySchema = z.object({ itemId: z.uuid(), isFeatured: z.boolean() });
export const libraryReviewBodySchema = z.object({ itemId: z.uuid(), body: plainLine("a review", LIBRARY_LIMITS.reviewLength) });
export type LibraryVoteBody = z.infer<typeof libraryVoteBodySchema>;
export type LibraryFeatureBody = z.infer<typeof libraryFeatureBodySchema>;
export type LibraryReviewBody = z.infer<typeof libraryReviewBodySchema>;

export const libraryMessageResponseSchema = z.object({ message: z.string() });
export const libraryPublishResponseSchema = z.object({ id: z.uuid(), message: z.string() });
export const libraryVoteResponseSchema = z.object({ upvotes: z.number(), isUpvoted: z.boolean() });

export const LIBRARY_BOARD_PERIODS = { month: "month", all: "all" } as const;
export type LibraryBoardPeriod = (typeof LIBRARY_BOARD_PERIODS)[keyof typeof LIBRARY_BOARD_PERIODS];

export function composeLibraryReportBody(title: string, pitch: string) {
  return `${title}: ${pitch}`;
}
