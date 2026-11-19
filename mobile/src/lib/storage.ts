import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Community } from "./community";

// The communities this phone joined, newest first, and the one open last. Only addresses and names: the session
// cookie lives in the web view's own cookie store.
const COMMUNITIES_KEY = "commonhall.communities";
const LAST_KEY = "commonhall.last";
const MAXIMUM_REMEMBERED = 10;

export async function readCommunities(): Promise<{ communities: Community[]; lastOrigin: string | null }> {
  const [stored, lastOrigin] = await Promise.all([AsyncStorage.getItem(COMMUNITIES_KEY), AsyncStorage.getItem(LAST_KEY)]);
  let communities: Community[] = [];
  try {
    const parsed: unknown = stored ? JSON.parse(stored) : [];
    if (Array.isArray(parsed)) {
      communities = parsed.filter((item): item is Community => Boolean(item) && typeof item.origin === "string" && typeof item.name === "string");
    }
  } catch {}
  return { communities, lastOrigin };
}

export async function rememberCommunity(community: Community) {
  const { communities } = await readCommunities();
  const next = [community, ...communities.filter(({ origin }) => origin !== community.origin)].slice(0, MAXIMUM_REMEMBERED);
  await AsyncStorage.multiSet([
    [COMMUNITIES_KEY, JSON.stringify(next)],
    [LAST_KEY, community.origin],
  ]);
  return next;
}

export async function forgetLastCommunity() {
  await AsyncStorage.removeItem(LAST_KEY);
}
