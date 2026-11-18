import type { Metadata } from "next";
import Link from "next/link";

import { BackLink } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { KvTiles } from "@/components/ui/figures";
import { getDatabase } from "@/platform/database/client";
import { ROUTES } from "@/platform/http/routes";
import { requireAdmin } from "@/platform/auth/session";
import { modulePage } from "@/platform/modules/module-page";

import { adminManifest } from "@/modules/admin/manifest";
import { formatDayMonth } from "@/modules/admin/console-periods";
import { WEEKS_SHOWN } from "@/modules/admin/calls";
import { readCalls } from "@/modules/admin/reads-calls";
import { CallsCsvButton } from "@/modules/admin/components/calls-csv-button";
import { COMMUNITY_ROLE_LABELS } from "@/modules/members/contract-community-roles";

export const metadata: Metadata = { title: "Calls requested" };

const LATEST_SHOWN = 50;

// Calls requested: each "Book a call" click on a profile or the directory, counted. Admins see who asked whom; whether
// the call then happened lives in the member's own calendar, not here.
export default modulePage(adminManifest, async function AdminCallsPage() {
  await requireAdmin();
  const calls = await readCalls(getDatabase());
  return (
    <>
      <BackLink href={ROUTES.admin}>Home</BackLink>
      <div className="fh-pagehead">
        <h1 className="fh-h1" data-testid="calls-total">
          {calls.total} {calls.total === 1 ? "call" : "calls"} requested
        </h1>
        <p className="fh-lede">Each “Book a call” a member pressed on a mentor’s or expert’s profile, counted. Bookings themselves happen in their own calendar.</p>
        <div className="fh-btn-row mt-3.5">
          <CallsCsvButton />
        </div>
      </div>
      {calls.total === 0 ? (
        <EmptyState title="No calls requested yet" description="Members add a booking link on My profile; once someone presses “Book a call”, it is counted here." />
      ) : (
        <div className="fh-grid">
          <div className="fh-c7 fh-stack">
            <section className="fh-sheet">
              <h2 className="fh-h3">Per person</h2>
              <table className="fh-tbl mt-3" data-testid="calls-per-person">
                <thead>
                  <tr>
                    <th>Call with</th>
                    <th>Role</th>
                    <th>Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.perPerson.map((person) => (
                    <tr key={person.memberId ?? person.name}>
                      <td>{person.memberId ? <Link href={`${ROUTES.adminMembers}/${person.memberId}`}>{person.name}</Link> : person.name}</td>
                      <td>{COMMUNITY_ROLE_LABELS[person.role]}</td>
                      <td>{person.calls}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            <section className="fh-sheet">
              <h2 className="fh-h3">Latest</h2>
              <table className="fh-tbl mt-3" data-testid="calls-latest">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Asked by</th>
                    <th>Call with</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.rows.slice(0, LATEST_SHOWN).map((row) => (
                    <tr key={row.id}>
                      <td>{formatDayMonth(row.createdAt)}</td>
                      <td>{row.requesterName}</td>
                      <td>{row.memberName}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {calls.rows.length > LATEST_SHOWN ? <p className="fh-small fh-muted mt-2">The CSV holds all {calls.rows.length}.</p> : null}
            </section>
          </div>
          <div className="fh-c5 fh-stack">
            <section className="fh-sheet">
              <h2 className="fh-h3">At a glance</h2>
              <KvTiles
                className="fh-kv-two"
                tiles={[
                  { value: calls.total, label: "since launch" },
                  { value: calls.lastThirtyDays, label: "in the last 30 days" },
                ]}
              />
            </section>
            <section className="fh-sheet">
              <h2 className="fh-h3">Per week</h2>
              <p className="fh-small fh-muted mt-1">The last {WEEKS_SHOWN} weeks, each starting Monday.</p>
              <table className="fh-tbl mt-3" data-testid="calls-per-week">
                <thead>
                  <tr>
                    <th>Week of</th>
                    <th>Calls</th>
                  </tr>
                </thead>
                <tbody>
                  {calls.perWeek.map(({ week, calls: count }) => (
                    <tr key={week}>
                      <td>{formatDayMonth(new Date(week))}</td>
                      <td>{count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        </div>
      )}
    </>
  );
});
