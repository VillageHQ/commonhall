"use client";

import { cn } from "cn";
import { X } from "lucide-react";
import { Dialog, Popover } from "radix-ui";
import { useEffect, useRef, useSyncExternalStore, type PointerEvent, type ReactNode } from "react";

import { Button } from "./button";

// From this width a sheet is a centred dialog (or a popover where its caller asks): the app's one breakpoint.
const WIDE_QUERY = "(min-width: 1000px)";
// A drag down of this much closes the sheet; less springs it back.
const CLOSE_DRAG = 80;

function subscribeToWidth(onChange: () => void) {
  const query = window.matchMedia(WIDE_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function useIsWide() {
  return useSyncExternalStore(
    subscribeToWidth,
    () => window.matchMedia(WIDE_QUERY).matches,
    () => false,
  );
}

// html[data-sheet-open] while any sheet is open (a sheet can open over another: "Discard this ask?").
let openSheets = 0;

function useMarkSheetOpen(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;
    openSheets += 1;
    document.documentElement.setAttribute("data-sheet-open", "");
    return () => {
      openSheets -= 1;
      if (openSheets === 0) document.documentElement.removeAttribute("data-sheet-open");
    };
  }, [isOpen]);
}

// Drag the grabber or the head down to close: the sheet follows the finger, and lets go past CLOSE_DRAG.
function useDragToClose(onClose: () => void) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; pointerId: number } | null>(null);

  function moveTo(offset: number) {
    const sheet = sheetRef.current;
    if (!sheet) return;
    sheet.style.transform = offset > 0 ? `translateY(${offset}px)` : "";
  }

  return {
    sheetRef,
    handlers: {
      onPointerDown(event: PointerEvent<HTMLElement>) {
        if (event.button !== 0 || (event.target as HTMLElement).closest("button, a, input, textarea, select")) return;
        drag.current = { startY: event.clientY, pointerId: event.pointerId };
        event.currentTarget.setPointerCapture(event.pointerId);
      },
      onPointerMove(event: PointerEvent<HTMLElement>) {
        if (drag.current?.pointerId !== event.pointerId) return;
        moveTo(event.clientY - drag.current.startY);
      },
      onPointerUp(event: PointerEvent<HTMLElement>) {
        if (drag.current?.pointerId !== event.pointerId) return;
        const offset = event.clientY - drag.current.startY;
        drag.current = null;
        moveTo(0);
        if (offset >= CLOSE_DRAG) onClose();
      },
      onPointerCancel() {
        drag.current = null;
        moveTo(0);
      },
    },
  };
}

type SheetProps = {
  isOpen: boolean;
  onClose: () => void;
  // Opening from a trigger: the button that opens it (the focus returns to it); needed for the popover form.
  trigger?: ReactNode;
  onOpen?: () => void;
  // The sheet's name: its heading, and what a screen reader announces.
  title: ReactNode;
  isTitleHidden?: boolean;
  description?: ReactNode;
  // The head's ends. By default the end is a 44 px ✕ ("Close"); a full sheet passes Cancel and Post here.
  headStart?: ReactNode;
  headEnd?: ReactNode;
  // A row pinned at the sheet's foot ("Clear all" · "Show 12 people").
  footer?: ReactNode;
  // From 1000 px: a centred dialog, or a popover under the trigger.
  desktop?: "dialog" | "popover";
  // full: the whole screen from the status bar down, no grabber (the phone's composer).
  size?: "auto" | "full";
  className?: string;
  children: ReactNode;
};

// The one sheet of round 8 (ui-polish SPEC, "Shared contracts"). Under 1000 px a bottom sheet: a 16 px top radius,
// a 36×5 grabber, a dimmed backdrop, at most 85 % of the screen, scrolling inside, the home indicator's inset at its
// foot, an optional pinned footer. It closes by the backdrop, Escape, the ✕ or a drag down of 80 px, keeps the focus
// inside while open and returns it after, and marks html[data-sheet-open]. It slides up over 250 ms (not under
// reduced motion). From 1000 px a centred dialog, or a popover where `desktop="popover"` and a trigger is given.
export function Sheet({
  isOpen,
  onClose,
  trigger,
  onOpen,
  title,
  isTitleHidden = false,
  description,
  headStart,
  headEnd,
  footer,
  desktop = "dialog",
  size = "auto",
  className,
  children,
}: SheetProps) {
  const isWide = useIsWide();
  const { sheetRef, handlers } = useDragToClose(onClose);
  useMarkSheetOpen(isOpen);
  const onOpenChange = (nextIsOpen: boolean) => (nextIsOpen ? onOpen?.() : onClose());
  const canDrag = !isWide && size === "auto";

  const closeButton = (
    <Button type="button" variant="quiet" size="icon" aria-label="Close" onClick={onClose} className="text-ink">
      <X aria-hidden="true" strokeWidth={1.75} />
    </Button>
  );

  if (isWide && desktop === "popover" && trigger) {
    return (
      <Popover.Root open={isOpen} onOpenChange={onOpenChange}>
        <Popover.Trigger asChild>{trigger}</Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            data-slot="sheet"
            data-form="popover"
            aria-label={typeof title === "string" ? title : undefined}
            align="end" sideOffset={8} collisionPadding={16} className={cn("fh-bpop", className)}>
            {isTitleHidden ? null : (
              <div className="fh-bsheet-head">
                <h2>{title}</h2>
              </div>
            )}
            <div className="fh-bsheet-body">{children}</div>
            {footer ? <div className="fh-bsheet-foot">{footer}</div> : null}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    );
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="fh-scrim" />
        <Dialog.Content
          ref={sheetRef}
          data-slot="sheet"
          data-form={isWide ? "dialog" : "sheet"}
          data-size={size}
          className={cn("fh-bsheet", className)}
          {...(description ? {} : { "aria-describedby": undefined })}
        >
          {canDrag ? <div aria-hidden="true" className="fh-bsheet-grab" {...handlers} /> : null}
          <div className="fh-bsheet-head" {...(canDrag ? handlers : {})}>
            {headStart}
            <Dialog.Title className={isTitleHidden ? "fh-sr" : undefined}>{title}</Dialog.Title>
            {headEnd === undefined ? closeButton : headEnd}
          </div>
          {description ? <Dialog.Description className="fh-small fh-muted px-4 pb-2 lg:px-6">{description}</Dialog.Description> : null}
          <div className="fh-bsheet-body">{children}</div>
          {footer ? <div className="fh-bsheet-foot">{footer}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
