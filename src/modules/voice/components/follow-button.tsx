import "server-only";

import { requireMember } from "@/platform/auth/session";
import { getDatabase } from "@/platform/database/client";
import { isModuleEnabled } from "@/platform/modules/enablement";

import { voiceManifest } from "../manifest";
import { readIsFollowing } from "../service";
import { FollowToggle } from "./follow-toggle";

// Follow on a member's profile (the room notify spec): reads whether the viewer follows them, and shows nothing while
// Rooms is off or on the viewer's own profile.
export async function FollowButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const viewer = await requireMember();
  const database = getDatabase();
  if (viewer.id === memberId || !(await isModuleEnabled(database, voiceManifest))) return null;
  return <FollowToggle memberId={memberId} memberName={memberName} isFollowing={await readIsFollowing(database, viewer.id, memberId)} />;
}
