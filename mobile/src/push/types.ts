export type PushSetup = { token: string | null; reason: string | null };

// What an alert carries: `url` (a path on the server that sent it), `kind`, and `origin` (that server).
export type AlertTap = { data: Record<string, unknown> | null };
