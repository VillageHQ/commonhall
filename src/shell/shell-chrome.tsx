"use client";

import { FundMark } from "@/components/logo-tile";
import { ProductCredit, SourceLine } from "@/components/source-code-link";
import type { CommunityLogo } from "@/platform/branding/branding";
import { ROUTES } from "@/platform/http/routes";

import { useFundMarkSub, useShellMode } from "./navigation-links";
import { SHELL_MODES } from "./navigation-rules";

type ShellFundMarkProps = { name: string; logo: CommunityLogo | null; isAdmin: boolean; size: "default" | "sidebar"; pathname?: string };

// The fund's mark in the sidebar and the phone top bar, with "Members", "Admin console" or "Founder view" under it.
export function ShellFundMark({ name, logo, isAdmin, size, pathname }: ShellFundMarkProps) {
  const sub = useFundMarkSub(isAdmin, pathname);
  const mode = useShellMode(isAdmin, pathname);
  return <FundMark name={name} logo={logo} sub={sub} size={size} href={mode === SHELL_MODES.console ? ROUTES.admin : ROUTES.feed} />;
}

// Member pages carry the source link; console pages carry the product credit.
export function ShellFooterLine({ isAdmin, pathname }: { isAdmin: boolean; pathname?: string }) {
  return useShellMode(isAdmin, pathname) === SHELL_MODES.console ? <ProductCredit /> : <SourceLine />;
}

// The old foot of a phone page (crop footer-phone.png), kept for the parts page only: since round 8 (ui-polish Part 2)
// phones show no footer, and the source link is the avatar menu sheet's last row.
export function PhoneFoot({ isAdmin, pathname }: { isAdmin: boolean; pathname?: string }) {
  return (
    <div data-slot="phone-foot" className="fh-phone-foot">
      <ShellFooterLine isAdmin={isAdmin} pathname={pathname} />
    </div>
  );
}
