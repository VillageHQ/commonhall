"use client";

import { useEffect } from "react";

import { markAnswersReadRequest } from "../queries";

// The author opened their ask with a new answer on it: Today's "Read" line for it goes. A failure only leaves the line.
export function MarkAnswersRead({ askId }: { askId: string }) {
  useEffect(() => {
    void markAnswersReadRequest(askId).catch(() => undefined);
  }, [askId]);
  return null;
}
