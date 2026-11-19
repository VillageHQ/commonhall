// Addresses inside the app: which pages stay in the portal, where an alert or an invite link leads.

export const APP_SCHEME = "commonhall";
export const START_PATH = "/";

// Only a path on the community's own server: never another site, never "//elsewhere".
export function toSafePath(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
  return value;
}

export function toPortalUrl(origin: string, path: string | null) {
  return `${origin}${toSafePath(path) ?? START_PATH}`;
}

export function isSameOrigin(url: string, origin: string) {
  try {
    return new URL(url).origin === origin;
  } catch {
    return false;
  }
}

// What the web view may open itself: the community's pages, and the blank pages a web view uses. Everything else
// (a member's LinkedIn, a perk's site) opens in the phone's browser.
export function opensInPortal(url: string, origin: string) {
  if (url === "about:blank" || url.startsWith("data:") || url.startsWith("blob:")) return true;
  return isSameOrigin(url, origin);
}

// An alert's data carries a path on the server that sent it (notify() keeps it a path).
export function readAlertPath(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  return toSafePath((data as { url?: unknown }).url);
}

// commonhall://join?server=community.example.com&path=/invite/abc opens a community (and a page in it).
export function readJoinLink(url: string): { address: string; path: string | null } | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== `${APP_SCHEME}:`) return null;
  const action = parsed.hostname || parsed.pathname.replace(/^\/+/, "");
  if (action !== "join") return null;
  const address = parsed.searchParams.get("server");
  if (!address) return null;
  return { address, path: toSafePath(parsed.searchParams.get("path")) };
}
