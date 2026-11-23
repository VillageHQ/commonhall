import type { CSSProperties, ReactNode } from "react";

import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

// A tab's outline (src/shell/tab-outlines.tsx, smooth-app Part A): the page's own head and grey blocks shaped like its first
// screen, shown the moment the tab is tapped and replaced when the page arrives. Built from the parts (the page head,
// .fh-titem, .fh-sheet, .fh-r, .fh-chips) so it sits where the page will, in light and dark.

type PageOutlineProps = {
  // The page's own heading, when it never changes ("Rooms"); else an OutlineTitle.
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  // The head's buttons row ("Post an ask"), as OutlineBox parts.
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function PageOutline({ title, eyebrow, description, action, className, children }: PageOutlineProps) {
  return (
    <div data-slot="page-outline" aria-busy="true" className={className}>
      <PageHeader eyebrow={eyebrow} title={title} description={description} action={action} />
      <p role="status" className="fh-sr">
        Loading…
      </p>
      {children}
    </div>
  );
}

// A heading whose words depend on the page's data ("Sam, 2 things wait for you"): its name for screen readers, a
// grey bar on screen, one heading line tall.
export function OutlineTitle({ label, width = "72%" }: { label: string; width?: CSSProperties["width"] }) {
  return (
    <>
      <span className="fh-sr">{label}</span>
      <Skeleton as="span" aria-hidden="true" className="inline-block h-[0.82em] max-w-full align-[-0.05em]" style={{ width, borderRadius: PILL }} />
    </>
  );
}

// `as="span"` for a bar inside text (a page head's line).
type BarProps = { width?: CSSProperties["width"]; height?: number; className?: string; as?: "div" | "span" };

// The radius goes inline: the Skeleton part's own small radius would win over a class.
const PILL = 9999;
const SMALL_RADIUS = "var(--r-sm)";

// A line of text.
export function OutlineLine({ width = "60%", height = 12, className, as }: BarProps) {
  return <Skeleton as={as} className={`max-w-full ${className ?? ""}`} style={{ width, height, borderRadius: PILL }} />;
}

// A field, a button or a box: the parts' small radius, a control's 44 px by default.
export function OutlineBox({ width = "100%", height = 44, radius = SMALL_RADIUS, className, as }: BarProps & { radius?: CSSProperties["borderRadius"] }) {
  return <Skeleton as={as} className={`max-w-full ${className ?? ""}`} style={{ width, height, borderRadius: radius }} />;
}

export function OutlineCircle({ size = 40 }: { size?: number }) {
  return <Skeleton className="shrink-0" style={{ width: size, height: size, borderRadius: PILL }} />;
}

// A row of chips (filters, a console area's tabs): 32 px, as the chips.
export function OutlineChips({ widths, className = "mb-4", isWrapped = false }: { widths: readonly number[]; className?: string; isWrapped?: boolean }) {
  return (
    <div aria-hidden="true" className={`fh-chips ${isWrapped ? "fh-chips-wrap" : ""} ${className}`}>
      {widths.map((width, index) => (
        <OutlineBox key={index} width={width} height={32} className="flex-none" />
      ))}
    </div>
  );
}

// A section's title line ("Live now", "Waiting on you"): an H2's height.
export function OutlineSectionHead({ width = 140, className = "mb-2.5" }: { width?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`flex h-7 items-center ${className}`}>
      <OutlineLine width={width} height={18} />
    </div>
  );
}

// A card (.fh-titem): a few lines, and a button where the page's cards have one.
export function OutlineCard({ lines = 2, hasAvatar = false, hasButton = false, className }: { lines?: number; hasAvatar?: boolean; hasButton?: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={`fh-titem flex items-center gap-3 ${className ?? ""}`}>
      {hasAvatar ? <OutlineCircle size={36} /> : null}
      <div className="grid min-w-0 flex-1 gap-2.5">
        {Array.from({ length: lines }, (_, index) => (
          <OutlineLine key={index} width={index === 0 ? "88%" : index === lines - 1 ? "45%" : "75%"} height={index === 0 ? 15 : 12} />
        ))}
      </div>
      {hasButton ? <OutlineBox width={72} height={36} className="flex-none" /> : null}
    </div>
  );
}

// A sheet (.fh-sheet) holding other outline parts.
export function OutlineSheet({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div aria-hidden="true" className={`fh-sheet ${className ?? ""}`}>
      {children}
    </div>
  );
}

// List rows (.fh-r): a face, a name and a line under it, an end note where the page has one.
export function OutlineRows({ count, hasAvatar = true, hasEnd = false }: { count: number; hasAvatar?: boolean; hasEnd?: boolean }) {
  return (
    <div aria-hidden="true" className="fh-rows">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="fh-r" style={hasAvatar ? undefined : { gridTemplateColumns: "minmax(0,1fr) auto" }}>
          {hasAvatar ? <OutlineCircle size={40} /> : null}
          <div className="grid gap-2 py-0.5">
            <OutlineLine width={`${58 - (index % 3) * 8}%`} height={15} />
            <OutlineLine width={`${80 - (index % 2) * 14}%`} height={11} />
          </div>
          {hasEnd ? <OutlineBox width={76} height={22} /> : <span />}
        </div>
      ))}
    </div>
  );
}

// ListRow's outline (src/components/ui/list-row.tsx): rows of `pitch` px (72 by default), a face of `avatar` px at
// x 16, two lines at x 76 and the hairline from x 76, so the real rows land where these stood.
export function OutlineListRows({ count, avatar = 48, pitch = 72 }: { count: number; avatar?: number; pitch?: number }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="fh-lr" style={{ minHeight: pitch, height: pitch, gridTemplateColumns: `${avatar}px minmax(0,1fr)` }}>
          <OutlineCircle size={avatar} />
          <div className="grid gap-2.5 pt-1.5">
            <OutlineLine width={`${58 - (index % 3) * 8}%`} height={14} />
            <OutlineLine width={`${80 - (index % 2) * 14}%`} height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}
