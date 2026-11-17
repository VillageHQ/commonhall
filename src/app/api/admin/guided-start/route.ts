import { z } from "zod";

import { adminRoutes } from "@/modules/admin/routes";
import { ROUTES } from "@/platform/http/routes";
import { finishGuidedStart } from "@/shell/guided-start";

// The guided start is finished or skipped: sign-ins land on the console's Home from now on. Answers where to go.
export const POST = adminRoutes.member(
  "admin-guided-start",
  z.object({}),
  async ({ database }) => {
    await finishGuidedStart(database);
    return Response.json({ next: ROUTES.admin });
  },
  { adminOnly: true },
);
