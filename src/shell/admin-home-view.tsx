import Link from "next/link";

import type { AdminHomeItem } from "@/shell/admin-home";
import type { ThisWeek } from "@/shell/admin-this-week";
import { INTRO_WAIT_DAYS, THIS_WEEK_DAYS } from "@/shell/admin-this-week-rules";

// The console's Home after launch (round 6): this week's four numbers, then what needs the admin, each a link.

const NUMBER = new Intl.NumberFormat("en-US");

function readTiles({ activeFounders, asksWithNoHelp, introsWaiting, roomJoins }: ThisWeek) {
  const tiles = [
    { value: activeFounders, label: "founders active" },
    asksWithNoHelp === null ? null : { value: asksWithNoHelp, label: "open asks with no help" },
    introsWaiting === null ? null : { value: introsWaiting, label: `intros waiting over ${INTRO_WAIT_DAYS} days` },
    roomJoins === null ? null : { value: roomJoins, label: "room joins", isGood: roomJoins > 0 },
  ];
  return tiles.filter((tile) => tile !== null).map((tile) => ({ label: tile.label, value: NUMBER.format(tile.value), isGood: "isGood" in tile ? Boolean(tile.isGood) : false }));
}

// Three or four tiles in one row on a desktop; two a row on a phone, three in a row when Rooms is off.
function ThisWeekTiles({ tiles }: { tiles: ReturnType<typeof readTiles> }) {
  return (
    <div data-slot="kv-tiles" className="fh-kv" style={tiles.length === 4 ? undefined : { gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
      {tiles.map(({ label, value, isGood }) => (
        <div key={label} className={isGood ? "fh-good" : undefined}>
          <b>{value}</b>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function NeedsYou({ items }: { items: readonly AdminHomeItem[] }) {
  return (
    <section className="fh-sheet" aria-labelledby="h-needs-you" data-testid="admin-home-needs-you">
      <h2 className="fh-h3" id="h-needs-you">
        Needs you
      </h2>
      {items.length === 0 ? (
        <p className="fh-small fh-muted mt-1.5">Nothing right now.</p>
      ) : (
        <ul className="fh-rows mt-1.5">
          {items.map(({ id, label, href, isUrgent }) => (
            <li key={id} className="fh-r" data-item={id}>
              <Link href={href} className={isUrgent ? "font-semibold text-ribbon underline" : "underline decoration-1 underline-offset-[3px]"}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

type AdminHomeViewProps = { communityName: string; thisWeek: ThisWeek; items: readonly AdminHomeItem[] };

export function AdminHomeView({ communityName, thisWeek, items }: AdminHomeViewProps) {
  return (
    <>
      <div className="fh-pagehead">
        <h1 className="fh-h1">This week</h1>
        <p className="fh-lede">{communityName}, the last {THIS_WEEK_DAYS} days.</p>
      </div>
      <section className="mb-4" aria-label="This week in numbers" data-testid="admin-home-this-week">
        <ThisWeekTiles tiles={readTiles(thisWeek)} />
      </section>
      <NeedsYou items={items} />
    </>
  );
}
