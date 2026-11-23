"use client";

import { ChevronRight, Code, ExternalLink, Eye, LayoutDashboard, LogOut, Moon } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { useId, useState, type ReactNode } from "react";

import { SOURCE_CODE_URL } from "@/components/source-code-link";
import { Avatar } from "@/components/ui/avatar";
import { SectionLabel } from "@/components/ui/list-row";
import { Sheet } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { applyTheme, useIsDarkTheme } from "@/components/use-theme";
import { signOut } from "@/platform/auth/sign-out";
import { ROUTES } from "@/platform/http/routes";

import { APP_ACTIONS_LABEL, runAppAction, useAppActionItems } from "./app-actions-group";
import { useShellMode } from "./navigation-links";
import { MENU_PLACES, SHELL_MODES, type ShellNavigation } from "./navigation-rules";

export type ShellMember = { id: string; name: string; email: string; image?: string | null; isAdmin: boolean };

// The avatar's menu: Settings, the same list as the foot of My profile (round 7, settings-links.ts), then "More" (Jobs,
// Perks, Library, Feed, each while it's on), the store app's "This app" group, the admin's switch between the console
// and the founder view, Dark mode and Sign out. One list (readMenuGroups), drawn two ways: on a desktop the member's
// name at the foot of the sidebar opens it as a dropdown; on a phone the avatar top right opens it as a sheet
// (ui-polish Part 2), whose last row is the source link the AGPL asks for, since phones have no footer.

type MenuEntry =
  | { kind: "link"; key: string; label: string; href: string; icon: ReactNode; isFullPageLoad?: boolean }
  | { kind: "action"; key: string; label: string; icon: ReactNode; onSelect: () => void }
  | { kind: "theme"; key: string; label: string; icon: ReactNode };

// `isWideHidden`: the console's More on a desktop, where the sidebar lists the same pages.
type MenuGroup = { key: string; label?: string; entries: readonly MenuEntry[]; isWideHidden?: boolean };

const ICON = { "aria-hidden": true, strokeWidth: 1.5 } as const;

function useMenuGroups(member: ShellMember, navigation: ShellNavigation, pathname?: string): MenuGroup[] {
  const mode = useShellMode(member.isAdmin, pathname);
  const appActions = useAppActionItems();
  // More holds the member pages with no tab (Jobs, Perks, Library, Feed). In the console it holds the items with no
  // phone tab (the Report), on a phone only: the desktop sidebar lists them.
  const isConsole = mode === SHELL_MODES.console;
  const more = isConsole ? navigation.console.filter((item) => !item.tabLabel) : navigation.member.filter((item) => item.place === MENU_PLACES.more);
  const toLink = (item: { key: string; label: string; href: string; icon: ReactNode; isFullPageLoad?: boolean }): MenuEntry => ({ kind: "link", ...item });
  const groups: MenuGroup[] = [{ key: "settings", label: "Settings", entries: navigation.settings.map(toLink) }];
  if (more.length > 0) groups.push({ key: "more", label: "More", entries: more.map(toLink), isWideHidden: isConsole });
  if (appActions.length > 0) {
    groups.push({
      key: "app",
      label: APP_ACTIONS_LABEL,
      entries: appActions.map(({ action, label, icon: Icon }) => ({ kind: "action", key: action, label, icon: <Icon {...ICON} />, onSelect: () => runAppAction(action) })),
    });
  }
  const foot: MenuEntry[] = [];
  if (member.isAdmin && isConsole) foot.push({ kind: "link", key: "founder-view", label: "See it as a founder", href: ROUTES.feed, icon: <Eye {...ICON} /> });
  if (member.isAdmin && !isConsole) foot.push({ kind: "link", key: "console", label: "Admin console", href: ROUTES.admin, icon: <LayoutDashboard {...ICON} /> });
  foot.push({ kind: "theme", key: "dark", label: "Dark mode", icon: <Moon {...ICON} /> });
  foot.push({ kind: "action", key: "sign-out", label: "Sign out", icon: <LogOut {...ICON} />, onSelect: signOut });
  groups.push({ key: "foot", entries: foot });
  return groups;
}

// ── The dropdown (from 1000 px) ──

