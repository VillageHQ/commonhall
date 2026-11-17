"use client";

import { ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type AdvancedSectionProps = {
  // One line under "Advanced" naming what is folded inside, so the organizer knows whether to open it.
  summary: string;
  // Opens it from outside each time this changes to a new truthy value, for example a failed save's errors when one
  // of them is on a field inside.
  openWhen?: unknown;
  children: ReactNode;
};

// Set up pages show the essentials; everything else folds under one closed "Advanced" section. A link to an anchor
// inside it (Settings#mail) opens it and scrolls there, so no old link lands on a hidden field.
export function AdvancedSection({ summary, openWhen = null, children }: AdvancedSectionProps) {
  const reference = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [lastOpenWhen, setLastOpenWhen] = useState(openWhen);
  if (openWhen !== lastOpenWhen) {
    setLastOpenWhen(openWhen);
    if (openWhen) setIsOpen(true);
  }

  useEffect(() => {
    function openForHash() {
      const id = decodeURIComponent(window.location.hash.slice(1));
      const target = id ? document.getElementById(id) : null;
      if (!target || !reference.current?.contains(target)) return;
      // Opening the element fires onToggle, which keeps the state in step.
      reference.current.open = true;
      requestAnimationFrame(() => target.scrollIntoView({ block: "start" }));
    }
    openForHash();
    window.addEventListener("hashchange", openForHash);
    return () => window.removeEventListener("hashchange", openForHash);
  }, []);

  return (
    <details ref={reference} id="advanced" className="fh-advanced fh-c12" open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>
        <ChevronRight aria-hidden="true" strokeWidth={1.75} className="fh-advanced-chev" />
        <span>
          <b>Advanced</b>
          <small>{summary}</small>
        </span>
      </summary>
      <div className="fh-advanced-body">{children}</div>
    </details>
  );
}
