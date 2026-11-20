import type { ReactNode } from "react";

import { FlashProvider, FlashSlot } from "@/components/flash";
import { MAIN_CONTENT_ID } from "@/components/skip-link";
import type { CommunityLogo } from "@/platform/branding/branding";

import { ModuleOffNotice } from "./module-off-notice";
import { FounderViewStrip, MenuTabOutlines, SidebarNavigation, TabBar } from "./navigation-links";
import type { NavigationBadgeCounts, ShellNavigation } from "./navigation-rules";
import { PressEnd } from "./pressed-tab";
import { SearchReadyNotice } from "./search-ready-notice";
import { PhoneFoot, ShellFooterLine, ShellFundMark } from "./shell-chrome";
import { PhoneAccountButton, SidebarMember, type ShellMember } from "./user-menu";

type ShellCommunity = { name: string; descriptor: string; logo: CommunityLogo | null };

type AppShellProps = {
  community: ShellCommunity;
  member: ShellMember;
  navigation: ShellNavigation;
  badges: NavigationBadgeCounts;
  isNetworkOn: boolean;
  children: ReactNode;
};

// Commonhall's page shell (its lib/html.mjs page(), design-system.md §2): from 1000 px a 264 px sidebar (fund mark,
// the menu, the member who opens the avatar menu, the footer line); below it a 56 px top bar with the avatar and a
// 64 px tab bar of five. An admin on member pages sees the founder-view strip; the avatar menu switches views.
export function AppShell({ community, member, navigation, badges, isNetworkOn, children }: AppShellProps) {
  return (
    <FlashProvider>
      <div data-slot="app-shell" className="fh-app">
        <aside data-slot="sidebar" aria-label="Navigation" className="fh-side">
          <ShellFundMark name={community.name} logo={community.logo} isAdmin={member.isAdmin} size="sidebar" />
          <SidebarNavigation navigation={navigation} isAdmin={member.isAdmin} badges={badges} />
          <SidebarMember member={member} navigation={navigation} />
          <ShellFooterLine isAdmin={member.isAdmin} />
        </aside>
        <div data-slot="shell-column" className="fh-col min-w-0">
          <header data-slot="phone-top-bar" className="fh-topbar">
            <ShellFundMark name={community.name} logo={community.logo} isAdmin={member.isAdmin} size="default" />
            <span className="fh-spacer" />
            <PhoneAccountButton member={member} navigation={navigation} />
          </header>
          {member.isAdmin ? <FounderViewStrip name={member.name} /> : null}
          <main id={MAIN_CONTENT_ID} tabIndex={-1} data-slot="main" className="fh-main">
            <FlashSlot />
            <div data-slot="page-width" className="w-full">
              <div data-slot="page" className="contents">
                {children}
              </div>
              {/* A tapped tab's outline shows here while the page above is hidden (pressed-tab.tsx). */}
              <PressEnd />
              <MenuTabOutlines navigation={navigation} isAdmin={member.isAdmin} />
            </div>
            <PhoneFoot isAdmin={member.isAdmin} />
          </main>
        </div>
        {isNetworkOn ? <SearchReadyNotice /> : null}
        <ModuleOffNotice />
        <TabBar navigation={navigation} isAdmin={member.isAdmin} badges={badges} />
      </div>
    </FlashProvider>
  );
}
