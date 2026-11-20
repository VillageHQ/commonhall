import { redirect } from "next/navigation";

import { ASKS_PAGE } from "@/modules/asks/contract";
import { asksManifest } from "@/modules/asks/manifest";
import { membersManifest } from "@/modules/members/manifest";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { isModuleEnabled } from "@/platform/modules/enablement";
import { modulePage } from "@/platform/modules/module-page";

// The old guided ask (round 6): "Post an ask" opens the Asks box, or People while Asks is off. Its four choices
// (A customer, A hire, An investor, An expert) are the chips on People.
export default modulePage(membersManifest, async function AskPage() {
  await requireMember();
  redirect((await isModuleEnabled(getDatabase(), asksManifest)) ? `${ASKS_PAGE}?compose=1` : ROUTES.people);
});
