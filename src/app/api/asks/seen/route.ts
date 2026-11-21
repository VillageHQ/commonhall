import { asksRoutes } from "@/modules/asks/routes";
import { seenBodySchema } from "@/modules/asks/contract";
import { markOffersSeen } from "@/modules/asks/service";

export const POST = asksRoutes.member("asks-seen", seenBodySchema, async (context, body) => {
  await markOffersSeen(context, body);
  return Response.json({ message: "Marked as seen." });
});
