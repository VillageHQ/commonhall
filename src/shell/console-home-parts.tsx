import { cn } from "cn";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

import { buttonVariants } from "@/components/ui/button";
import { ROUTES } from "@/platform/http/routes";

type Variant = "primary" | "secondary" | "quiet" | "ink";

// A button that goes somewhere (Commonhall's `a.btn`).
export function ButtonLink({ href, variant = "secondary", isSmall = false, children, className }: { href: string; variant?: Variant; isSmall?: boolean; children: ReactNode; className?: string }) {
  return (
    <Link href={href} data-slot="button" className={cn(buttonVariants({ variant, size: isSmall ? "sm" : "default" }), className)}>
      {children}
    </Link>
  );
}

// Commonhall's plain link: the fund colour, underlined, deeper on hover.
export function TextLink({ className, ...props }: ComponentProps<typeof Link>) {
  return <Link className={cn("text-fund underline decoration-1 underline-offset-[3px] hover:text-fund-deep", className)} {...props} />;
}

// Console Home's "Partner report" tile (round 7): always there, before launch and after, because the phone's console has
// no Report tab.
export function PartnerReportTile({ className }: { className?: string }) {
  return (
    <Link href={ROUTES.adminReport} className={cn("fh-sheet mb-4 flex items-center justify-between gap-3 no-underline", className)} data-testid="admin-home-report">
      <span>
        <b className="fh-h3 block">Partner report</b>
        <span className="fh-small fh-muted">What your partners see: intros made, asks answered, who helped.</span>
      </span>
      <ArrowRight aria-hidden="true" className="size-4 shrink-0" strokeWidth={1.5} />
    </Link>
  );
}
