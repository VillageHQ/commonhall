

export const VILLAGE_PLATFORM_LINKS = {
  home: "https://village.ai/platform",
  checklist: "https://village.ai/platform/onboarding",
  appSettings: "https://village.ai/platform/settings/app-settings",
  apiKeys: "https://village.ai/platform/settings/api-keys",
  usage: "https://village.ai/platform/usage",
  buyCredits: "https://village.ai/platform/settings/billing",
} as const;

// Village's own form for anyone who wants their public profile removed from Village.
export const VILLAGE_PROFILE_REMOVAL_URL = "https://village.ai/landing/remove-my-profile";

// The three pages the Connect Village screen walks through, on whichever Village VILLAGE_APP_URL names.
export function villageConnectLinks(appUrl: string) {
  const base = `${appUrl.replace(/\/+$/, "")}/platform`;
  return { account: base, checklist: `${base}/onboarding`, apiKeys: `${base}/settings/api-keys` };
}
