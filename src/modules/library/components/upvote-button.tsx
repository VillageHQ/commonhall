"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowBigUp } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { postRequest } from "@/platform/http/post-request";

import { LIBRARY_API_ROUTES, libraryVoteResponseSchema } from "../contract";

type UpvoteButtonProps = { itemId: string; upvotes: number; isUpvoted: boolean; isMine: boolean; size?: "sm" | "default" };

// One upvote per member per item; pressing again takes it back. Your own item shows its count, without a button.
export function UpvoteButton({ itemId, upvotes, isUpvoted, isMine, size = "default" }: UpvoteButtonProps) {
  const [state, setState] = useState({ upvotes, isUpvoted });
  const vote = useMutation({
    mutationFn: (next: boolean) => postRequest(LIBRARY_API_ROUTES.vote, { itemId, isUpvoted: next }, libraryVoteResponseSchema),
    onSuccess: (result) => setState(result),
  });
  const label = `${state.upvotes} upvote${state.upvotes === 1 ? "" : "s"}`;
  if (isMine) {
    return (
      <span className="fh-lib-votes fh-small fh-muted" title="Your own item">
        <ArrowBigUp aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
        {label}
      </span>
    );
  }
  return (
    <span className="fh-lib-vote">
      <Button
        type="button"
        variant={state.isUpvoted ? "ink" : "secondary"}
        size={size}
        aria-pressed={state.isUpvoted}
        aria-label={state.isUpvoted ? `Upvoted, ${label}. Press to take it back.` : `Upvote, ${label}`}
        disabled={vote.isPending}
        onClick={() => vote.mutate(!state.isUpvoted)}
      >
        <ArrowBigUp aria-hidden="true" strokeWidth={1.5} />
        {state.upvotes}
      </Button>
      {vote.error ? (
        <span role="alert" className="fh-hint fh-err">
          {vote.error.message}
        </span>
      ) : null}
    </span>
  );
}
