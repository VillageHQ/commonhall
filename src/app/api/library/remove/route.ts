import { libraryItemIdBodySchema } from "@/modules/library/contract";
import { libraryRoutes } from "@/modules/library/routes";
import { removeLibraryItem } from "@/modules/library/service";
import { isAdminMember } from "@/platform/auth/roles";

// The author takes their own item down; an admin removes any item, and that goes in the audit log.
export const POST = libraryRoutes.member("library-remove", libraryItemIdBodySchema, async (context, { itemId }) => {
  await removeLibraryItem(context, itemId, isAdminMember(context.member));
  return Response.json({ message: "Removed from the library." });
});
