import { desc, sql } from "drizzle-orm";
import { check, index, integer, pgTable, primaryKey, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { bytea } from "../../platform/database/bytea.ts";
import { user } from "../../platform/database/auth-schema.ts";
import { LIBRARY_JOBS, LIBRARY_KINDS, LIBRARY_LIMITS, LIBRARY_VISIBILITIES } from "./contract.ts";

const MILLISECOND_PRECISION = 3;

function libraryTimestamp(name: string) {
  return timestamp(name, { withTimezone: true, precision: MILLISECOND_PRECISION });
}

function toSqlList(values: Record<string, string>) {
  return sql.raw(
    Object.values(values)
      .map((value) => `'${value}'`)
      .join(", "),
  );
}

// One shared thing: a skill, an agent, a prompt, a tool connection, an automation or a playbook. Its words are the
// latest version's; each upload is a `library_version` with its own files.
export const libraryItem = pgTable(
  "library_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    pitch: text("pitch").notNull(),
    kind: text("kind").notNull(),
    job: text("job").notNull(),
    description: text("description"),
    install: text("install"),
    link: text("link"),
    visibility: text("visibility").notNull().default(LIBRARY_VISIBILITIES.portfolio),
    versionCount: integer("version_count").notNull().default(1),
    downloadCount: integer("download_count").notNull().default(0),
    featuredAt: libraryTimestamp("featured_at"),
    featuredByUserId: text("featured_by_user_id").references(() => user.id, { onDelete: "set null" }),
    // The feed post that announced it (src/shell/library-publish.ts), removed with the item. No foreign key: this
    // module can't name the feed's table.
    feedPostId: uuid("feed_post_id"),
    createdAt: libraryTimestamp("created_at").notNull().defaultNow(),
    updatedAt: libraryTimestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("library_item_updated_idx").on(desc(table.updatedAt), desc(table.id)),
    index("library_item_author_idx").on(table.authorId),
    check("library_item_kind_known", sql`${table.kind} in (${toSqlList(LIBRARY_KINDS)})`),
    check("library_item_job_known", sql`${table.job} in (${toSqlList(LIBRARY_JOBS)})`),
    check("library_item_visibility_known", sql`${table.visibility} in (${toSqlList(LIBRARY_VISIBILITIES)})`),
    check("library_item_title_length", sql`char_length(${table.title}) between 1 and ${sql.raw(String(LIBRARY_LIMITS.titleLength))}`),
    check("library_item_pitch_length", sql`char_length(${table.pitch}) between 1 and ${sql.raw(String(LIBRARY_LIMITS.pitchLength))}`),
  ],
);

// The companies that may see an item whose visibility is "companies", by their name without case or extra spaces.
export const libraryItemCompany = pgTable(
  "library_item_company",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => libraryItem.id, { onDelete: "cascade" }),
    companyKey: text("company_key").notNull(),
    company: text("company").notNull(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.companyKey] })],
);

export const libraryVersion = pgTable(
  "library_version",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => libraryItem.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    createdAt: libraryTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [unique("library_version_number").on(table.itemId, table.number)],
);

// Files live in Postgres, as avatars and logos do. Each is at most 10 MB, and so is one upload's set.
export const libraryFile = pgTable(
  "library_file",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    versionId: uuid("version_id")
      .notNull()
      .references(() => libraryVersion.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    bytes: bytea("bytes").notNull(),
    size: integer("size").notNull(),
    createdAt: libraryTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("library_file_version_idx").on(table.versionId),
    check("library_file_size", sql`octet_length(${table.bytes}) <= ${sql.raw(String(LIBRARY_LIMITS.maximumBytes))}`),
  ],
);

// One upvote per member per item. The leaderboard counts these, by the item's author and the author's company.
export const libraryVote = pgTable(
  "library_vote",
  {
    itemId: uuid("item_id")
      .notNull()
      .references(() => libraryItem.id, { onDelete: "cascade" }),
    voterId: text("voter_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: libraryTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.voterId] }), index("library_vote_created_idx").on(table.createdAt), index("library_vote_voter_idx").on(table.voterId)],
);

// "Worked for us": one line per member per item; writing again replaces it.
export const libraryReview = pgTable(
  "library_review",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => libraryItem.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: libraryTimestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    unique("library_review_one_per_member").on(table.itemId, table.authorId),
    index("library_review_author_idx").on(table.authorId),
    check("library_review_length", sql`char_length(${table.body}) between 1 and ${sql.raw(String(LIBRARY_LIMITS.reviewLength))}`),
  ],
);
