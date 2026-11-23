"use client";

import { cn } from "cn";
import { Search, X } from "lucide-react";
import { useCallback, useRef, useState, type ComponentProps } from "react";

type SearchBoxProps = Omit<ComponentProps<"input">, "type">;

// Sets the field's value the way typing does, so a controlled field's onChange runs as well: React tracks the value
// through the element's own setter, so it is called from the prototype, then an input event is sent.
function clearLikeTyping(field: HTMLInputElement) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setValue?.call(field, "");
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

// Commonhall's search box (round 8, ui-polish SPEC): a field's 44 px and 6 px radius, no shadow, a 20 px search icon
// 12 px in, and, while it holds text, the app's own clear button (a grey circle with an ✕) in place of the browser's.
// Clearing empties the field as typing would and keeps the focus there.
export function SearchBox({ className, ref, onChange, ...inputProps }: SearchBoxProps) {
  const fieldRef = useRef<HTMLInputElement | null>(null);
  const isControlled = inputProps.value !== undefined;
  const [hasTypedText, setHasTypedText] = useState(() => String(inputProps.defaultValue ?? "") !== "");
  const hasText = isControlled ? String(inputProps.value ?? "") !== "" : hasTypedText;
  const setRefs = useCallback(
    (field: HTMLInputElement | null) => {
      fieldRef.current = field;
      if (typeof ref === "function") ref(field);
      else if (ref) ref.current = field;
    },
    [ref],
  );

  return (
    <div data-slot="search-box" className={cn("fh-search", className)}>
      <Search aria-hidden="true" className="fh-i" strokeWidth={1.5} />
      <input
        ref={setRefs}
        type="search"
        className="fh-input"
        onChange={(event) => {
          setHasTypedText(event.target.value !== "");
          onChange?.(event);
        }}
        {...inputProps}
      />
      {hasText && !inputProps.disabled && !inputProps.readOnly ? (
        <button
          type="button"
          aria-label="Clear search"
          className="fh-search-clear"
          // Keeps the focus in the field: a press on the button never takes it.
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => {
            const field = fieldRef.current;
            if (!field) return;
            clearLikeTyping(field);
            field.focus();
          }}
        >
          <X aria-hidden="true" strokeWidth={2} />
        </button>
      ) : null}
    </div>
  );
}

// The 13 px Graphite line with an icon under a search ("Paths come from 3 members who share their network so far.").
export function StripLine({ className, ...props }: ComponentProps<"p">) {
  return <p data-slot="strip" className={cn("fh-strip", className)} {...props} />;
}

// The weekly allowance (crop pips-allowance.png): 11 px circles, filled Ink for each ask left, then "4 of 5 asks left this week".
export function AllowancePips({ left, total, label }: { left: number; total: number; label: string }) {
  return (
    <span data-slot="pips" className="fh-pips">
      {Array.from({ length: total }, (_unused, position) => (
        <i key={position} aria-hidden="true" className={cn(position < left && "fh-on")} />
      ))}
      <span>{label}</span>
    </span>
  );
}
