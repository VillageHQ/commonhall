import { libraryFeatureBodySchema } from "@/modules/library/contract";
import { libraryRoutes } from "@/modules/library/routes";
import { setLibraryItemFeatured } from "@/modules/library/service";

export const POST = libraryRoutes.member(
  "library-feature",
  libraryFeatureBodySchema,
  async (context, body) => {
    await setLibraryItemFeatured(context, body);
    return Response.json({ message: body.isFeatured ? "Featured at the top of the library." : "No longer featured." });
  },
  { adminOnly: true },
);
