"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { markAnswersReadRequest } from "../queries";

// The author opened their ask with a new answer on it: Today's "Read" line for it goes. The refresh empties the
// browser's copy of earlier pages, so Back lands on a Today without the line. A failure only leaves the line.
export function MarkAnswersRead({ askId }: { askId: string }) {
  const router = useRouter();
  useEffect(() => {
    markAnswersReadRequest(askId).then(
      () => router.refresh(),
      () => undefined,
    );
  }, [askId, router]);
  return null;
}
