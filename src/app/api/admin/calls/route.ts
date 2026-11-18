import { emptyBodySchema } from "@/platform/http/contract";
import { CALLS_CSV_FILE_NAME, renderCallsCsv } from "@/modules/admin/calls";
import { readCallRows } from "@/modules/admin/reads-calls";
import { adminRoutes } from "@/modules/admin/routes";

// Calls requested, as a CSV: every "Book a call" click, who asked whom and when.
export const POST = adminRoutes.member(
  "admin-calls-csv",
  emptyBodySchema,
  async ({ database }) =>
    new Response(renderCallsCsv(await readCallRows(database)), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${CALLS_CSV_FILE_NAME}"`,
        "Cache-Control": "no-store",
      },
    }),
  { adminOnly: true },
);
