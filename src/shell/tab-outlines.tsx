import type { ReactNode } from "react";

import { OutlineBox, OutlineCard, OutlineChips, OutlineCircle, OutlineLine, OutlineListRows, OutlineRows, OutlineSectionHead, OutlineSheet, OutlineTitle, PageOutline } from "@/components/page-outline";

// Each tab's outline (smooth-app Part A): the page's own head and grey blocks shaped like its first screen at 390 px,
// drawn the moment its tab is tapped (pressed-tab.tsx) and replaced when the page arrives. Keyed by the tab's
// address; a tab without one here (Perks, the job board) keeps the old page on screen until the new one comes.

function TodayOutline() {
  const dateLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
  // Today's head (the date, the 24 px greeting), the prompt row, "Waiting on you" and two waiting rows (ListRow), drawn
  // with the global classes and inline sizes, so the outline sits where the page lands before today.css is loaded.
  return (
    <div data-slot="page-outline" aria-busy="true" className="td-page">
      <p role="status" className="fh-sr">
        Loading…
      </p>
      <header style={{ marginBottom: 0 }}>
        <p style={{ font: "400 13px/18px var(--sans)", color: "var(--graphite)" }}>{dateLabel}</p>
        <h1 style={{ marginTop: 4, font: "600 24px/30px var(--serif)" }}>
          <OutlineTitle label="Today" />
        </h1>
      </header>
      <div aria-hidden="true">
        <OutlinePromptRow />
        <div className="fh-section-label flex items-center" style={{ height: 18 }}>
          <OutlineLine width={110} height={12} />
        </div>
        <div style={{ margin: "0 -16px" }}>
          {TODAY_ROWS.map((index) => (
            <div key={index} className="fh-lr" style={{ minHeight: 112 }}>
              <OutlineCircle size={48} />
              <div className="grid gap-2.5 pt-1">
                <OutlineLine width={`${52 - index * 10}%`} height={14} />
                <OutlineLine width={`${86 - index * 12}%`} height={12} />
                <OutlineBox width={84} height={36} className="mt-1" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const TODAY_ROWS = [0, 1];

// The prompt row (Today and Asks): a 32 px face and a 44 px field-look button in a 64 px row.
function OutlinePromptRow({ marginTop = 16 }: { marginTop?: number }) {
  return (
    <div className="flex items-center gap-3" style={{ minHeight: 64, padding: "10px 0", marginTop }}>
      <OutlineCircle size={32} />
      <OutlineBox height={44} className="flex-1" />
    </div>
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

// The prompt row, the search 12 px under it, the chips 12 px under that, then asks (a 36 px face, the name and the
// company line, two lines of the ask). The head keeps 4 px under the title, as asks.css sets it.
function AsksOutline() {
  return (
    <PageOutline title="Asks" className="fh-narrow">
      <div aria-hidden="true" style={{ marginTop: -16 }}>
        <OutlinePromptRow marginTop={0} />
        <OutlineBox height={44} className="mt-3" />
        <div style={{ marginTop: 10 }}>
          <OutlineChips widths={[60, 88, 72]} className="" />
        </div>
        <div className="grid" style={{ marginTop: 4 }}>
          {ASK_ITEMS.map((index) => (
            <div key={index} className="grid gap-3 border-b border-[var(--rule)] py-4">
              <div className="flex items-center gap-2.5">
                <OutlineCircle size={36} />
                <div className="grid flex-1 gap-2">
                  <OutlineLine width="38%" height={14} />
                  <OutlineLine width="26%" height={11} />
                </div>
              </div>
              <OutlineLine width="94%" height={14} />
              <OutlineLine width="70%" height={14} />
            </div>
          ))}
        </div>
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
  // Round 8 (ui-polish Part 3): the chips 12 px under the title, then each section's label over full-width ListRows,
  // where the real list lands (inbox.css isn't loaded yet when this shows, so the offsets are inline).
  return (
    <PageOutline title="Inbox">
      <div aria-hidden="true" style={{ marginTop: -8 }}>
        <OutlineChips widths={[42, 64]} className="mb-1" />
        <OutlineSectionLabel width={104} />
        <div style={{ marginInline: -16 }}>
          <OutlineListRows count={1} pitch={116} />
        </div>
        <OutlineSectionLabel width={72} />
        <div style={{ marginInline: -16 }}>
          <OutlineListRows count={3} />
        </div>
      </div>
    </PageOutline>
  );
}

// A SectionLabel's line (13/600, 20 px above and 8 px below).
function OutlineSectionLabel({ width }: { width: number }) {
  return (
    <div className="flex h-[18px] items-center" style={{ margin: "20px 0 8px" }}>
      <OutlineLine width={width} height={12} />
    </div>
  );
}

const STAT_CELLS = [0, 1, 2, 3];
const NEEDS_ROWS = [0, 1, 2];

// A line of text in a line box of the page's own height (a 22 px line for 15 px text), so the blocks below land where
// the page's do.
function TextLine({ width, height = 12, lineHeight = 22, className }: { width: string | number; height?: number; lineHeight?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center ${className ?? ""}`} style={{ height: lineHeight }}>
      <OutlineLine width={width} height={height} />
    </div>
  );
}

// The console's Home: the heading (This week, or the launch checklist's welcome) and its line, the week's four
// numbers, the partner report card, then what needs the admin.
function AdminHomeOutline() {
  return (
    <PageOutline title={<OutlineTitle label="Home" width="46%" />} description={<OutlineLine width="64%" height={13} className="inline-block align-middle" />}>
      <div aria-hidden="true">
        <div className="mb-4 grid grid-cols-2 overflow-hidden rounded-[var(--r)] border border-[var(--rule)] bg-[var(--leaf)]">
          {STAT_CELLS.map((index) => (
            <div key={index} className={`grid gap-2 p-4 ${index % 2 === 0 ? "border-r border-[var(--rule)]" : ""} ${index < 2 ? "border-b border-[var(--rule)]" : ""}`}>
              <OutlineLine width={22} height={22} />
              <OutlineLine width="78%" height={11} />
            </div>
          ))}
        </div>
        <OutlineSheet className="mb-4">
          <TextLine width={110} height={15} />
          <TextLine width="80%" height={11} />
          <TextLine width="52%" height={11} />
        </OutlineSheet>
        <OutlineSheet>
          <TextLine width={92} height={15} className="mb-2" />
          {NEEDS_ROWS.map((index) => (
            <div key={index} className="border-t border-[var(--rule)] py-3">
              <TextLine width={`${62 - index * 8}%`} height={13} />
            </div>
          ))}
          <div className="border-t border-[var(--rule)]" />
        </OutlineSheet>
      </div>
    </PageOutline>
  );
}

const ADMIN_ASK_ROWS = [0, 1, 2];

// The console's Asks & intros: the area's tabs, then the asks with no help yet (each: three lines of the ask, who and
// when, the row of actions).
function AdminAsksOutline() {
  return (
    <PageOutline title="Asks & intros">
      <OutlineChips widths={[58, 82]} className="mb-5" isWrapped />
      <OutlineSheet>
        <div aria-hidden="true" className="mb-3.5 flex h-[22px] items-center justify-between">
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

const MEMBER_ROWS = [0, 1, 2, 3, 4];

// Members: the area's tabs (they wrap), the state filters (they scroll), the search, then the members: a face, the
// name over the email, and the state over the joining date at the end.
function AdminMembersOutline() {
  return (
    <PageOutline title="Members">
      <OutlineChips widths={[84, 66, 70, 104, 56]} className="mb-5" isWrapped />
      <OutlineChips widths={[64, 84, 80, 118]} className="" />
      <OutlineBox height={44} className="mt-3.5 mb-1.5" />
      <div aria-hidden="true" className="fh-rows">
        {MEMBER_ROWS.map((index) => (
          <div key={index} className="fh-r">
            <OutlineCircle size={36} />
            <div className="grid gap-2 py-0.5">
              <OutlineLine width={`${52 - (index % 3) * 8}%`} height={15} />
              <OutlineLine width={`${76 - (index % 2) * 12}%`} height={11} />
            </div>
            <div className="grid justify-items-end gap-2.5">
              <OutlineBox width={84} height={24} />
              <OutlineLine width={66} height={11} />
            </div>
          </div>
        ))}
      </div>
    </PageOutline>
  );
}

const FIELD_CHIPS = [88, 92, 92, 104];

// Announce: the area's tabs, then the composer: subject, message, the name fields, who gets it, the count and Send.
function AdminAnnounceOutline() {
  return (
    <PageOutline title="Announce">
      <OutlineChips widths={[130, 110]} className="mb-5" isWrapped />
      <OutlineSheet>
        <OutlineLine width={62} height={13} />
        <OutlineBox height={44} className="mt-2.5" />
        <OutlineLine width={72} height={13} className="mt-5" />
        <OutlineBox height={110} className="mt-2.5" />
        <div className="mt-3 flex flex-wrap gap-2">
          {FIELD_CHIPS.map((width, index) => (
            <OutlineBox key={index} width={width} height={32} />
          ))}
        </div>
        <OutlineLine width={92} height={13} className="mt-6" />
        <OutlineBox height={72} className="mt-2.5" />
        <OutlineLine width="84%" height={11} className="mt-3" />
        <OutlineBox width={204} height={40} className="mt-3" />
      </OutlineSheet>
    </PageOutline>
  );
}

const COLOUR_SWATCHES = [0, 1, 2, 3, 4, 5, 6];

// Set up: the branding form (name, logo, colour and its swatches, the preview), then the save button.
function AdminSetupOutline() {
  return (
    <PageOutline title="Set up">
      <OutlineSheet>
        <OutlineLine width={84} height={16} />
        <OutlineLine width={136} height={13} className="mt-6" />
        <OutlineBox height={44} className="mt-2.5" />
        <OutlineLine width={70} height={13} className="mt-6" />
        <OutlineBox width={138} height={32} className="mt-2.5" />
        <OutlineLine width={120} height={11} className="mt-2.5" />
        <OutlineLine width={96} height={13} className="mt-6" />
        <div className="mt-2.5 flex gap-2">
          <OutlineBox width={44} height={44} />
          <OutlineBox height={44} className="flex-1" />
        </div>
        <div aria-hidden="true" className="mt-2 flex gap-2">
          {COLOUR_SWATCHES.map((index) => (
            <OutlineCircle key={index} size={28} />
          ))}
        </div>
        <div aria-hidden="true" className="mt-7 flex items-center justify-between">
          <OutlineLine width={60} height={13} />
          <div className="grid justify-items-end gap-2">
            <OutlineBox width={30} height={30} />
            <OutlineLine width={136} height={13} />
          </div>
        </div>
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
