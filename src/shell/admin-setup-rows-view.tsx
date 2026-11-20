import { Pill } from "@/components/ui/pill";
import { SetupRows } from "@/components/ui/rows";

import { SETUP_ROW_STATES, type SetupRow, type SetupRowState } from "./admin-setup-rows";

function RowState({ state }: { state: SetupRowState }) {
  if (state.kind === SETUP_ROW_STATES.done) return <Pill tone="made">Set up</Pill>;
  if (state.kind === SETUP_ROW_STATES.todo) return <Pill tone="open">Not yet</Pill>;
  if (state.kind === SETUP_ROW_STATES.needs) return <Pill tone="needs">{state.text}</Pill>;
  return <small className="fh-muted">{state.text}</small>;
}

// Set up's rows: each page with one short line and whether it is set up.
export function SetupRowList({ rows }: { rows: readonly SetupRow[] }) {
  return <SetupRows rows={rows.map(({ title, href, description, state }) => ({ title, href, description, status: <RowState state={state} /> }))} />;
}
