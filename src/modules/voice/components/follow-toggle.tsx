"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, BellRing } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

import { VOICE_QUERY_KEYS, voiceRequests } from "../queries";

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}

type FollowToggleProps = { memberId: string; memberName: string; isFollowing: boolean; isCompact?: boolean };

// Follow on a profile or a room card: "Tell me when Lina starts a room". One tap follows, the same tap unfollows. On a
// room card (`isCompact`) it is a small bell with its word ("Follow", "Following"): a bare bell read as an alert
// switch in the re-study. Every card for the same host follows the change.
export function FollowToggle({ memberId, memberName, isFollowing: initial, isCompact = false }: FollowToggleProps) {
  const queryClient = useQueryClient();
  // The server's answer wins whenever it changes (another card for the same host, the 15-second refresh).
  const [state, setState] = useState({ initial, value: initial });
  if (state.initial !== initial) setState({ initial, value: initial });
  const isFollowing = state.value;
  const follow = useMutation({
    mutationFn: (next: boolean) => voiceRequests.follow({ memberId, isFollowing: next }),
    onSuccess: (_answer, next) => {
      setState((current) => ({ ...current, value: next }));
      void queryClient.invalidateQueries({ queryKey: VOICE_QUERY_KEYS.rooms });
      void queryClient.invalidateQueries({ queryKey: VOICE_QUERY_KEYS.following(memberId) });
    },
  });
  const name = firstName(memberName);
  const hint = isFollowing ? `Following ${name}'s rooms` : `Tell me when ${name} starts a room`;
  const Icon = isFollowing ? BellRing : Bell;
  return (
    <Button
      type="button"
      size="sm"
      variant={isFollowing ? "secondary" : "quiet"}
      aria-pressed={isFollowing}
      title={hint}
      disabled={follow.isPending}
      onClick={() => follow.mutate(!isFollowing)}
      data-testid="follow"
    >
      {isCompact ? <Icon aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} /> : null}
      {isFollowing ? "Following" : "Follow"}
    </Button>
  );
}
