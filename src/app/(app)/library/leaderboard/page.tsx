import type { Metadata } from "next";

import { LibraryLeaderboard } from "@/modules/library/components/library-leaderboard";
import { libraryManifest } from "@/modules/library/manifest";
import { readLeaderboard, readLibraryViewer } from "@/modules/library/reads";
import { parseBoardPeriod, type LibrarySearchParams } from "@/modules/library/rules-page";
import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { modulePage } from "@/platform/modules/module-page";

export const metadata: Metadata = { title: "Library leaderboard" };

type LeaderboardPageProps = { searchParams: Promise<LibrarySearchParams> };

export default modulePage(libraryManifest, async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const member = await requireMember();
  const period = parseBoardPeriod(await searchParams);
  const database = getDatabase();
  const board = await readLeaderboard(database, await readLibraryViewer(database, member), period);
  return <LibraryLeaderboard board={board} period={period} peopleHref={ROUTES.people} />;
});
