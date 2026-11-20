"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { CHIP_CLASSES } from "@/components/ui/chip";
import type { AdminTabFacts } from "@/shell/admin-badges";
import { ROUTES } from "@/platform/http/routes";
import { ANNOUNCEMENT_PAGE } from "@/modules/admin/contract-announcements";
import { ASKS_ADMIN_PAGE } from "@/modules/asks/contract";

// The console's merged areas (round 6): each is a row of tabs across its pages' own addresses, so no bookmark breaks.
// A tab whose module is off is hidden (its href is in hiddenTabHrefs, from the module manifests' adminTabs).
type AdminTab = { label: string; href: string };

export const ADMIN_AREAS: readonly (readonly AdminTab[])[] = [
  [
    { label: "Members", href: ROUTES.adminMembers },
    { label: "Invites", href: ROUTES.adminInvites },
    { label: "Import", href: ROUTES.adminImport },
    { label: "Sign-in links", href: ROUTES.adminLinks },
    { label: "Calls", href: ROUTES.adminCalls },
  ],
  [
    { label: "Asks", href: ASKS_ADMIN_PAGE },
    { label: "Intro log", href: ROUTES.adminIntroLog },
  ],
  [
    { label: "Announcements", href: ANNOUNCEMENT_PAGE },
    { label: "Weekly email", href: ROUTES.adminDigest },
  ],
];

function isUnder(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

// The tabs of the area a page belongs to; none for a page outside the merged areas. One tab left shows no row.
export function readAdminTabs(pathname: string, hiddenTabHrefs: readonly string[]) {
  const area = ADMIN_AREAS.find((tabs) => tabs.some(({ href }) => isUnder(pathname, href))) ?? [];
  const shown = area.filter(({ href }) => !hiddenTabHrefs.includes(href));
  return shown.length > 1 ? shown : [];
}

export function AdminTabs({ facts }: { facts: Pick<AdminTabFacts, "hiddenTabHrefs"> }) {
  const pathname = usePathname();
  const tabs = readAdminTabs(pathname, facts.hiddenTabHrefs);
  if (tabs.length === 0) return null;
  return (
    <nav aria-label="Pages in this part of the console" data-print="hide" className="fh-chips fh-chips-wrap mb-5">
      {tabs.map(({ label, href }) => (
        <Link key={href} href={href} aria-current={isUnder(pathname, href) ? "page" : undefined} className={CHIP_CLASSES}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
