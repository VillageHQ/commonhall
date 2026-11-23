import { cn } from "cn";
import type { ComponentProps } from "react";

// A grey bar while something loads. `as="span"` where it sits inside text (a heading, a paragraph): a div there is
// invalid HTML, and React warns about it while hydrating.
export function Skeleton({ className, as: Element = "div", ...props }: ComponentProps<"div"> & { as?: "div" | "span" }) {
  return <Element data-slot="skeleton" aria-hidden="true" className={cn("animate-shimmer rounded-small", className)} {...props} />;
}
