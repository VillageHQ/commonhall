import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { randomUUID } from "node:crypto";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";

import { user } from "@/platform/database/auth-schema";
import { createDisposableDatabase } from "@/test/database";

import { readPreferences } from "./reads";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "../../..");
const MIGRATIONS_FOLDER = join(REPOSITORY_ROOT, "drizzle");
const LAST_MIGRATION_BEFORE_QUIET_TIMES = "0044_notification_log";
const MIGRATION_HOOK_TIMEOUT_MS = 120_000;

const journalSchema = z.looseObject({ version: z.string(), dialect: z.string(), entries: z.array(z.looseObject({ tag: z.string() })) });

function writeMigrationsUpTo(lastTag: string) {
  const folder = mkdtempSync(join(tmpdir(), "quiet-times-migrations-"));
  cpSync(MIGRATIONS_FOLDER, folder, { recursive: true });
  const journal = journalSchema.parse(JSON.parse(readFileSync(join(folder, "meta/_journal.json"), "utf8")));
  const lastIndex = journal.entries.findIndex(({ tag }) => tag === lastTag);
  writeFileSync(join(folder, "meta/_journal.json"), JSON.stringify({ ...journal, entries: journal.entries.slice(0, lastIndex + 1) }));
  return folder;
}

describe("the quiet times migration", () => {
  let disposable: Awaited<ReturnType<typeof createDisposableDatabase>>;
  let client: Client;
  let partialFolder: string;
  const windowOn = randomUUID();
  const windowOff = randomUUID();

  function database() {
    return drizzle({ client });
  }

  beforeAll(async () => {
    disposable = await createDisposableDatabase();
    client = new Client({ connectionString: disposable.connectionString });
    await client.connect();
    partialFolder = writeMigrationsUpTo(LAST_MIGRATION_BEFORE_QUIET_TIMES);
    await migrate(database(), { migrationsFolder: partialFolder });

    await database().insert(user).values([
      { id: windowOn, name: "Old Quiet", email: `${windowOn}@old.test`, emailVerified: true },
      { id: windowOff, name: "Old Loud", email: `${windowOff}@old.test`, emailVerified: true },
    ]);
    await database().execute(sql`
      insert into notification_preference (user_id, quiet_is_on, quiet_from, quiet_to, quiet_days, time_zone)
      values (${windowOn}, true, '22:30', '06:45', '{1,2,3,4,5}', 'Europe/Berlin'),
             (${windowOff}, false, '21:00', '07:00', '{0,1,2,3,4,5,6}', 'UTC')
    `);
    await migrate(database(), { migrationsFolder: MIGRATIONS_FOLDER });
  }, MIGRATION_HOOK_TIMEOUT_MS);

  afterAll(async () => {
    await client.end();
    await disposable.destroy();
    rmSync(partialFolder, { recursive: true, force: true });
  }, MIGRATION_HOOK_TIMEOUT_MS);

  it("makes a window that was on the member's first quiet time, unchanged, with Let through on and no pause", async () => {
    const state = await readPreferences(database() as never, windowOn);

    expect(state.quietTimes).toEqual([{ from: "22:30", to: "06:45", allDay: false, days: [1, 2, 3, 4, 5] }]);
    expect(state).toMatchObject({ timeZone: "Europe/Berlin", letDirectThrough: true, pausedUntil: null });
  });

  it("copies nothing for a window that was off", async () => {
    expect((await readPreferences(database() as never, windowOff)).quietTimes).toEqual([]);
  });
});
