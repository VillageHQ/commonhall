import { LIBRARY_TOO_LARGE_MESSAGE, LIBRARY_UPLOAD_BODY_BYTES, libraryItemFieldsSchema, type LibraryUpload } from "@/modules/library/contract";
import { libraryRoutes } from "@/modules/library/routes";
import { publishLibraryItem } from "@/modules/library/service";
import { respondWithError } from "@/platform/http/member-route";
import { RequestError } from "@/platform/http/request-error";
import { REQUEST_ERROR_CODES } from "@/platform/http/error-codes";
import { postNewLibraryItem } from "@/shell/library-publish";

const UNPROCESSABLE_STATUS = 422;

function refuse(message: string, code: string = REQUEST_ERROR_CODES.invalidRequest) {
  return respondWithError({ status: UNPROCESSABLE_STATUS, code, message });
}

// One form, sent as multipart: the item's fields as JSON in "item", and up to ten files in "files". The whole request
// is capped a little above 10 MB; the files' own cap and the secret check run in the service, before anything is saved.
export const POST = libraryRoutes.memberBinary(
  "library-publish",
  { maximumBytes: LIBRARY_UPLOAD_BODY_BYTES, tooLargeMessage: LIBRARY_TOO_LARGE_MESSAGE },
  async (context, bytes, request) => {
    let form: FormData;
    try {
      form = await new Response(new Uint8Array(bytes), { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
    } catch {
      return refuse("The form couldn’t be read. Try again.");
    }
    const itemPart = form.get("item");
    let raw: unknown = null;
    try {
      raw = typeof itemPart === "string" ? JSON.parse(itemPart) : null;
    } catch {
      raw = null;
    }
    const fields = libraryItemFieldsSchema.safeParse(raw);
    if (!fields.success) return refuse(fields.error.issues[0]?.message ?? "The form is invalid.");
    const files: LibraryUpload[] = [];
    for (const part of form.getAll("files")) {
      if (typeof part === "string") continue;
      if (part.size === 0 && part.name === "") continue;
      files.push({ name: part.name.replace(/^.*[\\/]/, ""), bytes: Buffer.from(await part.arrayBuffer()) });
    }
    try {
      const item = await publishLibraryItem(context, fields.data, files);
      await postNewLibraryItem(context, item);
      return Response.json({ id: item.id, message: item.isNew ? "Shared in the library." : "Saved." });
    } catch (error) {
      if (error instanceof RequestError) return respondWithError({ status: error.status, code: error.code, message: error.message });
      throw error;
    }
  },
);
