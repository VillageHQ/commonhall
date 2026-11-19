import { libraryReviewBodySchema } from "@/modules/library/contract";
import { libraryRoutes } from "@/modules/library/routes";
import { saveLibraryReview } from "@/modules/library/service";

export const POST = libraryRoutes.member("library-review", libraryReviewBodySchema, async (context, body) => {
  await saveLibraryReview(context, body);
  return Response.json({ message: "Thanks. Your review is on the item." });
});
