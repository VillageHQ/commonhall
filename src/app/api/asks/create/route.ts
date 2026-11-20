import { ASK_ERROR_CODES, ASK_KINDS, createAskBodySchema } from "@/modules/asks/contract";
import { ASK_POSTING_KINDS, enforceAskPostingLimit } from "@/modules/asks/limits";
import { asksRoutes } from "@/modules/asks/routes";
import { createAsk } from "@/modules/asks/service";
import { routeAskToHelpers } from "@/modules/asks/service-helpers";
import { RequestError } from "@/platform/http/request-error";
import { logError } from "@/platform/observability/route-logging";
import { assertPostAllowance, findAskPaths } from "@/shell/ask-helpers";
import { readCheckedHiringJobId } from "@/shell/find-candidates";

const NOT_FOUND_STATUS = 404;

// The ask is already saved, so a failure finding helpers must not look like a failed post: a retry would post it twice.
async function routeSafely(...routeArguments: Parameters<typeof routeAskToHelpers>) {
  try {
    return await routeAskToHelpers(...routeArguments);
  } catch (error) {
    logError("ask-helper-routing", error);
    return 0;
  }
}

export const POST = asksRoutes.member("asks-create", createAskBodySchema, async (context, body) => {
  await enforceAskPostingLimit(context.database, context.member.id, ASK_POSTING_KINDS.ask);
  // A hiring request from a job uses no weekly ask, once the job checks out (round 7).
  const isHiringRequest = body.kind === ASK_KINDS.ask && body.hiringJobId !== null;
  const checkedHiringJobId = isHiringRequest ? await readCheckedHiringJobId(context.database, context.member, body.hiringJobId ?? "") : null;
  if (isHiringRequest && !checkedHiringJobId) {
    throw new RequestError(NOT_FOUND_STATUS, ASK_ERROR_CODES.notFound, "That job isn’t on the board anymore, or isn’t yours to hire for. Post this as an ordinary ask instead.");
  }
  const { id } = await createAsk(context, body, assertPostAllowance, { checkedHiringJobId });
  const helperCount = body.kind === ASK_KINDS.ask ? await routeSafely(context, id, findAskPaths) : 0;
  return Response.json({ id, helperCount });
});
