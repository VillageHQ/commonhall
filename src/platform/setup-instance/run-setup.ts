import { API_ROUTES, AUTH_BASE_PATH } from "../http/routes.ts";
import type { LoadedSetup, SetupSecrets } from "./setup-file.ts";
import { SETUP_SECRET_VARIABLES } from "./setup-file.ts";

// `pnpm setup:instance`: sets up a community through the same HTTP routes the Set up pages use, signed in as the
// admin like a person. No route of its own and no database access: whatever the pages refuse, this refuses too.
const ROUTES = {
  setup: API_ROUTES.setup,
  signIn: `${AUTH_BASE_PATH}/sign-in/email`,
  brand: API_ROUTES.branding,
  logo: API_ROUTES.brandingLogo,
  villageKeys: "/api/admin/village/keys",
  importMembers: "/api/admin/invites/import",
  waitingMembers: API_ROUTES.waitingMembers,
  confirmMember: API_ROUTES.memberConfirm,
} as const;

const CREATED_STATUS = 201;
const NOT_FOUND_STATUS = 404;
const CONFLICT_STATUS = 409;

// Made-up founders for --demo: example.com addresses only, so nobody real is ever invited.
export const DEMO_FOUNDERS_CSV = [
  "name,email,company,cohort",
  "Ada Lindqvist,ada@example.com,Fernway Labs,Demo 2026",
  "Bruno Okafor,bruno@example.com,Tidepool Health,Demo 2026",
  "Chen Moreau,chen@example.com,Quillstack,Demo 2026",
  "Dara Haddad,dara@example.com,Northlight Energy,Demo 2025",
  "Esme Varga,esme@example.com,Brightfold,Demo 2025",
].join("\n");

export type SetupStep = { step: string; outcome: "done" | "skipped" | "failed" | "person"; detail: string };

export type SetupOptions = {
  url: string;
  loaded: LoadedSetup;
  secrets: SetupSecrets;
  demo: boolean;
  fetchImpl?: typeof fetch;
  print?: (step: SetupStep) => void;
};

type JsonBody = { message?: string; [key: string]: unknown };

class SetupStopped extends Error {}

async function readJson(response: Response): Promise<JsonBody> {
  try {
    return (await response.json()) as JsonBody;
  } catch {
    return {};
  }
}

function reasonOf(response: Response, body: JsonBody) {
  return typeof body.message === "string" && body.message ? body.message : `HTTP ${response.status}`;
}

// One signed-in session against the app: sends the app's own origin (the routes refuse any other) and the cookie.
function createSession(appUrl: string, fetchImpl: typeof fetch) {
  const origin = new URL(appUrl).origin;
  let cookie = "";
  async function call(path: string, init: { method?: string; json?: unknown; bytes?: Uint8Array; contentType?: string } = {}) {
    const headers: Record<string, string> = { Origin: origin };
    if (cookie) headers.Cookie = cookie;
    let body: BodyInit | undefined;
    if (init.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(init.json);
    } else if (init.bytes) {
      headers["Content-Type"] = init.contentType ?? "application/octet-stream";
      body = new Uint8Array(init.bytes);
    }
    const response = await fetchImpl(new URL(path, origin), { method: init.method ?? "POST", headers, body, redirect: "manual" });
    return { response, body: await readJson(response) };
  }
  function keepCookies(response: Response) {
    const fresh = response.headers.getSetCookie().map((line) => line.split(";")[0] ?? "").filter(Boolean);
    if (fresh.length > 0) cookie = fresh.join("; ");
    return fresh.length > 0;
  }
  return { call, keepCookies };
}

