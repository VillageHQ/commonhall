import { Hand, Megaphone } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { FlashNote } from "@/components/flash";
import { Pill, type PillTone } from "@/components/ui/pill";
import { ASKS_PAGE } from "@/modules/asks/contract";
import { ROUTES } from "@/platform/http/routes";
import { formatDayMonth } from "@/modules/admin/console-periods";

import { ASK_ROW_STATUSES, type AdminAskRow, type AdminAsks, type AskRowStatus } from "./admin-asks";
import { AskRowActions } from "./admin-asks-actions";
import { AdminSection } from "./admin-section";
import { ReportedAsks } from "./reported-asks";

// What a member reads when there is no ask yet (Commonhall's EMPTY_ASKS).
export const EMPTY_ASKS = "Founders’ asks show here.";

// The flash after an action on Asks & digest (?m=…), in Commonhall's words.
export const ASKS_FLASHES: Record<string, string> = {
  pin: "Pinned.",
  unpin: "Unpinned.",
  close: "Closed.",
  remove: "Removed. Members no longer see it.",
};

const STATUS_PILLS: Record<AskRowStatus, { tone: PillTone; label: string }> = {
  [ASK_ROW_STATUSES.open]: { tone: "open", label: "Open" },
  [ASK_ROW_STATUSES.answered]: { tone: "made", label: "Answered" },
  [ASK_ROW_STATUSES.closed]: { tone: "declined", label: "Closed" },
  [ASK_ROW_STATUSES.expired]: { tone: "declined", label: "Expired" },
  [ASK_ROW_STATUSES.update]: { tone: "plain", label: "Update" },
};

function AskRow({ row, canPin }: { row: AdminAskRow; canPin: boolean }) {
  const Icon = row.status === ASK_ROW_STATUSES.update ? Megaphone : Hand;
  const pill = STATUS_PILLS[row.status];
  return (
    <div className="fh-r">
      <span>
        <Icon aria-hidden="true" className="fh-i fh-s" strokeWidth={1.5} />
      </span>
      <div className="fh-who">
        <b className="fh-plain">
          <Link href={`${ASKS_PAGE}/${row.id}`}>{row.title}</Link>
        </b>
        <span>
          {row.authorName} · {formatDayMonth(new Date(row.createdAt))} · {row.offerCount + row.answerCount} {row.offerCount + row.answerCount === 1 ? "reply" : "replies"}
        </span>
      </div>
      <div className="fh-end">
        <Pill tone={pill.tone}>{pill.label}</Pill>
        <AskRowActions askId={row.id} title={row.title} isPinned={row.isPinned} canPin={row.isPinned || (canPin && (row.status === ASK_ROW_STATUSES.open || row.status === ASK_ROW_STATUSES.update))} canClose={row.canClose && (row.status === ASK_ROW_STATUSES.open || row.status === ASK_ROW_STATUSES.update)} />
      </div>
    </div>
  );
}

type AdminAsksViewProps = AdminAsks & { flash: string | null };

function AskRows({ rows, canPin }: { rows: readonly AdminAskRow[]; canPin: boolean }) {
  return (
    <div className="fh-rows fh-modrows">
      {rows.map((row) => (
        <AskRow key={row.id} row={row} canPin={canPin} />
      ))}
    </div>
  );
}

// The console's Asks (Asks & intros): asks nobody has helped with first, then every other ask and update, each with
// Pin / Close / Remove, and Community's reported asks when there are any.
export function AdminAsksView({ noHelp, rest, reported, canPin, flash }: AdminAsksViewProps) {
  return (
    <>
      {flash ? <FlashNote>{flash}</FlashNote> : null}
      <AdminSection title="Asks & intros">
      <div className="fh-stack">
        {noHelp.length > 0 ? (
          <section className="fh-sheet" aria-labelledby="no-help-asks">
            <div className="fh-sheet-head">
              <h2 className="fh-h3" id="no-help-asks">
                No help yet
              </h2>
              <Link href={ASKS_PAGE}>Members’ view</Link>
            </div>
            <AskRows rows={noHelp} canPin={canPin} />
          </section>
        ) : null}
        <section className="fh-sheet" aria-labelledby="every-ask">
          <h2 className="fh-h3" id="every-ask">
            {noHelp.length > 0 ? "The rest" : "Every ask and update"}
          </h2>
          {rest.length > 0 ? <AskRows rows={rest} canPin={canPin} /> : noHelp.length === 0 ? <EmptyState title="No asks yet" description={EMPTY_ASKS} /> : null}
        </section>
        {reported.length > 0 ? (
          <section className="fh-sheet" aria-labelledby="reported-asks">
            <div className="fh-sheet-head">
              <h2 className="fh-h3" id="reported-asks">
                Reported
              </h2>
              <Link href={ROUTES.adminReports}>Every report</Link>
            </div>
            <ReportedAsks reported={reported} />
          </section>
        ) : null}
      </div>
      </AdminSection>
    </>
  );
}
