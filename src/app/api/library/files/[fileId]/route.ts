import { z } from "zod";

import { LIBRARY_FILE_TYPES, readFileExtension } from "@/modules/library/contract";
import { readLibraryFile, readLibraryViewer } from "@/modules/library/reads";
import { libraryRoutes } from "@/modules/library/routes";
import { countLibraryDownload } from "@/modules/library/service";
import { getDatabase } from "@/platform/database/client";
import { readSessionMember } from "@/platform/http/member-route";

const UNAUTHORIZED_STATUS = 401;
const NOT_FOUND_STATUS = 404;

// Always a download, never shown inline, so a shared file can't run as a page of this site.
const FILE_RESPONSE_HEADERS = {
  "Cache-Control": "private, no-store",
  "Cross-Origin-Resource-Policy": "same-origin",
  "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; sandbox",
};

function toDispositionName(name: string) {
  const plain = name.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${plain}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export const GET = libraryRoutes.open("library-file-read", async (request: Request, { params }: { params: Promise<{ fileId: string }> }) => {
  const member = await readSessionMember(request);
  if (!member) return Response.json({ message: "Sign in to continue." }, { status: UNAUTHORIZED_STATUS });
  const { fileId } = await params;
  if (!z.uuid().safeParse(fileId).success) return Response.json({ message: "No such file." }, { status: NOT_FOUND_STATUS });
  const database = getDatabase();
  const file = await readLibraryFile(database, await readLibraryViewer(database, member), fileId);
  if (!file) return Response.json({ message: "No such file." }, { status: NOT_FOUND_STATUS });
  await countLibraryDownload(database, file.itemId);
  const extension = readFileExtension(file.name);
  return new Response(new Uint8Array(file.bytes), {
    headers: {
      ...FILE_RESPONSE_HEADERS,
      "Content-Type": extension ? LIBRARY_FILE_TYPES[extension] : "application/octet-stream",
      "Content-Length": String(file.bytes.byteLength),
      "Content-Disposition": toDispositionName(file.name),
    },
  });
});
