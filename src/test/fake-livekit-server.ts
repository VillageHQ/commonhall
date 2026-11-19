import { createServer, type IncomingMessage } from "node:http";
import type { AddressInfo } from "node:net";

// A fake LiveKit room service: the Twirp JSON methods the app calls, who is "connected" to each room (set by the
// test), and every call it received. No real LiveKit, no audio.

export const FAKE_LIVEKIT_KEY = "fake-livekit-key";
export const FAKE_LIVEKIT_SECRET = "fake-livekit-secret-0123456789abcdef0123";

export type FakeLiveKitCall = { method: string; body: Record<string, unknown> };

const TWIRP_PREFIX = "/twirp/livekit.RoomService/";

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
}

export async function startFakeLiveKitServer() {
  const calls: FakeLiveKitCall[] = [];
  const connected = new Map<string, Set<string>>();
  let isDown = false;

  const server = createServer(async (request, response) => {
    const raw = await readBody(request);
    const method = (request.url ?? "").replace(TWIRP_PREFIX, "");
    const body = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    calls.push({ method, body });
    const send = (status: number, payload: unknown) => {
      response.writeHead(status, { "content-type": "application/json" });
      response.end(JSON.stringify(payload));
    };
    if (isDown) return send(503, { code: "unavailable", msg: "down" });
    const room = String(body.room ?? "");
    const people = connected.get(room);
    switch (method) {
      case "ListParticipants":
        return people ? send(200, { participants: [...people].map((identity) => ({ identity })) }) : send(404, { code: "not_found", msg: "room not found" });
      case "ListRooms": {
        const names = (body.names as string[] | undefined) ?? [...connected.keys()];
        return send(200, { rooms: names.filter((name) => connected.has(name)).map((name) => ({ name, numParticipants: connected.get(name)?.size ?? 0 })) });
      }
      case "UpdateParticipant":
        return people?.has(String(body.identity)) ? send(200, { identity: body.identity }) : send(404, { code: "not_found", msg: "participant not found" });
      case "DeleteRoom":
        connected.delete(room);
        return send(200, {});
      case "RemoveParticipant":
        people?.delete(String(body.identity));
        return send(200, {});
      default:
        return send(404, { code: "bad_route", msg: method });
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `ws://127.0.0.1:${port}`,
    calls,
    connect(room: string, ...identities: string[]) {
      const people = connected.get(room) ?? new Set<string>();
      for (const identity of identities) people.add(identity);
      connected.set(room, people);
    },
    disconnect(room: string, identity: string) {
      connected.get(room)?.delete(identity);
    },
    setDown(down: boolean) {
      isDown = down;
    },
    reset() {
      calls.length = 0;
      connected.clear();
      isDown = false;
    },
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
