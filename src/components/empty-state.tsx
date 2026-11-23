import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  // A 48 px Lucide line icon over the headline (Inbox, Search, AudioLines…); none when the caller gives none.
  icon?: LucideIcon;
  headingLevel?: "h1" | "h2" | "h3";
  // At most one button (36 px).
  children?: ReactNode;
};

// The empty state (round 8, ui-polish SPEC "Shared contracts"): a 48 px Graphite icon, a 17/600 headline, a 15 px
// Graphite line at most 300 px wide and at most one 36 px button, centred a little above the middle of the free space.
export function EmptyState({ title, description, icon: Icon, headingLevel: Heading = "h2", children }: EmptyStateProps) {
  return (
    <div data-slot="empty-state" className="fh-empty-state">
      {Icon ? <Icon aria-hidden="true" strokeWidth={1.5} /> : null}
      <Heading>{title}</Heading>
      <p>{description}</p>
      {children ? <div className="fh-btn-row">{children}</div> : null}
    </div>
  );
}
