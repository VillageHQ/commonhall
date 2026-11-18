import { announcementTestBodySchema } from "@/modules/admin/contract-announcements";
import { adminRoutes } from "@/modules/admin/routes";
import { sendAnnouncementTest } from "@/modules/admin/service-announcements";

export const POST = adminRoutes.member(
  "admin-announcement-test",
  announcementTestBodySchema,
  async (context, body) => Response.json(await sendAnnouncementTest(context, body)),
  { adminOnly: true },
);
