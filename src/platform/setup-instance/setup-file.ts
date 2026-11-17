import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { z } from "zod";

// `pnpm setup:instance`: the one file that describes a new community (docs/SETUP-WITH-CLAUDE.md). Secrets never live
// in it: the setup token, the admin password and the Village secret key come from environment variables.
export const SETUP_SECRET_VARIABLES = {
  setupToken: "SETUP_TOKEN",
  adminPassword: "COMMONHALL_ADMIN_PASSWORD",
  villageSecretKey: "VILLAGE_SECRET_KEY",
} as const;

const HEX_COLOUR = /^#[0-9a-f]{6}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// Field names that would hold a secret; the file is refused when it has one, so a key is never committed by accident.
const SECRET_FIELD = /^(password|secret|secretkey|token|setuptoken|apikey)$/i;

const setupFileSchema = z
  .object({
    admin: z
      .object(
        { name: z.string({ error: "admin.name: enter a name." }).trim().min(1, "admin.name: enter a name."), email: z.email("admin.email: enter a valid email address.") },
        { error: "admin: add the admin's name and email." },
      )
      .strict(),
    brand: z
      .object({
        name: z.string().trim().min(1, "brand.name: enter the community's name."),
        // The brand sets the whole look, as the brand card does: a descriptor left out is cleared.
        descriptor: z.string().trim().default(""),
        accent: z.string({ error: "brand.accent: add the brand colour, like #24525A." }).regex(HEX_COLOUR, "brand.accent: use a colour like #24525A."),
        logo: z.string().min(1).optional(),
        logoBackdrop: z.enum(["light", "dark"]).default("light"),
      })
      .strict()
      .optional(),
    village: z.object({ publicKey: z.string().trim().min(1, "village.publicKey: paste the public key.") }).strict().optional(),
    members: z
      .object({
        csv: z.string().min(1, "members.csv: name the CSV file."),
        basis: z.enum(["ask", "terms"]).default("ask"),
        termsDate: z.string().regex(ISO_DATE, "members.termsDate: use a date like 2026-01-31.").optional(),
      })
      .strict()
      .refine((members) => members.basis !== "terms" || members.termsDate !== undefined, "members.termsDate: needed when basis is \"terms\".")
      .optional(),
    // true confirms everyone waiting for confirmation; a list confirms only those addresses.
    confirmWaiting: z.union([z.boolean(), z.array(z.email())]).default(false),
  })
  .strict();

export type SetupFile = z.infer<typeof setupFileSchema>;

export type SetupSecrets = { setupToken: string | null; adminPassword: string | null; villageSecretKey: string | null };

function findSecretField(value: unknown, path: string[] = []): string | null {
  if (Array.isArray(value)) return value.map((item, index) => findSecretField(item, [...path, String(index)])).find(Boolean) ?? null;
  if (value === null || typeof value !== "object") return null;
  for (const [key, inner] of Object.entries(value)) {
    if (SECRET_FIELD.test(key)) return [...path, key].join(".");
    const found = findSecretField(inner, [...path, key]);
    if (found) return found;
  }
  return null;
}

// The file's text -> the checked setup, or the first plain problem. Paths inside stay as written.
export function parseSetupFile(text: string): { setup: SetupFile } | { error: string } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { error: "The setup file is not valid JSON." };
  }
  const secretField = findSecretField(raw);
  if (secretField) {
    return { error: `The setup file holds a secret (${secretField}). Remove it and set it as an environment variable instead: ${Object.values(SETUP_SECRET_VARIABLES).join(", ")}.` };
  }
  const parsed = setupFileSchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const where = issue?.path.join(".");
    const message = issue?.message ?? "The setup file is invalid.";
    return { error: where && !message.startsWith(where) ? `${where}: ${message}` : message };
  }
  return { setup: parsed.data };
}

export function readSetupSecrets(environment: Record<string, string | undefined>): SetupSecrets {
  const read = (name: string) => environment[name]?.trim() || null;
  return {
    setupToken: read(SETUP_SECRET_VARIABLES.setupToken),
    adminPassword: read(SETUP_SECRET_VARIABLES.adminPassword),
    villageSecretKey: read(SETUP_SECRET_VARIABLES.villageSecretKey),
  };
}

export type LoadedSetup = { setup: SetupFile; logo: Uint8Array | null; membersCsv: string | null };

// Reads the file and the files it names (relative to it). -> the setup with the logo and CSV loaded.
async function readNamedFile(path: string, what: string) {
  try {
    return await readFile(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new Error(`Can't find ${what}: ${path}`);
    throw error;
  }
}

export async function loadSetupFile(path: string): Promise<LoadedSetup> {
  const parsed = parseSetupFile((await readNamedFile(resolve(path), "the setup file")).toString("utf8"));
  if ("error" in parsed) throw new Error(parsed.error);
  const { setup } = parsed;
  const base = dirname(resolve(path));
  const logo = setup.brand?.logo ? new Uint8Array(await readNamedFile(resolve(base, setup.brand.logo), "the logo (brand.logo)")) : null;
  const membersCsv = setup.members ? (await readNamedFile(resolve(base, setup.members.csv), "the members CSV (members.csv)")).toString("utf8") : null;
  return { setup, logo, membersCsv };
}
