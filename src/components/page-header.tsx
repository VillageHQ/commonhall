import type { ReactNode } from "react";

import { BackLink } from "./back-link";

export { BackLink };

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  // The page's actions, in a row under the line ("Ask for an intro", "Post an ask").
  action?: ReactNode;
  // The small Graphite line above the title ("11 Nov · Sam's week at Northwind Founders").
  eyebrow?: ReactNode;
  // A back link above the title on detail pages ("‹ Your intros").
  back?: { href: string; label: string };
};

// Commonhall's page head (crop pagehead-today.png): small line, serif H1 (28/34 → 34/42), the lede (Graphite,
// max 62ch), then the actions 14 px below.
export function PageHeader({ title, description, action, eyebrow, back }: PageHeaderProps) {
  return (
    <header data-slot="page-header" className="fh-pagehead">
      {back ? <BackLink href={back.href}>{back.label}</BackLink> : null}
      {eyebrow ? <p className="fh-small fh-muted">{eyebrow}</p> : null}
      {/* Commonhall puts the title 6 px under the small line (asks/views.mjs, the Today head). */}
      <h1 className="fh-h1" style={eyebrow ? { marginTop: 6 } : undefined}>
        {title}
      </h1>
      {description ? <p className="fh-lede">{description}</p> : null}
      {action ? <div className="fh-btn-row mt-3.5">{action}</div> : null}
    </header>
  );
}

// A section's head row: the title left and one link right (`.section-head`).
export function SectionHead({ title, link, headingLevel: Heading = "h2" }: { title: ReactNode; link?: ReactNode; headingLevel?: "h2" | "h3" }) {
  return (
    <div className="fh-section-head">
      <Heading className="fh-h2">{title}</Heading>
      {link}
    </div>
  );
}
