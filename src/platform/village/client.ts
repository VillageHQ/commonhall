import "server-only";

import { createHash } from "node:crypto";

import { isVillageError, VillageError, type CallOptions, type Payer, type Village, type VillageRequestEvent } from "@villagehq/sdk";
import { createVillageAdmin, type VillageAdmin } from "@villagehq/sdk/server";
import { z } from "zod";

import { getDatabase } from "../database/client.ts";
import { readPathsCredits, readSearchCredits, VILLAGE_PRICES } from "./contract.ts";
import { noteVillageOutcome, VillageDeadlineError } from "./health.ts";

export const VILLAGE_TIMEOUTS_MS = { default: 15_000, paths: 60_000, search: 120_000 } as const;
export const NETWORK_SOURCE = "network";

const MAXIMUM_VILLAGE_ADMINS = 10;
const BAD_REQUEST_STATUS = 400;
const LEAVE_OPERATION = "groups.leave";
// The calls made with this community's secret key itself, not a member's token.
const SECRET_KEY_OPERATIONS: ReadonlySet<string> = new Set(["tokens.create", "app.get"]);
const JSON_CONTENT_TYPE = "json";

type VillageRequestHook = (event: VillageRequestEvent) => void;
type VillageAdminEntry = { admin: VillageAdmin; onRequest: VillageRequestHook };

const villageAdmins = new Map<string, VillageAdminEntry>();

// `isTrial`: keys an admin is trying before they're saved. Their answers say nothing about this community's own keys,
// so they never record Village's health (a mistyped key must not raise "Village refused this community's keys").
export type VillageConnection = { apiUrl: string | undefined; secretKey: string; deadlineAtMs: number; isTrial?: boolean };
export type VillageIdentity = { externalId: string; email: string };
// `onRequest` is the hook the SDK calls after each named call. Calls through `village.api` skip it, so they report to it
// themselves (`sendVillageApi`).
export type VillageSession = { village: Village; deadlineAtMs: number; onRequest: VillageRequestHook };

// TODO(@villagehq/sdk): a VillageError doesn't say whether Village wrote the answer or a proxy in front of it did.
// people.paths reads a proxy's HTML 404 as an unknown person, and groups.leave reads it as "not a member".
// Until the SDK tells them apart, any answer that isn't JSON fails here, with no status for the SDK to misread.
export class VillageGatewayError extends VillageError {
  readonly answeredStatus: number;

  constructor(answeredStatus: number) {
    super({ code: "server", message: `Village's address answered ${answeredStatus} with something other than JSON.` });
    this.answeredStatus = answeredStatus;
  }
}

async function fetchVillageJson(request: Request) {
  const response = await fetch(request);
  if (response.headers.get("content-type")?.includes(JSON_CONTENT_TYPE)) return response;
  await response.body?.cancel();
  throw new VillageGatewayError(response.status);
}

// TODO(@villagehq/sdk): groups.leave turns a 400 into the admin_blocked outcome, but onRequest still reports it as an error.
function isLeaveOutcome({ operation, status }: VillageRequestEvent) {
  return operation === LEAVE_OPERATION && status === BAD_REQUEST_STATUS;
}

// A 401 on a member's own call is usually their token expiring: the SDK mints a new one and retries.
// Only a call made with this community's secret key says whether Village refused the keys.
function isMemberTokenRefusal({ operation, error }: VillageRequestEvent) {
  return isVillageError(error, "unauthorized") && !SECRET_KEY_OPERATIONS.has(operation);
}

// Every call also updates when Village last worked, or the trouble it's in, for the admin's notice.
function onVillageRequest(event: VillageRequestEvent) {
  if (!isMemberTokenRefusal(event)) noteVillageOutcome(getDatabase, isLeaveOutcome(event) ? null : event.error);
  logVillageFailure(event);
}

function onTrialRequest(event: VillageRequestEvent) {
  logVillageFailure(event);
}

function logVillageFailure(event: VillageRequestEvent) {
  const { operation, durationMs, requestId, error } = event;
  if (!error || error.isExpected || isLeaveOutcome(event)) return;
  const status = error instanceof VillageGatewayError ? error.answeredStatus : event.status;
  console.error(
    JSON.stringify({ level: "error", scope: "village", operation, status, code: error.code, durationMs, requestId, traceId: error.traceId }),
  );
}

