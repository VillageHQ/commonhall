"use client";

import { Eye, LayoutDashboard, LogOut, Moon } from "lucide-react";
import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { useId, type ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { applyTheme, useIsDarkTheme } from "@/components/use-theme";
import { signOut } from "@/platform/auth/sign-out";
import { ROUTES } from "@/platform/http/routes";

import { AppActionsGroup } from "./app-actions-group";
import { useShellMode } from "./navigation-links";
import { MENU_PLACES, SHELL_MODES, type ShellNavigation } from "./navigation-rules";

export type ShellMember = { id: string; name: string; email: string; image?: string | null; isAdmin: boolean };

// The avatar's menu: Settings, the same list as the foot of My profile (round 7, settings-links.ts), then "More" (Jobs,
// Perks, Library, Feed, each while it's on), the admin's switch between the console and the founder view, Dark mode
// and Sign out. On a phone the avatar sits top right; on a desktop the member's name at the foot of the sidebar opens it.

const MENU_ITEM =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-[7px] px-3 text-[15px] leading-5 font-medium text-[var(--ink)] no-underline outline-none select-none data-[highlighted]:bg-[var(--vellum)] [&_svg]:size-[18px] [&_svg]:shrink-0 [&_svg]:text-[var(--graphite)]";
const MENU_LABEL = "px-3 pt-2 pb-1 text-xs font-semibold text-[var(--graphite)]";
const MENU_RULE = "my-1.5 h-px bg-[var(--rule)]";

function MenuLink({ href, icon, isFullPageLoad, children }: { href: string; icon: ReactNode; isFullPageLoad?: boolean; children: ReactNode }) {
  return (
    <DropdownMenu.Item asChild className={MENU_ITEM}>
      {isFullPageLoad ? (
        <a href={href}>
          {icon}
          {children}
        </a>
      ) : (
        <Link href={href}>
          {icon}
          {children}
        </Link>
      )}
    </DropdownMenu.Item>
  );
}

type AccountMenuProps = { member: ShellMember; navigation: ShellNavigation; trigger: ReactNode; side: "top" | "bottom"; pathname?: string };

export function AccountMenu({ member, navigation, trigger, side, pathname }: AccountMenuProps) {
  const isDark = useIsDarkTheme();
  const mode = useShellMode(member.isAdmin, pathname);
  // More holds the member pages with no tab (Jobs, Perks, Library, Feed). In the console it holds the items with no
  // phone tab (the Report), on a phone only: the desktop sidebar lists them.
  const isConsole = mode === SHELL_MODES.console;
  const more = isConsole ? navigation.console.filter((item) => !item.tabLabel) : navigation.member.filter((item) => item.place === MENU_PLACES.more);
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
          <DropdownMenu.Group aria-label="Settings">
            <DropdownMenu.Label className={MENU_LABEL}>Settings</DropdownMenu.Label>
            {navigation.settings.map((item) => (
              <MenuLink key={item.key} href={item.href} icon={item.icon}>
                {item.label}
              </MenuLink>
            ))}
          </DropdownMenu.Group>
          {more.length > 0 ? (
            <DropdownMenu.Group className={isConsole ? "min-[1000px]:hidden" : undefined}>
              <DropdownMenu.Separator className={MENU_RULE} />
              <DropdownMenu.Label className={MENU_LABEL}>More</DropdownMenu.Label>
              {more.map((item) => (
                <MenuLink key={item.key} href={item.href} icon={item.icon} isFullPageLoad={item.isFullPageLoad}>
                  {item.label}
                </MenuLink>
              ))}
            </DropdownMenu.Group>
          ) : null}
          <AppActionsGroup />
          {/* Pinned to the menu's foot, so Sign out shows on a short phone screen while the lists above scroll. */}
          <div data-slot="account-menu-foot" className="sticky bottom-0 bg-[var(--leaf)] pb-1.5">
          <DropdownMenu.Separator className={MENU_RULE} />
          {member.isAdmin && mode === SHELL_MODES.console ? (
            <MenuLink href={ROUTES.feed} icon={<Eye aria-hidden="true" strokeWidth={1.5} />}>
              See it as a founder
            </MenuLink>
          ) : null}
          {member.isAdmin && mode === SHELL_MODES.member ? (
            <MenuLink href={ROUTES.admin} icon={<LayoutDashboard aria-hidden="true" strokeWidth={1.5} />}>
              Admin console
            </MenuLink>
          ) : null}
          <DropdownMenu.CheckboxItem
            checked={isDark}
            onCheckedChange={applyTheme}
            onSelect={(event) => event.preventDefault()}
            className={MENU_ITEM}
          >
            <Moon aria-hidden="true" strokeWidth={1.5} />
            Dark mode
            <span aria-hidden="true" className="ml-auto text-xs text-[var(--graphite)]">
              {isDark ? "On" : "Off"}
            </span>
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.Item className={MENU_ITEM} onSelect={signOut}>
            <LogOut aria-hidden="true" strokeWidth={1.5} />
            Sign out
          </DropdownMenu.Item>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
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

// The phone top bar's avatar: it opens the avatar menu.
export function PhoneAccountButton({ member, navigation, pathname }: { member: ShellMember; navigation: ShellNavigation; pathname?: string }) {
  return (
    <AccountMenu
      member={member}
      navigation={navigation}
      side="bottom"
      pathname={pathname}
      trigger={
        <button type="button" aria-label="Your menu" data-slot="account-menu-trigger" className="cursor-pointer rounded-full">
          <Avatar stableId={member.id} name={member.name} imageUrl={member.image} sizePx={28} />
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
