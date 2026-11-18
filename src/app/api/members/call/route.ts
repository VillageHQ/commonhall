import { callRequestBodySchema } from "@/modules/members/contract-community-roles";
import { recordCallRequest } from "@/modules/members/service-booking";
import { membersRoutes } from "@/modules/members/routes";
import { wereIntroducedForBooking } from "@/shell/booking-access";

// "Book a call": records the click, then the page opens the link it already shows.
export const POST = membersRoutes.member("member-call-request", callRequestBodySchema, async (context, { memberId }) =>
  Response.json({ bookingUrl: await recordCallRequest(context, memberId, wereIntroducedForBooking) }),
);