function readVillageAdmin({ apiUrl, secretKey, isTrial = false }: VillageConnection) {
  const key = createHash("sha256").update(`${apiUrl}\n${secretKey}\n${isTrial ? "trial" : "saved"}`).digest("hex");
  const cached = villageAdmins.get(key);
  if (cached) return cached;

  const oldestKey = villageAdmins.keys().next().value;
  if (villageAdmins.size >= MAXIMUM_VILLAGE_ADMINS && oldestKey) villageAdmins.delete(oldestKey);
  const onRequest = isTrial ? onTrialRequest : onVillageRequest;
  const entry = { admin: createVillageAdmin({ secretKey, apiUrl, fetch: fetchVillageJson, onRequest }), onRequest };
  villageAdmins.set(key, entry);
  return entry;
}

export function createVillageSession(connection: VillageConnection, { externalId, email }: VillageIdentity): VillageSession {
  const { admin, onRequest } = readVillageAdmin(connection);
  return { village: admin.as({ id: externalId, email }), deadlineAtMs: connection.deadlineAtMs, onRequest };
}

export function withinDeadline({ deadlineAtMs }: Pick<VillageSession, "deadlineAtMs">, usualTimeoutMs: number = VILLAGE_TIMEOUTS_MS.default): CallOptions {
  const remainingMs = deadlineAtMs - Date.now();
  if (remainingMs <= 0) throw new VillageDeadlineError();
  return { timeoutMs: Math.min(usualTimeoutMs, remainingMs) };
}

export function isVillageErrorResponse(error: unknown): error is VillageError {
  if (!isVillageError(error) || error instanceof VillageGatewayError) return false;
  return error.status !== null && error.status >= BAD_REQUEST_STATUS;
}

export async function mintVillageToken(connection: VillageConnection, { externalId, email }: VillageIdentity) {
  const { token } = await readVillageAdmin(connection).admin.tokens.create({ id: externalId, email }, withinDeadline(connection));
  return token;
}

export const VILLAGE_PAYERS = { app: "app", user: "user" } as const satisfies Record<Payer, Payer>;

// The app the secret key belongs to, asked with the key alone: no member token, so checking keys makes no Village user.
// Its title (for "Connected to <name>"), its public key, and whether it can pay for this community's members:
// `canPayForMembers` is false for an app where each user pays; `needsCard` until a card is on file. Free.
export async function readVillageAppDetails(connection: VillageConnection) {
  const app = await readVillageAdmin(connection).admin.app.get(withinDeadline(connection));
  return {
    title: app.title,
    publicKey: app.public_key,
    payer: app.payer,
    canPayForMembers: app.capabilities.has_server_access,
    needsCard: app.capabilities.needs_card,
    isTest: app.mode === "test",
  };
}

export function readVillageUser(session: VillageSession) {
  return session.village.user.get(withinDeadline(session));
}

export async function createVillageGroup(session: VillageSession, name: string) {
  const { id, invite_link } = await session.village.groups.create(name, withinDeadline(session));
  return { id, inviteLink: invite_link };
}

export function joinVillageGroup(session: VillageSession, inviteLink: string) {
  return session.village.groups.join(inviteLink, withinDeadline(session));
}

// The groups this member is in. Free; the Village check reads it to see who is in the community group.
export async function listVillageGroupIds(session: VillageSession) {
  const { groups } = await session.village.groups.list(withinDeadline(session));
  return groups.map(({ id }) => id);
}

export function leaveVillageGroup(session: VillageSession, groupId: string) {
  return session.village.groups.leave(groupId, withinDeadline(session));
}

export const GLOBAL_SOURCE = "global";

// "network" searches the member's network; "global" searches everyone Village knows.
// The page size is sent, not left to Village's default: Village charges per result returned.
export const SEARCH_PAGE_SIZE = 25;

// What each paid call reserves before it runs, and what its answer cost (credit-ledger.ts's CreditCharge).
// A search with no results is counted as one batch: the search's price note says it costs nothing, but Village's credits
// page says an empty search still bills its AI work. Counting it keeps the cap on the safe side, and the member's day.
export const SEARCH_CHARGE = {
  mostCredits: readSearchCredits(SEARCH_PAGE_SIZE),
  readCredits: ({ people }: { people: readonly unknown[] }) => readSearchCredits(Math.max(people.length, 1)),
};

