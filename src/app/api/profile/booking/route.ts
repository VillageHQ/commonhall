import { bookingBodySchema } from "@/modules/members/contract-community-roles";
import { saveBooking } from "@/modules/members/service-booking";
import { membersRoutes } from "@/modules/members/routes";

export const POST = membersRoutes.member("profile-booking", bookingBodySchema, async (context, body) => {
  await saveBooking(context, body);
  return Response.json({ message: body.bookingUrl ? "Your booking link is saved." : "Your booking link is removed." });
});
