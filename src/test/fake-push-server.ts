import { createECDH, randomBytes } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";

// A stand-in for the push services: browsers' Web Push endpoints and Expo's push API. Never a real push service.
// A Web Push path containing "gone" answers 410 (the subscription is dead), "unknown" 404; an Expo token containing "Gone" gets
// Expo's DeviceNotRegistered ticket.

export const EXPO_PATH = "/--/api/v2/push/send";

type RecordedPush = { path: string; headers: IncomingMessage["headers"]; bytes: number };
type ExpoMessage = { to: string; title: string; body: string; data: { url: string; kind: string } };

async function readBody(request: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of request) if (Buffer.isBuffer(chunk)) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export async function startFakePushServer() {
  const state: { webPushes: RecordedPush[]; expoMessages: ExpoMessage[] } = { webPushes: [], expoMessages: [] };

  const server = createServer(async (request, response) => {
    const path = request.url ?? "/";
    const body = await readBody(request);
    if (path === EXPO_PATH) {
      const messages = JSON.parse(body.toString("utf8")) as ExpoMessage[];
      state.expoMessages.push(...messages);
      response.setHeader("Content-Type", "application/json");
      response.end(JSON.stringify({ data: messages.map(({ to }) => (to.includes("Gone") ? { status: "error", details: { error: "DeviceNotRegistered" } } : { status: "ok", id: "ticket" })) }));
      return;
    }
    state.webPushes.push({ path, headers: request.headers, bytes: body.byteLength });
    response.statusCode = path.includes("gone") ? 410 : path.includes("unknown") ? 404 : 201;
    response.end();
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("The fake push server has no port.");
  const url = `http://127.0.0.1:${address.port}`;

  return {
    url,
    expoUrl: `${url}${EXPO_PATH}`,
    state,
    reset: () => {
      state.webPushes = [];
      state.expoMessages = [];
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

// What a browser hands over when it subscribes: an endpoint and its encryption keys.
export function makeFakeSubscription(endpoint: string) {
  const keys = createECDH("prime256v1");
  keys.generateKeys();
  return { endpoint, keys: { p256dh: keys.getPublicKey().toString("base64url"), auth: randomBytes(16).toString("base64url") } };
}
