"use client";

import { useQuery } from "@tanstack/react-query";

import { VOICE_QUERY_KEYS, voiceRequests } from "../queries";
import { FollowToggle } from "./follow-toggle";

// Follow on a member's profile (the room notify spec). It reads whether the viewer follows them, and shows nothing
// until it knows, on the viewer's own profile, or while Rooms is off (the route answers 404 then).
export function FollowButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const following = useQuery({ queryKey: VOICE_QUERY_KEYS.following(memberId), queryFn: () => voiceRequests.following(memberId), retry: false });
  // No data: still asking, Rooms is off, or the answer didn't come.
  if (!following.data || following.data.isSelf) return null;
  return <FollowToggle memberId={memberId} memberName={memberName} isFollowing={following.data.isFollowing} />;
}
