import { parseArgs } from "node:util";

import { loadSetupFile, readSetupSecrets } from "../src/platform/setup-instance/setup-file.ts";
import { runSetup, type SetupStep } from "../src/platform/setup-instance/run-setup.ts";

// pnpm setup:instance --url <app url> --file <setup.json> [--demo]   (docs/SETUP-WITH-CLAUDE.md)
const MARKS: Record<SetupStep["outcome"], string> = { done: "✓", skipped: "–", failed: "✗", person: "→" };
const USAGE = "Usage: pnpm setup:instance --url <app url> --file <setup.json> [--demo]";

// -> the exit code.
async function main(): Promise<number> {
  const { values } = parseArgs({ options: { url: { type: "string" }, file: { type: "string" }, demo: { type: "boolean", default: false } } });
  if (!values.url || !values.file) {
    console.error(USAGE);
    return 2;
  }
  try {
    const { ok } = await runSetup({
      url: values.url,
      loaded: await loadSetupFile(values.file),
      secrets: readSetupSecrets(process.env),
      demo: values.demo,
      print: ({ step, outcome, detail }) => console.log(`${MARKS[outcome]} ${step}: ${detail}`),
    });
    console.log(ok ? `Done. Open ${new URL(values.url).origin}/admin to see it.` : "Not finished. Fix each line marked ✗ and run it again; it is safe to repeat.");
    return ok ? 0 : 1;
  } catch (error) {
    console.error(`Setup failed: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  }
}

// exitCode, not exit(): exiting while fetch's sockets still close crashes Node on Windows.
process.exitCode = await main();
