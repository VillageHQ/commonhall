// Adds a fixed delay before each request reaches the local copy (a phone's round trip to a far server).
import { createServer, request as httpRequest } from "node:http";
const TARGET = Number(process.env.TARGET ?? 9563);
const PORT = Number(process.env.PORT ?? 9564);
const DELAY = Number(process.env.DELAY ?? 150);
createServer((request, response) => {
  setTimeout(() => {
    const headers = { ...request.headers, host: `localhost:${TARGET}` };
    if (headers.origin) headers.origin = `http://localhost:${TARGET}`;
    if (headers.referer) headers.referer = headers.referer.replace(`:${PORT}`, `:${TARGET}`);
    const upstream = httpRequest({ host: "127.0.0.1", port: TARGET, method: request.method, path: request.url, headers }, (answer) => {
      const out = { ...answer.headers };
      if (out.location) out.location = String(out.location).replace(`:${TARGET}`, `:${PORT}`);
      response.writeHead(answer.statusCode ?? 502, out);
      answer.pipe(response);
    });
    upstream.on("error", () => response.writeHead(502).end());
    request.pipe(upstream);
  }, DELAY);
}).listen(PORT, "127.0.0.1", () => console.log(`slow proxy :${PORT} -> :${TARGET} (+${DELAY} ms)`));