export const PATHS_CHARGE = {
  mostCredits: readPathsCredits(1),
  readCredits: (villagePaths: { paths: readonly unknown[] } | null) => readPathsCredits(villagePaths && villagePaths.paths.length > 0 ? 1 : 0),
};

export function readBulkPathsCharge(linkedinSlugs: readonly string[]) {
  return {
    mostCredits: readPathsCredits(toBulkLinkedinIds(linkedinSlugs).length),
    readCredits: (answered: ReadonlyMap<string, { paths: readonly unknown[] }>) => readPathsCredits([...answered.values()].filter(({ paths }) => paths.length > 0).length),
  };
}

export const FILL_IN_CHARGE = {
  mostCredits: VILLAGE_PRICES.perProfileFound,
  readCredits: (profile: unknown) => (profile === null ? 0 : VILLAGE_PRICES.perProfileFound),
};

export async function searchVillageNetwork(session: VillageSession, prompt: string, scope: typeof NETWORK_SOURCE | typeof GLOBAL_SOURCE = NETWORK_SOURCE) {
  const { results, response } = await session.village.people.search({ prompt, scope, limit: SEARCH_PAGE_SIZE }, withinDeadline(session, VILLAGE_TIMEOUTS_MS.search));
  return { people: results, source: response.metadata.source };
}

const pathProfileSchema = z.object({
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  linkedin_url: z.string().nullish(),
  headline: z.string().nullish(),
  avatar: z.string().nullish(),
});

const scoreMetaSchema = z.array(z.object({ title: z.string().nullish(), description: z.string().nullish() })).nullish();

const pathTargetSchema = z.object({
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  full_name: z.string().nullish(),
  headline: z.string().nullish(),
  avatar: z.string().nullish(),
  image_url: z.string().nullish(),
});

const pathSummarySchema = z.object({
  score_label: z.string().nullish(),
  description: z.string().nullish(),
});

export const villagePathsSchema = z.object({
  person: pathTargetSchema.nullish(),
  summary: pathSummarySchema.nullish(),
  paths: z.array(
    z.object({
      degree: z.number(),
      summary: pathSummarySchema,
      starters: z.array(
        z.object({ profile: pathProfileSchema, is_current_user: z.boolean().nullish(), score_meta: scoreMetaSchema }),
      ),
      introducer: z.object({ profile: pathProfileSchema, score_meta: scoreMetaSchema }).nullish(),
    }),
  ),
});

export type VillagePaths = z.infer<typeof villagePathsSchema>;

export async function readVillagePaths(session: VillageSession, linkedinUrl: string) {
  const villagePaths = await session.village.people.paths(linkedinUrl, withinDeadline(session, VILLAGE_TIMEOUTS_MS.paths));
  if (villagePaths === null) return null;
  const parsed = villagePathsSchema.safeParse(villagePaths);
  if (parsed.success) return parsed.data;
  throw new VillageError({ code: "invalid_response", status: 200, message: "Village's paths weren't in the expected shape." });
}

// Up to this many people per bulk call (Village's own limit is 100).
export const PATHS_BULK_MAXIMUM = 100;
// Village's bulk call takes bare slugs only. One id outside this pattern (an accented or very short LinkedIn name, which
// "Everywhere" results often carry) fails the whole call, so such a person is left out and can be looked up alone.
const BULK_LINKEDIN_ID_PATTERN = /^[a-z0-9-]{3,100}$/;

const bulkTargetSchema = z.object({ linkedin_identifier: z.string().nullish(), linkedin_url: z.string().nullish() }).passthrough();
const bulkPathsSchema = z.array(villagePathsSchema.omit({ person: true }).extend({ target: bulkTargetSchema.nullish() }));

// The ids one bulk call sends for these slugs: lowercased, once each, Village's pattern only, at most 100.
export function toBulkLinkedinIds(linkedinSlugs: readonly string[]) {
  const ids = [...new Set(linkedinSlugs.map((slug) => slug.toLowerCase()))].filter((slug) => BULK_LINKEDIN_ID_PATTERN.test(slug));
  return ids.slice(0, PATHS_BULK_MAXIMUM);
}

