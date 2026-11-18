import { announcementSendBodySchema } from "@/modules/admin/contract-announcements";
import { adminRoutes } from "@/modules/admin/routes";
import { sendAnnouncement } from "@/modules/admin/service-announcements";

export const POST = adminRoutes.member(
  "admin-announcement-send",
  announcementSendBodySchema,
  async (context, body) => Response.json(await sendAnnouncement(context, body)),
  { adminOnly: true },
);
