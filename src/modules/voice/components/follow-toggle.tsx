"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { voiceRequests } from "../queries";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

// Follow on a profile or a room card: "Tell me when Lina starts a room". One tap follows, the same tap unfollows.
export function FollowToggle({ memberId, memberName, isFollowing: initial, size = "sm" }: { memberId: string; memberName: string; isFollowing: boolean; size?: "sm" | "default" }) {
  const [isFollowing, setIsFollowing] = useState(initial);
  const follow = useMutation({
    mutationFn: (next: boolean) => voiceRequests.follow({ memberId, isFollowing: next }),
    onSuccess: (_answer, next) => setIsFollowing(next),
  });
  const hint = `Tell me when ${firstName(memberName)} starts a room`;
  return (
    <Button
      type="button"
      size={size}
      variant={isFollowing ? "secondary" : "quiet"}
      aria-pressed={isFollowing}
      aria-label={isFollowing ? `Following ${memberName}: tap to stop` : hint}
      title={isFollowing ? `You hear when ${firstName(memberName)} starts a room` : hint}
      disabled={follow.isPending}
      onClick={() => follow.mutate(!isFollowing)}
      data-testid="follow"
    >
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