// TODO(@villagehq/sdk): the SDK has no call for POST /v2/people/paths/bulk, so this goes through its typed client.
// The paths for one page of search results in one call, keyed by the LinkedIn slug Village answered for.
export async function readVillagePathsBulk(session: VillageSession, linkedinSlugs: readonly string[]) {
  const answered = new Map<string, VillagePaths>();
  const ids = toBulkLinkedinIds(linkedinSlugs);
  if (ids.length === 0) return answered;
  let data: unknown;
  try {
    data = await sendVillageApi(session, "people.pathsBulk", VILLAGE_TIMEOUTS_MS.paths, (signal) =>
      session.village.api.POST("/v2/people/paths/bulk", { body: { linkedin_ids: ids }, signal }),
    );
  } catch (error) {
    if (isVillageError(error, "not_found")) return answered;
    throw error;
  }
  const parsed = bulkPathsSchema.safeParse(data);
  if (!parsed.success) throw new VillageError({ code: "invalid_response", status: 200, message: "Village's bulk paths weren't in the expected shape." });
  for (const { target, ...paths } of parsed.data) {
    const slug = (target?.linkedin_identifier ?? target?.linkedin_url?.replace(/\/+$/, "").split("/in/")[1] ?? "").toLowerCase();
    if (slug) answered.set(slug, { ...paths, person: null });
  }
  return answered;
}

// Profile fill-in runs as one "public" identity of the app, never as a member, so a lookup can't
// create a Village user or touch anyone's network.
const LOOKUP_IDENTITY_ID = "community-profile-fill-in";
const LOOKUP_MODE = "cached_first";

export function createVillageLookupSession(connection: VillageConnection, email: string): VillageSession {
  const { admin, onRequest } = readVillageAdmin(connection);
  return { village: admin.as({ id: LOOKUP_IDENTITY_ID, email, grant: "public" }), deadlineAtMs: connection.deadlineAtMs, onRequest };
}

const companySchema = z.object({ name: z.string().nullish(), domain: z.string().nullish(), image_url: z.string().nullish() }).nullish();
const workSchema = z.object({ title: z.string().nullish(), company: companySchema }).nullish();

export const villageProfileSchema = z.object({
  linkedin_url: z.string().nullish(),
  avatar: z.string().nullish(),
  headline: z.string().nullish(),
  location: z.object({ city: z.string().nullish(), state: z.string().nullish(), country: z.string().nullish() }).nullish(),
  work_relevant: workSchema,
  work_history: z.array(workSchema).nullish(),
  last_enrichment_at: z.string().nullish(),
});

export type VillageProfile = z.infer<typeof villageProfileSchema>;

function parseVillageProfile(profile: unknown) {
  const parsed = villageProfileSchema.safeParse(profile);
  if (parsed.success) return parsed.data;
  throw new VillageError({ code: "invalid_response", status: 200, message: "Village's profile wasn't in the expected shape." });
}

// TODO(@villagehq/sdk): the SDK's own error mapping (toVillageError) isn't exported, and `village.api` calls skip both it
// and `onRequest`. This does what the SDK does for its named calls: one VillageError per failed answer, read from
// Village's error type first (409 network_not_synced, 402 insufficient_credits), then its status; and one report to the
// same hook, so these calls reach the failure log and the admin's Village health too.
const ERROR_CODE_BY_TYPE: Record<string, VillageError["code"]> = {
  not_connected: "not_connected",
  network_not_synced: "not_synced",
  app_access_revoked: "app_access_revoked",
  user_required: "user_required",
  test_mode_unsupported: "test_mode_unsupported",
  site_disabled: "site_disabled",
  insufficient_credits: "out_of_credits",
};

const ERROR_CODE_BY_STATUS: Record<number, VillageError["code"]> = {
  400: "bad_request",
  401: "unauthorized",
  402: "out_of_credits",
  403: "forbidden",
  404: "not_found",
  409: "conflict",
  422: "validation",
  429: "rate_limited",
};

const SERVER_ERROR_STATUS = 500;
const TIMEOUT_ERROR_NAME = "TimeoutError";
const PAYER_VALUES: ReadonlySet<string> = new Set(Object.values(VILLAGE_PAYERS));

function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readText(source: Record<string, unknown> | null, field: string) {
  const value = source?.[field];
  return typeof value === "string" ? value : null;
}

