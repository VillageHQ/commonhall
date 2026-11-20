import type { ReactNode } from "react";

import { OutlineBox, OutlineCard, OutlineChips, OutlineCircle, OutlineLine, OutlineRows, OutlineSectionHead, OutlineSheet, OutlineTitle, PageOutline } from "@/components/page-outline";

// Each tab's outline (smooth-app Part A): the page's own head and grey blocks shaped like its first screen at 390 px,
// drawn the moment its tab is tapped (pressed-tab.tsx) and replaced when the page arrives. Keyed by the tab's
// address; a tab without one here (Perks, the job board) keeps the old page on screen until the new one comes.

function TodayOutline() {
  const dateLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
  return (
    <PageOutline className="td-page" eyebrow={dateLabel} title={<OutlineTitle label="Today" />} action={<OutlineBox width={124} height={32} />}>
      <div aria-hidden="true">
        <section className="fh-tsec">
          <OutlineSectionHead width={150} />
          <div className="grid gap-2.5">
            <OutlineCard lines={2} hasAvatar hasButton />
            <OutlineCard lines={3} hasButton />
          </div>
        </section>
        <section className="fh-tsec">
          <OutlineSectionHead width={130} />
          <OutlineCard lines={3} />
        </section>
      </div>
    </PageOutline>
  );
}

// The full-width "Start a room" button and its line, the Room alerts switch, then Live now and Coming up.
function RoomsOutline() {
  return (
    <PageOutline title="Rooms">
      <div aria-hidden="true">
        <OutlineBox height={40} />
        <OutlineLine width="62%" className="mt-3" />
        <div className="mt-5 flex items-center justify-between">
          <OutlineBox width={150} height={24} radius={9999} />
          <OutlineLine width={84} />
        </div>
        <section className="fh-section">
          <OutlineSectionHead width={110} />
          <OutlineCard lines={2} hasButton />
        </section>
        <section className="fh-section">
          <OutlineSectionHead width={130} />
          <OutlineCard lines={3} hasButton />
        </section>
      </div>
    </PageOutline>
  );
}

const ASK_ITEMS = [0, 1];

// The one-box composer, the search, the tabs, then asks.
function AsksOutline() {
  return (
    <PageOutline title="Asks" className="fh-narrow">
      <OutlineSheet>
        <div className="flex items-start gap-2">
          <OutlineBox height={72} className="flex-1" />
          <OutlineBox width={56} height={36} />
        </div>
      </OutlineSheet>
      <OutlineBox height={52} radius={10} className="mt-4" />
      <OutlineChips widths={[60, 88, 72]} className="mt-4 mb-4" />
      <div aria-hidden="true" className="grid">
        {ASK_ITEMS.map((index) => (
          <div key={index} className="grid gap-2.5 border-b border-[var(--rule)] py-4">
            <div className="flex items-center gap-3">
              <OutlineCircle size={32} />
              <div className="grid flex-1 gap-2">
                <OutlineLine width="38%" height={14} />
                <OutlineLine width="26%" height={11} />
              </div>
            </div>
            <OutlineLine width="94%" />
            <OutlineLine width="70%" />
          </div>
        ))}
      </div>
    </PageOutline>
  );
}

// The search and Filter, the Mentors and experts link, the count, then members.
function PeopleOutline() {
  return (
    <PageOutline title="People">
      <div aria-hidden="true">
        <div className="flex items-center gap-2">
          <OutlineBox height={52} radius={10} className="flex-1" />
          <OutlineBox width={97} height={40} />
        </div>
        <OutlineLine width={140} className="mt-4" />
        <OutlineLine width={84} className="mt-5 mb-2" />
        <OutlineRows count={6} />
      </div>
    </PageOutline>
  );
}

// The All · Intros filter, then what waits on the member and their conversations.
function InboxOutline() {
  return (
    <PageOutline title="Inbox">
      <div aria-hidden="true">
        <OutlineChips widths={[42, 64]} />
        <section className="fh-section">
          <OutlineSectionHead width={120} />
          <OutlineRows count={1} hasEnd />
        </section>
        <section className="fh-section">
          <OutlineSectionHead width={96} />
          <OutlineRows count={3} />
        </section>
      </div>
    </PageOutline>
  );
}

const STAT_CELLS = [0, 1, 2, 3];
const NEEDS_ROWS = [0, 1, 2, 3];

// The console's Home: the heading (This week, or the launch checklist's welcome), the week's numbers, what needs the
// admin.
function AdminHomeOutline() {
  return (
    <PageOutline title={<OutlineTitle label="Home" width="46%" />} description={<OutlineLine width="64%" height={13} className="mt-1" />}>
      <div aria-hidden="true">
        <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-[var(--r)] border border-[var(--rule)] bg-[var(--leaf)]">
          {STAT_CELLS.map((index) => (
            <div key={index} className={`grid gap-2.5 p-4 ${index % 2 === 0 ? "border-r border-[var(--rule)]" : ""} ${index < 2 ? "border-b border-[var(--rule)]" : ""}`}>
              <OutlineLine width={22} height={22} />
              <OutlineLine width="78%" height={11} />
            </div>
          ))}
        </div>
        <OutlineSheet>
          <OutlineLine width={92} height={15} className="mb-4" />
          {NEEDS_ROWS.map((index) => (
            <div key={index} className="border-t border-[var(--rule)] py-4">
              <OutlineLine width={`${70 - index * 9}%`} height={13} />
            </div>
          ))}
        </OutlineSheet>
      </div>
    </PageOutline>
  );
}