const MENU_ITEM =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-[7px] px-3 text-[15px] leading-5 font-medium text-[var(--ink)] no-underline outline-none select-none data-[highlighted]:bg-[var(--vellum)] [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-[var(--graphite)]";
const MENU_LABEL = "px-3 pt-2 pb-1 text-xs font-semibold text-[var(--graphite)]";
const MENU_RULE = "my-1.5 h-px bg-[var(--rule)]";

function DropdownEntry({ entry, isDark }: { entry: MenuEntry; isDark: boolean }) {
  if (entry.kind === "theme") {
    return (
      <DropdownMenu.CheckboxItem checked={isDark} onCheckedChange={applyTheme} onSelect={(event) => event.preventDefault()} className={MENU_ITEM}>
        {entry.icon}
        {entry.label}
        <span aria-hidden="true" className="ml-auto text-xs text-[var(--graphite)]">
          {isDark ? "On" : "Off"}
        </span>
      </DropdownMenu.CheckboxItem>
    );
  }
  if (entry.kind === "action") {
    return (
      <DropdownMenu.Item className={MENU_ITEM} onSelect={entry.onSelect}>
        {entry.icon}
        {entry.label}
      </DropdownMenu.Item>
    );
  }
  const content = (
    <>
      {entry.icon}
      {entry.label}
    </>
  );
  return (
    <DropdownMenu.Item asChild className={MENU_ITEM}>
      {entry.isFullPageLoad ? <a href={entry.href}>{content}</a> : <Link href={entry.href}>{content}</Link>}
    </DropdownMenu.Item>
  );
}

type AccountMenuProps = { member: ShellMember; navigation: ShellNavigation; trigger: ReactNode; side: "top" | "bottom"; pathname?: string };

export function AccountMenu({ member, navigation, trigger, side, pathname }: AccountMenuProps) {
  const isDark = useIsDarkTheme();
  const groups = useMenuGroups(member, navigation, pathname);
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side={side}
          align={side === "top" ? "start" : "end"}
          sideOffset={6}
          collisionPadding={8}
          data-slot="account-menu"
          className="z-50 max-h-[var(--radix-dropdown-menu-content-available-height)] w-[232px] overflow-y-auto rounded-[10px] border border-[var(--rule)] bg-[var(--leaf)] px-1.5 pt-1.5 shadow-[var(--shadow)]"
        >
          {groups.map((group, index) => {
            const entries = group.entries.map((entry) => <DropdownEntry key={entry.key} entry={entry} isDark={isDark} />);
            // The last group (the view switch, Dark mode, Sign out) is pinned to the menu's foot, so Sign out shows
            // on a short screen while the lists above scroll.
            if (!group.label) {
              return (
                <div key={group.key} data-slot="account-menu-foot" className="sticky bottom-0 bg-[var(--leaf)] pb-1.5">
                  <DropdownMenu.Separator className={MENU_RULE} />
                  {entries}
                </div>
              );
            }
            return (
              <DropdownMenu.Group
                key={group.key}
                aria-label={group.label}
                data-slot={group.key === "app" ? "app-actions" : undefined}
                className={group.isWideHidden ? "min-[1000px]:hidden" : undefined}
              >
                {index > 0 ? <DropdownMenu.Separator className={MENU_RULE} /> : null}
                <DropdownMenu.Label className={MENU_LABEL}>{group.label}</DropdownMenu.Label>
                {entries}
              </DropdownMenu.Group>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

// ── The sheet (under 1000 px): an iOS sheet and Airbnb's Profile list ──

function SheetEntry({ entry, isDark, onDone }: { entry: MenuEntry; isDark: boolean; onDone: () => void }) {
  if (entry.kind === "theme") {
    return (
      <button type="button" role="switch" aria-checked={isDark} className="fh-menu-row" onClick={() => applyTheme(!isDark)}>
        {entry.icon}
        <span>{entry.label}</span>
        <span aria-hidden="true" className="fh-menu-state">
          {isDark ? "On" : "Off"}
        </span>
      </button>
    );
  }
  if (entry.kind === "action") {
    return (
      <button
        type="button"
        className="fh-menu-row"
        onClick={() => {
          onDone();
          entry.onSelect();
        }}
      >
        {entry.icon}
        <span>{entry.label}</span>
      </button>
    );
  }
  const content = (
    <>
      {entry.icon}
      <span>{entry.label}</span>
      <ChevronRight aria-hidden="true" strokeWidth={1.5} className="fh-menu-chev" />
    </>
  );
  return entry.isFullPageLoad ? (
    <a href={entry.href} className="fh-menu-row" onClick={onDone}>
      {content}
    </a>
  ) : (
    <Link href={entry.href} className="fh-menu-row" onClick={onDone}>
      {content}
    </Link>
  );
}

function SheetGroup({ group, isDark, onDone }: { group: MenuGroup; isDark: boolean; onDone: () => void }) {
  const labelId = useId();
  return (
    <>
      {group.label ? (
        <SectionLabel as="h3" id={labelId}>
          {group.label}
        </SectionLabel>
      ) : null}
      <ul className="fh-menu-group" aria-labelledby={group.label ? labelId : undefined} data-slot={`account-sheet-${group.key}`}>
        {group.entries.map((entry) => (
          <li key={entry.key}>
            <SheetEntry entry={entry} isDark={isDark} onDone={onDone} />
          </li>
        ))}
      </ul>
    </>
  );
}

// The phone top bar's avatar (drawn at 28 px in a 44×44 tap area): it opens the menu as a sheet.
export function PhoneAccountButton({ member, navigation, pathname }: { member: ShellMember; navigation: ShellNavigation; pathname?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const isDark = useIsDarkTheme();
  const groups = useMenuGroups(member, navigation, pathname);
  const close = () => setIsOpen(false);
  return (
    <Sheet
      isOpen={isOpen}
      onOpen={() => setIsOpen(true)}
      onClose={close}
      className="fh-menu-sheet"
      title={member.name}
      headStart={<Avatar stableId={member.id} name={member.name} imageUrl={member.image} sizePx={48} />}
      trigger={
        <button type="button" aria-label="Your menu" data-slot="account-menu-trigger" className="fh-avatar-btn cursor-pointer rounded-full">
          <Avatar stableId={member.id} name={member.name} imageUrl={member.image} sizePx={28} />
        </button>
      }
    >
      <div data-slot="account-sheet">
        {groups.map((group) => (
          <SheetGroup key={group.key} group={group} isDark={isDark} onDone={close} />
        ))}
        {/* The AGPL asks a network service to offer its source: on a phone this row is where it is offered. */}
        <ul className="fh-menu-group" data-slot="account-sheet-source">
          <li>
            <a href={SOURCE_CODE_URL} target="_blank" rel="noopener noreferrer" className="fh-menu-row">
              <Code {...ICON} />
              <span>Source code (AGPL-3.0)</span>
              <ExternalLink aria-hidden="true" strokeWidth={1.5} className="fh-menu-chev" />
            </a>
          </li>
        </ul>
      </div>
    </Sheet>
  );
}

// The foot of the sidebar: the member's face, name and role, which open the avatar menu.
export function SidebarMember({ member, navigation, pathname }: { member: ShellMember; navigation: ShellNavigation; pathname?: string }) {
  return (
    <AccountMenu
      member={member}
      navigation={navigation}
      side="top"
      pathname={pathname}
      trigger={
        <button type="button" aria-label={`Your menu: ${member.name}`} data-slot="account-menu-trigger" className="fh-me w-full cursor-pointer text-left">
          <Avatar stableId={member.id} name={member.name} imageUrl={member.image} sizePx={28} />
          <span className="min-w-0">
            <b className="truncate">{member.name}</b>
            <span>{member.isAdmin ? "Admin" : "Member"}</span>
          </span>
        </button>
      }
    />
  );
}

// Dark mode as a settings row. The avatar menu holds the switch now; part 2 of round 6 takes this row off Your data.
export function DarkModeRow() {
  const isDark = useIsDarkTheme();
  const id = useId();
  return (
    <div className="fh-setrow">
      <label htmlFor={id} className="flex min-w-0 items-start gap-2.5">
        <Moon aria-hidden="true" className="fh-i fh-s mt-px text-graphite" strokeWidth={1.5} />
        <div>
          <b>Dark mode</b>
          <span>Light text on a dark page, on this device.</span>
        </div>
      </label>
      <Switch id={id} checked={isDark} onCheckedChange={applyTheme} />
    </div>
  );
}