// Village's errors nest `{ type, detail, meta }` under `error`; the 402 and 429 answers are flat (`{ error, message }`).
export function toVillageApiError(response: Response, body: unknown) {
  const record = readRecord(body);
  const nested = readRecord(record?.error);
  const type = readText(nested, "type") ?? readText(record, "error");
  const reason = readText(readRecord(nested?.meta), "reason");
  const status = response.status;
  const code = ERROR_CODE_BY_TYPE[reason ?? ""] ?? ERROR_CODE_BY_TYPE[type ?? ""] ?? (status >= SERVER_ERROR_STATUS ? "server" : (ERROR_CODE_BY_STATUS[status] ?? "bad_request"));
  const payer = readText(record, "payer");
  return new VillageError({
    code,
    status,
    message: readText(nested, "detail") ?? readText(record, "message") ?? `Village answered ${status}.`,
    requestId: response.headers.get("x-request-id") ?? readText(readRecord(record?.metadata), "request_id"),
    traceId: readText(nested, "trace_id"),
    topupUrl: readText(record, "topup_url"),
    payer: payer !== null && PAYER_VALUES.has(payer) ? (payer as Payer) : null,
  });
}

function toTransportError(cause: unknown) {
  if (isVillageError(cause)) return cause;
  const isTimeout = cause instanceof Error && cause.name === TIMEOUT_ERROR_NAME;
  return new VillageError({ code: isTimeout ? "timeout" : "network", message: isTimeout ? "Village took too long to answer." : "Couldn't reach Village.", cause });
}

type VillageApiAnswer = { data?: unknown; error?: unknown; response: Response };

// One `village.api` call within the session's time budget. Returns the answer's `data`; throws a VillageError otherwise.
async function sendVillageApi(session: VillageSession, operation: string, usualTimeoutMs: number, call: (signal: AbortSignal) => Promise<VillageApiAnswer>) {
  const signal = AbortSignal.timeout(withinDeadline(session, usualTimeoutMs).timeoutMs ?? usualTimeoutMs);
  const startedAtMs = Date.now();
  const report = (status: number | null, requestId: string | null, error: VillageError | null) =>
    session.onRequest({ operation, durationMs: Date.now() - startedAtMs, status, requestId, error });
  let answer: VillageApiAnswer;
  try {
    answer = await call(signal);
  } catch (cause) {
    const error = toTransportError(cause);
    report(error.status, error.requestId, error);
    throw error;
  }
  const { data, error: body, response } = answer;
  const requestId = response.headers.get("x-request-id");
  const payload = readRecord(data)?.data;
  if (response.ok && payload !== undefined) {
    report(response.status, requestId, null);
    return payload;
  }
  const error = response.ok
    ? new VillageError({ code: "invalid_response", status: response.status, requestId, message: "Village returned an empty response." })
    : toVillageApiError(response, body);
  report(response.status, requestId, error);
  throw error;
}

// TODO(@villagehq/sdk): the SDK has no call for POST /v2/people/enrich/by-email, so this goes through its typed client.
// Village's 404 means nobody has that email.
export async function readVillageProfileByEmail(session: VillageSession, email: string) {
  try {
    const profile = await sendVillageApi(session, "people.enrichByEmail", VILLAGE_TIMEOUTS_MS.default, (signal) =>
      session.village.api.POST("/v2/people/enrich/by-email", { body: { email, mode: LOOKUP_MODE }, signal }),
    );
    return parseVillageProfile(profile);
  } catch (error) {
    if (isVillageError(error, "not_found")) return null;
    throw error;
  }
}

export async function readVillageProfile(session: VillageSession, linkedinUrl: string) {
  try {
    return parseVillageProfile(await session.village.people.enrich(linkedinUrl, withinDeadline(session)));
  } catch (error) {
    if (isVillageError(error, "not_found")) return null;
    throw error;
  }
}

// TODO(@villagehq/sdk): the SDK has no call for POST /v2/user/cancel, so this goes through the member's typed client.
// Village deactivates that user and revokes every token it has. A new token doesn't bring them back: only consenting
// again in Village's connect step does, so this runs only before a real delete.
export async function cancelVillageUser(connection: VillageConnection, identity: VillageIdentity) {
  const session = createVillageSession(connection, identity);
  await sendVillageApi(session, "user.cancel", VILLAGE_TIMEOUTS_MS.default, (signal) => session.village.api.POST("/v2/user/cancel", { signal }));
}
