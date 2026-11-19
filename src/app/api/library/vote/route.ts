import { libraryVoteBodySchema } from "@/modules/library/contract";
import { libraryRoutes } from "@/modules/library/routes";
import { setLibraryVote } from "@/modules/library/service";

export const POST = libraryRoutes.member("library-vote", libraryVoteBodySchema, async (context, body) => Response.json(await setLibraryVote(context, body)));
