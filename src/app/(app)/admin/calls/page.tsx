import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
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
import { AdminSection } from "@/shell/admin-section";

export const metadata: Metadata = { title: "Calls requested" };

const LATEST_SHOWN = 50;

// Calls requested: each "Book a call" click on a profile or the directory, counted. Admins see who asked whom; whether
// the call then happened lives in the member's own calendar, not here.
export default modulePage(adminManifest, async function AdminCallsPage() {
  await requireAdmin();
  const calls = await readCalls(getDatabase());
  return (
    <AdminSection title="Members">
      <div className="fh-sheet-head mb-3">
        <h2 className="fh-h2" data-testid="calls-total">
          {calls.total} {calls.total === 1 ? "call" : "calls"} requested · {calls.lastThirtyDays} in 30 days
        </h2>
        <CallsCsvButton />
      </div>
      {calls.total === 0 ? (
        <EmptyState title="No calls yet" description="Each “Book a call” on a profile counts here." />
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
            <details className="fh-sheet">
              <summary className="fh-h3 cursor-pointer">Per week</summary>
              <p className="fh-small fh-muted mt-1">The last {WEEKS_SHOWN} weeks, from Monday.</p>
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
            </details>
          </div>
        </div>
      )}
    </AdminSection>
  );
});