const ADMIN_ASK_ROWS = [0, 1, 2];

// The console's Asks & intros: the area's tabs, then the asks with no help yet.
function AdminAsksOutline() {
  return (
    <PageOutline title="Asks & intros">
      <OutlineChips widths={[58, 82]} className="mb-5" isWrapped />
      <OutlineSheet>
        <div className="mb-3 flex justify-between">
          <OutlineLine width={96} height={15} />
          <OutlineLine width={96} height={13} />
        </div>
        {ADMIN_ASK_ROWS.map((index) => (
          <div key={index} className="grid gap-2.5 border-t border-[var(--rule)] py-4 pl-8">
            <OutlineLine width="92%" height={14} />
            <OutlineLine width="70%" height={14} />
            <OutlineLine width="46%" height={11} />
            <OutlineBox width={210} height={28} className="mt-1" />
          </div>
        ))}
      </OutlineSheet>
    </PageOutline>
  );
}

// The intro log (the console's Asks tab while Asks is off): the area's tabs, the period and CSV row, the state
// filters, then the log.
function AdminIntroLogOutline() {
  return (
    <PageOutline title="Asks & intros">
      <OutlineChips widths={[58, 82]} className="mb-5" isWrapped />
      <div aria-hidden="true" className="mb-5 flex justify-between gap-2">
        <OutlineBox width={196} height={36} />
        <OutlineBox width={96} height={36} />
      </div>
      <OutlineChips widths={[56, 92, 80, 90]} className="" />
      <OutlineRows count={5} hasAvatar={false} hasEnd />
    </PageOutline>
  );
}

// Members: the area's tabs, the filters, the search, then the table's rows.
function AdminMembersOutline() {
  return (
    <PageOutline title="Members">
      <OutlineChips widths={[96, 76, 70, 112, 56]} className="mb-5" isWrapped />
      <OutlineChips widths={[62, 88, 86, 112]} className="" />
      <OutlineBox height={44} className="mt-3.5 mb-1.5" />
      <OutlineRows count={5} hasEnd />
    </PageOutline>
  );
}

const FIELD_CHIPS = [92, 92, 92, 108];

// Announce: the area's tabs, then the composer (subject, message, who gets it).
function AdminAnnounceOutline() {
  return (
    <PageOutline title="Announce">
      <OutlineChips widths={[130, 110]} className="mb-5" isWrapped />
      <OutlineSheet>
        <OutlineLine width={62} height={13} />
        <OutlineBox height={44} className="mt-2.5" />
        <OutlineLine width={72} height={13} className="mt-5" />
        <OutlineBox height={220} className="mt-2.5" />
        <div className="mt-3 flex flex-wrap gap-2">
          {FIELD_CHIPS.map((width, index) => (
            <OutlineBox key={index} width={width} height={34} />
          ))}
        </div>
        <OutlineLine width={92} height={13} className="mt-6" />
        <OutlineBox height={38} className="mt-2.5" />
      </OutlineSheet>
    </PageOutline>
  );
}

// Set up: the branding form (name, logo, colour), then the save button.
function AdminSetupOutline() {
  return (
    <PageOutline title="Set up">
      <OutlineSheet>
        <OutlineLine width={84} height={16} />
        <OutlineLine width={136} height={13} className="mt-6" />
        <OutlineBox height={44} className="mt-2.5" />
        <OutlineLine width={70} height={13} className="mt-6" />
        <OutlineBox width={138} height={36} className="mt-2.5" />
        <OutlineLine width={96} height={13} className="mt-6" />
        <div className="mt-2.5 flex gap-2">
          <OutlineBox width={44} height={44} />
          <OutlineBox height={44} className="flex-1" />
        </div>
        <OutlineLine width="80%" height={28} className="mt-3" />
      </OutlineSheet>
      <OutlineBox width={127} height={40} className="mt-2.5" />
    </PageOutline>
  );
}

const TAB_OUTLINES: Readonly<Record<string, () => ReactNode>> = {
  "/today": TodayOutline,
  "/rooms": RoomsOutline,
  "/asks": AsksOutline,
  "/people": PeopleOutline,
  "/inbox": InboxOutline,
  "/admin": AdminHomeOutline,
  "/admin/asks": AdminAsksOutline,
  "/admin/intros": AdminIntroLogOutline,
  "/admin/members": AdminMembersOutline,
  "/admin/announcements": AdminAnnounceOutline,
  "/admin/settings": AdminSetupOutline,
};

// The address a link leads to, without its query or fragment ("/asks?tab=yours" is "/asks").
export function toPathname(href: string) {
  return href.split(/[?#]/)[0] ?? href;
}

export function hasTabOutline(href: string) {
  return toPathname(href) in TAB_OUTLINES;
}

// The outline drawn for a tab's address, or null for a page that has none.
export function renderTabOutline(href: string): ReactNode {
  const Outline = TAB_OUTLINES[toPathname(href)];
  return Outline ? <Outline /> : null;
}