export async function runSetup({ url, loaded, secrets, demo, fetchImpl = fetch, print = () => {} }: SetupOptions): Promise<{ ok: boolean; steps: SetupStep[] }> {
  const steps: SetupStep[] = [];
  const record = (step: SetupStep) => {
    steps.push(step);
    print(step);
  };
  const stop = (step: string, detail: string): never => {
    record({ step, outcome: "failed", detail });
    throw new SetupStopped(detail);
  };
  const { setup, logo, membersCsv } = loaded;
  const session = createSession(url, fetchImpl);

  try {
    // 1. The first admin, with the setup token. An instance that already has one goes straight to sign-in.
    if (!secrets.adminPassword) stop("Admin", `Set ${SETUP_SECRET_VARIABLES.adminPassword} to the admin's password (at least 12 characters).`);
    if (secrets.setupToken) {
      const { response, body } = await session.call(ROUTES.setup, {
        json: { token: secrets.setupToken, name: setup.admin.name, email: setup.admin.email, password: secrets.adminPassword },
      });
      if (response.status === CREATED_STATUS) record({ step: "Admin", outcome: "done", detail: `Created ${setup.admin.email}.` });
      else if (response.status === CONFLICT_STATUS) record({ step: "Admin", outcome: "skipped", detail: "An admin already exists; signing in with the password." });
      else stop("Admin", reasonOf(response, body));
    } else {
      record({ step: "Admin", outcome: "skipped", detail: `${SETUP_SECRET_VARIABLES.setupToken} is not set, so no admin is created; signing in as an existing one. On a new instance, set it.` });
    }

    // 2. Sign in like a person and keep the session cookie.
    const signIn = await session.call(ROUTES.signIn, { json: { email: setup.admin.email, password: secrets.adminPassword } });
    if (!signIn.response.ok || !session.keepCookies(signIn.response)) {
      stop("Sign in", `Could not sign in as ${setup.admin.email}: ${reasonOf(signIn.response, signIn.body)}`);
    }
    record({ step: "Sign in", outcome: "done", detail: `Signed in as ${setup.admin.email}.` });

    // 3. The look: the logo first, so a refused logo changes nothing; then the name, descriptor and colour (the brand
    // card's save, which leaves mail and hosting settings alone).
    if (setup.brand) {
      if (logo) {
        const saved = await session.call(`${ROUTES.logo}?backdrop=${setup.brand.logoBackdrop}`, { bytes: logo });
        if (!saved.response.ok) stop("Logo", reasonOf(saved.response, saved.body));
        record({ step: "Logo", outcome: "done", detail: `Uploaded ${setup.brand.logo} (${logo.byteLength} bytes).` });
      }
      const { response, body } = await session.call(ROUTES.brand, {
        json: { name: setup.brand.name, descriptor: setup.brand.descriptor, accentColor: setup.brand.accent },
      });
      if (!response.ok) stop("Look", reasonOf(response, body));
      record({ step: "Look", outcome: "done", detail: `Name "${setup.brand.name}", colour ${setup.brand.accent}${setup.brand.descriptor ? `, descriptor "${setup.brand.descriptor}"` : ", no descriptor"}.` });
    } else {
      record({ step: "Look", outcome: "skipped", detail: "No brand in the setup file." });
    }

    // 4. Village keys: tried with Village, then saved; a refused key changes nothing. It is reported and the rest goes on.
    if (!setup.village) {
      record({ step: "Village", outcome: "skipped", detail: "No village.publicKey in the setup file; connect it later in Set up › Village." });
    } else if (!secrets.villageSecretKey) {
      record({ step: "Village", outcome: "skipped", detail: `${SETUP_SECRET_VARIABLES.villageSecretKey} is not set; connect it later in Set up › Village.` });
    } else {
      const { response, body } = await session.call(ROUTES.villageKeys, { json: { publicKey: setup.village.publicKey, secretKey: secrets.villageSecretKey } });
      const appName = typeof body.appName === "string" && body.appName ? body.appName : "your Village app";
      const notice = typeof body.notice === "string" && body.notice ? ` ${body.notice}` : "";
      if (response.ok) record({ step: "Village", outcome: "done", detail: `Connected to ${appName}: Village accepted both keys and they are saved.${notice}` });
      else if (response.status === NOT_FOUND_STATUS) record({ step: "Village", outcome: "skipped", detail: "The Network module is off, so there is nothing to connect." });
      else record({ step: "Village", outcome: "failed", detail: `Not connected: ${reasonOf(response, body)} Keys saved before stay as they were.` });
    }

    // 5. Members from the CSV, and 7. the made-up founders: email always off, so nobody is emailed.
    const imports: { label: string; csv: string; basis: string; termsDate?: string }[] = [];
    if (setup.members && membersCsv !== null) imports.push({ label: setup.members.csv, csv: membersCsv, basis: setup.members.basis, termsDate: setup.members.termsDate });
    if (demo) imports.push({ label: "made-up founders (--demo)", csv: DEMO_FOUNDERS_CSV, basis: "ask" });
    if (imports.length === 0) record({ step: "Members", outcome: "skipped", detail: "No members.csv in the setup file." });
    for (const { label, csv, basis, termsDate } of imports) {
      const params = new URLSearchParams({ invite: "0", basis });
      if (termsDate) params.set("termsDate", termsDate);
      const { response, body } = await session.call(`${ROUTES.importMembers}?${params}`, { bytes: new TextEncoder().encode(csv), contentType: "text/csv" });
      if (!response.ok) stop("Members", `${label}: ${reasonOf(response, body)}`);
      const skipped = Number(body.notImportedCount ?? 0);
      record({ step: "Members", outcome: "done", detail: `${label}: ${Number(body.importedCount ?? 0)} invited without email, ${skipped} not imported.` });
      const lines = (Array.isArray(body.notImported) ? body.notImported : []) as { line: number; why: string }[];
      // One line per reason, so a rerun of a long list stays short.
      const linesByReason = Map.groupBy(lines, ({ why }) => why);
      for (const [why, group] of linesByReason) {
        const numbers = group.map(({ line }) => line).join(", ");
        record({ step: "Members", outcome: "skipped", detail: `${label} ${group.length === 1 ? "line" : "lines"} ${numbers}: ${why}` });
      }
      if (skipped > lines.length) record({ step: "Members", outcome: "skipped", detail: `…and ${skipped - lines.length} more lines; the import page in Set up › Members lists them all.` });
    }

    // 6. Confirm members waiting for confirmation, when the file says so. Anyone reported "not me" is left to a person.
    if (setup.confirmWaiting !== false) {
      const { response, body } = await session.call(ROUTES.waitingMembers, { json: {} });
      if (!response.ok) stop("Confirm", reasonOf(response, body));
      const waiting = (body.members ?? []) as { id: string; email: string; isReportedNotThem: boolean }[];
      const wanted = Array.isArray(setup.confirmWaiting) ? new Set(setup.confirmWaiting.map((email) => email.toLowerCase())) : null;
      let confirmed = 0;
      for (const member of waiting) {
        if (wanted && !wanted.has(member.email.toLowerCase())) continue;
        if (member.isReportedNotThem) {
          record({ step: "Confirm", outcome: "person", detail: `${member.email} was reported "not me"; check it in Set up › Members.` });
          continue;
        }
        const result = await session.call(ROUTES.confirmMember, { json: { memberId: member.id } });
        if (!result.response.ok) stop("Confirm", `${member.email}: ${reasonOf(result.response, result.body)}`);
        confirmed += 1;
      }
      record({ step: "Confirm", outcome: "done", detail: `${confirmed} confirmed, ${waiting.length} were waiting.` });
    }
  } catch (error) {
    if (error instanceof SetupStopped) return { ok: false, steps };
    throw error;
  }

  // What only a person can do.
  record({ step: "For a person", outcome: "person", detail: "Each member connects their own network on Village's screen, from their profile." });
  record({ step: "For a person", outcome: "person", detail: "Invites were made without email: copy each link from Set up › Sign-in links, or send them once mail is set up." });
  return { ok: steps.every(({ outcome }) => outcome !== "failed"), steps };
}
