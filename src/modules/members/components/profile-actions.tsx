"use client";

import { Ellipsis } from "lucide-react";
import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";

import "./people.css";

// A button's width with its words on one line: the words' own width, its padding and its border.
function readNaturalWidth(button: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(button);
  const style = getComputedStyle(button);
  const frame = ["paddingLeft", "paddingRight", "borderLeftWidth", "borderRightWidth"] as const;
  return range.getBoundingClientRect().width + frame.reduce((sum, side) => sum + (parseFloat(style[side]) || 0), 0);
}

// Whether two equal buttons (and "More") fit on one line with each label on one line; else they stack. Measured, so a
// long name, a narrow phone or a large text size all stack, and a label never wraps inside a button.
function useIsStacked(count: number) {
  const rowRef = useRef<HTMLDivElement>(null);
  const [isStacked, setIsStacked] = useState(false);
  useLayoutEffect(() => {
    const row = rowRef.current;
    if (!row || count < 2) return;
    const measure = () => {
      const buttons = Array.from(row.querySelectorAll<HTMLElement>(":scope > [data-slot='button']:not(.fh-person-more)")).slice(0, 2);
      const more = row.querySelector<HTMLElement>(":scope > .fh-person-more");
      const gap = parseFloat(getComputedStyle(row).columnGap) || 0;
      const widest = Math.max(...buttons.map(readNaturalWidth));
      const needed = widest * 2 + gap + (more ? more.getBoundingClientRect().width + gap : 0);
      setIsStacked(needed > row.clientWidth + 0.5);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => observer.disconnect();
  }, [count]);
  return { rowRef, isStacked: count >= 2 && isStacked };
}

type ProfileActionsProps = {
  // How many main buttons come before "More" (0, 1 or 2).
  count: number;
  // "More" and its sheet, when the profile has one (never on your own).
  more?: ReactNode;
  children?: ReactNode;
};

// A profile's action row (round 8, ui-polish Part 5): on a phone two equal 36 px buttons and the 36×36 "More", 8 px
// apart; stacked at full width (with "More" beside the second) when the labels can't fit. On the web, buttons sized
// to their words (people.css).
export function ProfileActions({ count, more, children }: ProfileActionsProps) {
  const { rowRef, isStacked } = useIsStacked(count);
  return (
    <div ref={rowRef} className="fh-person-actions" data-count={count} data-more={more ? "" : undefined} data-stacked={isStacked ? "" : undefined} data-slot="profile-actions">
      {children}
      {more}
    </div>
  );
}

type ProfileMoreProps = { name: string; children: ReactNode };

// "More" (…): a bottom sheet of the profile's other choices on a phone, a small menu under the button on the web.
export function ProfileMore({ name, children }: ProfileMoreProps) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <Sheet
      isOpen={isOpen}
      onOpen={() => setIsOpen(true)}
      onClose={() => setIsOpen(false)}
      title={name}
      desktop="popover"
      trigger={
        <Button type="button" variant="secondary" size="sm" className="fh-person-more" aria-label="More">
          <Ellipsis aria-hidden="true" />
        </Button>
      }
    >
      <div className="fh-person-menu" data-slot="profile-more">
        {children}
      </div>
    </Sheet>
  );
}
