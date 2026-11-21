import { ROUTES } from "@/platform/http/routes";
import { MESSAGE_DRAFT_PARAM } from "@/modules/messages/contract";

export type JobToApplyFor = { memberId: string; title: string; company: string };

// A job with no apply link (added by hand): Apply opens a message to the founder who added it, its first line naming
// the job. Never to yourself; nothing while messages are off.
export function readApplyByMessageHref(viewerId: string, isMessagingOn: boolean) {
  if (!isMessagingOn) return undefined;
  return ({ memberId, title, company }: JobToApplyFor) =>
    memberId === viewerId ? null : `${ROUTES.newMessage}?${new URLSearchParams({ to: memberId, [MESSAGE_DRAFT_PARAM]: `I'd like to apply for ${title} at ${company}.` })}`;
}
