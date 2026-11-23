"use client";

import { cn } from "cn";
import { useCallback, useEffect, useRef, type ComponentProps, type Ref } from "react";

import { FIELD_CLASSES } from "./input";

// Where the browser has no `field-sizing: content` (older Safari), the box is sized to its text by hand. The
// limits (96 px to 240 px) come from the CSS, so this only sets the height.
function fitsItself() {
  return typeof CSS !== "undefined" && CSS.supports("field-sizing", "content");
}

function fitToText(box: HTMLTextAreaElement) {
  box.style.height = "auto";
  box.style.height = `${box.scrollHeight + box.offsetHeight - box.clientHeight}px`;
}

function assignRef<Value>(ref: Ref<Value> | undefined, value: Value) {
  if (typeof ref === "function") ref(value);
  else if (ref) ref.current = value;
}

// Commonhall's text box (round 8): 16 px text, at least 96 px, no grip, and it grows with its text up to 240 px,
// then scrolls (globals.css).
export function Textarea({ className, ref, onInput, value, ...props }: ComponentProps<"textarea">) {
  const boxRef = useRef<HTMLTextAreaElement | null>(null);
  const setRefs = useCallback(
    (box: HTMLTextAreaElement | null) => {
      boxRef.current = box;
      assignRef(ref, box);
    },
    [ref],
  );

  // A value set from outside (a reset after posting, a draft) resizes the box too.
  useEffect(() => {
    if (boxRef.current && !fitsItself()) fitToText(boxRef.current);
  }, [value]);

  return (
    <textarea
      ref={setRefs}
      data-slot="textarea"
      className={cn(FIELD_CLASSES, className)}
      value={value}
      onInput={(event) => {
        if (!fitsItself()) fitToText(event.currentTarget);
        onInput?.(event);
      }}
      {...props}
    />
  );
}
