import { getDatabase } from "@/platform/database/client";
import { readBranding, readLogo } from "@/platform/branding/branding";
import { parseIconSize, readPublicLogo, renderAppIcon } from "@/platform/notifications/app-icon";
import { platformRoutes } from "@/platform/modules/platform-routes";

// Drawn per request from the saved branding, never at build time.
export const dynamic = "force-dynamic";

// The installed app's icon (192 or 512 pixels), from the fund's logo or its name and colour. Public: the browser
// fetches it for the home screen and for each alert.
export const GET = platformRoutes.open("notifications-app-icon", async (request: Request) => {
  const database = getDatabase();
  const [branding, uploaded] = await Promise.all([readBranding(database), readLogo(database)]);
  // The logo the app shows: an address set in Settings wins over an upload, as in readBranding.
  const logo = (await readPublicLogo(branding.logo?.url ?? null)) ?? uploaded;
  return renderAppIcon(branding, logo, parseIconSize(new URL(request.url).searchParams.get("size")));
});
