"use client";

import { useEffect } from "react";

import { FlashNote, FLASH_KINDS } from "@/components/flash";

import { QUIET_START_LINE, QUIET_START_PARAM } from "../contract";

// After a start past the day's 3 alerting starts, the host sees one line, once: the address loses its mark as soon as
// it shows, so a reload or a later visit doesn't repeat it.
export function QuietStartNote() {
  useEffect(() => {
    const address = new URL(window.location.href);
    if (!address.searchParams.has(QUIET_START_PARAM)) return;
    address.searchParams.delete(QUIET_START_PARAM);
    window.history.replaceState(window.history.state, "", `${address.pathname}${address.search}${address.hash}`);
  }, []);
  return (
    <div data-testid="quiet-start">
      <FlashNote kind={FLASH_KINDS.needs} className="mb-4">
        {QUIET_START_LINE}
      </FlashNote>
    </div>
  );
}
