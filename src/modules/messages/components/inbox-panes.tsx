"use client";

import Link from "next/link";
import { useSearchParams, useSelectedLayoutSegment } from "next/navigation";
import { useLayoutEffect, useRef, type ReactNode } from "react";

import { CHIP_CLASSES } from "@/components/ui/chip";
import { ROUTES } from "@/platform/http/routes";

import "./inbox.css";

// From this width the Inbox is two panes: the list and the open thread (the app's one breakpoint).
const WIDE_QUERY = "(min-width: 1000px)";
// What the card leaves under it, so its foot shows above the window's edge.
const FOOT_GAP_PX = 24;
const MINIMUM_CARD_PX = 420;
const INTROS_FILTER = "intros";

// On the web the card fills the window under whatever sits above it (the demo banner, the founder-view strip, the
// page's top padding), so each pane scrolls on its own. On a phone the page scrolls, so nothing is set.
export function useFillHeight<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof window.matchMedia !== "function") return;
    const wide = window.matchMedia(WIDE_QUERY);
    const fit = () => {
      if (!wide.matches) {
        element.style.removeProperty("height");
        return;
      }
      const top = element.getBoundingClientRect().top + window.scrollY;
      element.style.height = `${Math.max(MINIMUM_CARD_PX, window.innerHeight - top - FOOT_GAP_PX)}px`;
    };
    fit();
    window.addEventListener("resize", fit);
    wide.addEventListener("change", fit);
    return () => {
      window.removeEventListener("resize", fit);
      wide.removeEventListener("change", fit);
    };
  }, []);
  return ref;
}

function InboxFilter({ isIntros }: { isIntros: boolean }) {
  return (
    <nav aria-label="Show" className="fh-chips ib-chips">
      <Link href={ROUTES.messages} aria-current={isIntros ? undefined : "page"} className={CHIP_CLASSES}>
        All
      </Link>
      <Link href={ROUTES.inboxIntros} aria-current={isIntros ? "page" : undefined} className={CHIP_CLASSES}>
        Intros
      </Link>
    </nav>
  );
}

type InboxPanesProps = {
  head: ReactNode;
  // The list under All (what waits on you, then the conversations) and under Intros; with messages off, only Intros.
  allView: ReactNode;
  introsView: ReactNode;
  hasFilter: boolean;
  // The open thread, or the web's "Pick a conversation".
  children: ReactNode;
};

// The Inbox's frame (round 8, ui-polish Part 3). On a phone it shows the list at /inbox and the thread alone at
// /inbox/<id> (a pushed screen). From 1000 px both show side by side in one card: the list in a 360 px pane, the thread
// beside it, and opening a row changes the address, so links and Back work.
export function InboxPanes({ head, allView, introsView, hasFilter, children }: InboxPanesProps) {
  const openId = useSelectedLayoutSegment();
  const show = useSearchParams()?.get("show");
  const isIntros = introsView !== null && (allView === null || show === INTROS_FILTER);
  const cardRef = useFillHeight<HTMLDivElement>();
  return (
    <div ref={cardRef} className="ib-panes" data-open={openId ? "thread" : "list"}>
      <div className="ib-list-pane">
        {head}
        {hasFilter ? <InboxFilter isIntros={isIntros} /> : null}
        <div className="ib-list">{isIntros ? introsView : allView}</div>
      </div>
      <div className="ib-thread-pane">{children}</div>
    </div>
  );
}
