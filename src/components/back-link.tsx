"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

// Where the phone's top bar takes a pushed screen's back button: its first child, so the button comes first in the
// keyboard order too (before "Your menu"). The shell renders the slot (app-shell.tsx).
export const BAR_BACK_SLOT = "bar-back";

const subscribeToNothing = () => () => {};

function readBarSlot() {
  return document.querySelector<HTMLElement>(`[data-slot="${BAR_BACK_SLOT}"]`);
}

function BackAnchor({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} data-slot="back-link" className="fh-back">
      <ChevronLeft aria-hidden="true" className="fh-i fh-xs" strokeWidth={1.5} />
      <span>{children}</span>
    </Link>
  );
}

// Commonhall's back link (crop button-quiet-back.png): 500 Graphite, Vellum on hover. On a phone inside the app's
// shell it shows in the top bar as iOS's back button (src/shell/frame.css): once the page runs, a copy goes into the
// bar's first slot and the one in the page hides there; from 1000 px the bar is hidden and the page's link shows. A
// page with its own header hides both.
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  const slot = useSyncExternalStore(subscribeToNothing, readBarSlot, () => null);
  return (
    <>
      <BackAnchor href={href}>{children}</BackAnchor>
      {slot ? createPortal(<BackAnchor href={href}>{children}</BackAnchor>, slot) : null}
    </>
  );
}
