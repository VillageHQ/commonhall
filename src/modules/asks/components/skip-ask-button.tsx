"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { postRequest } from "@/platform/http/post-request";

import { ASK_PAGE_TABS, ASKS_PAGE } from "../contract";
import { ASK_SKIP_ROUTE, skippedAskSchema } from "../contract-today";

// "Not for me" on a For you card: the ask leaves For you, Today and the weekly email for this member (the same skip as
// Today's). Its author isn't told.
export function SkipAskButton({ askId }: { askId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  async function skip() {
    setIsPending(true);
    setError(null);
    try {
      await postRequest(ASK_SKIP_ROUTE, { askId }, skippedAskSchema);
      router.push(`${ASKS_PAGE}?tab=${ASK_PAGE_TABS.forYou}&m=skipped`);
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Something went wrong. Try again.");
      setIsPending(false);
    }
  }
  return (
    <>
      <button type="button" className="fh-react" disabled={isPending} onClick={() => void skip()}>
        <span className="underline">Not for me</span>
      </button>
      {error ? (
        <span className="fh-hint fh-err" role="alert">
          {error}
        </span>
      ) : null}
    </>
  );
}
