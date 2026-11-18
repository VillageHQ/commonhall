import { ANNOUNCEMENT_API, announcementSentSchema, announcementTestSentSchema, type AnnouncementSendBody, type AnnouncementTestBody } from "@/modules/admin/contract-announcements";
import { postRequest } from "@/platform/http/post-request";

export function sendAnnouncementRequest(body: AnnouncementSendBody) {
  return postRequest(ANNOUNCEMENT_API.send, body, announcementSentSchema);
}

export function sendAnnouncementTestRequest(body: AnnouncementTestBody) {
  return postRequest(ANNOUNCEMENT_API.test, body, announcementTestSentSchema);
}
