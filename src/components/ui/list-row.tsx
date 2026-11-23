import { cn } from "cn";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type ListRowProps = {
  // The 48 px face: an <Avatar sizePx={48} />, a logo or an icon tile.
  face: ReactNode;
  // Line 1: the 16/600 title; with an href the whole row opens it (a stretched link, so nothing in `below` is nested
  // inside a link).
  title: ReactNode;
  href?: string;
  // Line 1's right end: a 13 px note ("2h", "10 Nov").
  meta?: ReactNode;
  // Line 2: 15 px Graphite, one line or two.
  line?: ReactNode;
  lines?: 1 | 2;
  // Unread: line 2 in Ink and 600, and an 8 px fund dot at its right, or a count pill when there are several.
  isUnread?: boolean;
  count?: number;
  // Under line 2: a 36 px button, tags.
  below?: ReactNode;
  className?: string;
} & Omit<ComponentProps<"div">, "title">;

// The one row for people and conversations (round 8, ui-polish SPEC "Shared contracts"): at least 72 px, a 48 px face
// at x 16, the text column at x 76, a hairline from x 76. Inbox, People and Today's waiting rows use it.
export function ListRow({ face, title, href, meta, line, lines = 1, isUnread = false, count, below, className, ...props }: ListRowProps) {
  const unreadMark = isUnread ? (
    count && count > 1 ? (
      <span className="fh-lr-count" aria-label={`${count} unread`}>
        {count}
      </span>
    ) : (
      <span className="fh-lr-dot" role="img" aria-label="Unread" />
    )
  ) : null;
  return (
    <div data-slot="list-row" data-lines={lines} data-unread={isUnread ? "" : undefined} className={cn("fh-lr", className)} {...props}>
      <span className="fh-lr-face">{face}</span>
      <div className="fh-lr-text">
        <div className="fh-lr-l1">
          <span className="fh-lr-title">{href ? <Link href={href}>{title}</Link> : title}</span>
          {meta ? <span className="fh-lr-meta">{meta}</span> : null}
        </div>
        {line || unreadMark ? (
          <div className="fh-lr-l2">
            <span className="fh-lr-line">{line}</span>
            {unreadMark}
          </div>
        ) : null}
        {below ? <div className="fh-lr-slot">{below}</div> : null}
      </div>
    </div>
  );
}

// A list's section name ("Waiting on you", "Messages"): 13/600 Graphite, 20 px above and 8 px below; no capitals and
// no rule.
export function SectionLabel({ className, children, as: Heading = "h2", ...props }: ComponentProps<"h2"> & { as?: "h2" | "h3" | "p" }) {
  return (
    <Heading data-slot="section-label" className={cn("fh-section-label", className)} {...props}>
      {children}
    </Heading>
  );
}
