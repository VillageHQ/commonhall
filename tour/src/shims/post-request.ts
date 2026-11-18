import type { z } from "zod";

// The tour's stand-in for the app's requests: the tour never calls a server. A request waits forever, so a button the
// pointer presses stays in its "sending" state and nothing leaves the page.

export const MODULE_OFF_EVENT = "community:module-off";

export class RequestFailure extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, message: string, code: string | null = null) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function postRequest<Schema extends z.ZodType>(_path: string, _body: unknown, _schema: Schema, _failureMessage?: string): Promise<z.infer<Schema>> {
  return new Promise(() => undefined);
}
