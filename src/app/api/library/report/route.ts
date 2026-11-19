import { reportLibraryItem } from "@/modules/admin/service-reports";
import { libraryItemIdBodySchema } from "@/modules/library/contract";
import { libraryRoutes } from "@/modules/library/routes";

export const POST = libraryRoutes.member("library-report", libraryItemIdBodySchema, async (context, { itemId }) =>
  Response.json({ message: await reportLibraryItem(context, itemId) }),
);
