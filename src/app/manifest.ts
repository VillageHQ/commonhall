import type { MetadataRoute } from "next";

import { readBrandingForPage } from "@/platform/branding/branding";
import { ROUTES } from "@/platform/http/routes";
import { APP_ICON_SIZES } from "@/platform/notifications/app-icon";
import { NOTIFICATION_API_ROUTES } from "@/platform/notifications/contract";

// The installable web app: the fund's name, colour and icon (drawn from its logo), opening on Today.
const PAPER = "#fafaf7";

const SHORT_NAME_LENGTH = 12;

export const dynamic = "force-dynamic";

// Home screens show about 12 characters: the whole name when it fits, else its first words that do.
function toShortName(name: string) {
  if (name.length <= SHORT_NAME_LENGTH) return name;
  const words = name.split(/\s+/);
  let short = words[0] ?? name;
  for (const word of words.slice(1)) {
    if (`${short} ${word}`.length > SHORT_NAME_LENGTH) break;
    short = `${short} ${word}`;
  }
  return short.slice(0, SHORT_NAME_LENGTH);
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const branding = await readBrandingForPage();
  return {
    id: "/",
    name: branding.name,
    short_name: toShortName(branding.name),
    description: branding.descriptor || `${branding.name}: the community.`,
    start_url: ROUTES.today,
    scope: "/",
    display: "standalone",
    background_color: PAPER,
    theme_color: branding.accentColor,
    icons: APP_ICON_SIZES.flatMap((size) => [
      { src: `${NOTIFICATION_API_ROUTES.icon}?size=${size}`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" as const },
      { src: `${NOTIFICATION_API_ROUTES.icon}?size=${size}`, sizes: `${size}x${size}`, type: "image/png", purpose: "maskable" as const },
    ]),
  };
}
