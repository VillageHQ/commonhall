// Which community the app opens: the address a member types (or an invite link they paste), checked to be a
// Commonhall server before the portal opens, so a wrong address shows a plain error, never a blank page.

export type Community = { origin: string; name: string };

export type AddressResult = { ok: true; origin: string; path: string | null } | { ok: false; message: string };

export type CheckResult = { ok: true; community: Community } | { ok: false; message: string };

export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{ ok: boolean; status: number; text: () => Promise<string> }>;

const EMPTY_MESSAGE = "Type your community's address, like community.example.com.";
const BAD_ADDRESS_MESSAGE = "That doesn't look like an address. Type it like community.example.com.";
const CHECK_TIMEOUT_MS = 10_000;
// Plain http only on this computer or the local network (a test copy); everywhere else the portal is https.
const LOCAL_HOST_PATTERN = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|\[::1\])$/;

export function isLocalHost(hostname: string) {
  return LOCAL_HOST_PATTERN.test(hostname);
}

export function readAddress(input: string): AddressResult {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, message: EMPTY_MESSAGE };
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return { ok: false, message: BAD_ADDRESS_MESSAGE };
  }
  const isLocal = isLocalHost(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && isLocal)) {
    return { ok: false, message: "Use the https:// address your fund sent you." };
  }
  if (!isLocal && !url.hostname.includes(".")) return { ok: false, message: BAD_ADDRESS_MESSAGE };
  if (url.username || url.password) return { ok: false, message: "Type the address without a name or password in it." };
  const path = url.pathname !== "/" || url.search ? `${url.pathname}${url.search}` : null;
  return { ok: true, origin: url.origin, path };
}

function readJson(text: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

// Asks the address's /api/health: a Commonhall server answers `app: "commonhall"`. Then its web app manifest gives
// the community's name for the list of communities on this phone.
export async function checkCommunity(origin: string, fetchLike: FetchLike = fetch as unknown as FetchLike): Promise<CheckResult> {
  const host = new URL(origin).host;
  let health: Record<string, unknown> | null;
  let status: number;
  try {
    const response = await fetchLike(`${origin}/api/health`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) });
    status = response.status;
    health = readJson(await response.text());
  } catch {
    return { ok: false, message: `We couldn't reach ${host}. Check the address and your connection, then try again.` };
  }
  if (health?.app !== "commonhall") return { ok: false, message: `${host} isn't a Commonhall community. Check the address your fund sent you.` };
  if (status !== 200 || health.status !== "ok") return { ok: false, message: `${host} isn't answering right now. Try again in a minute.` };

  let name = host;
  try {
    const manifest = readJson(await (await fetchLike(`${origin}/manifest.webmanifest`, { signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) })).text());
    if (typeof manifest?.name === "string" && manifest.name.trim()) name = manifest.name.trim();
  } catch {}
  return { ok: true, community: { origin, name } };
}
