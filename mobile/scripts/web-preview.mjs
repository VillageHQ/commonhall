// The phone app in a browser, for checking it without a phone: serves the app's web build and a running portal on
// one address, so the app reaches into the portal page as the phone's web view does, and stands in for Expo's push
// service so an alert the portal sends comes back to the app. Development only; never point it at a live server.
//
//   EXPO_BASE_URL=/__app EXPO_PUBLIC_PREVIEW_PUSH_TOKEN="ExponentPushToken[webpreview0001]" npx expo export --platform web --output-dir dist-web
//   PORTAL=http://localhost:9715 PORT=9716 node scripts/web-preview.mjs
//   The portal runs with APP_URL=http://localhost:9716 and EXPO_PUSH_URL=http://localhost:9716/__preview/expo-push,
//   and (to read sign-in codes) RESEND_API_URL=http://localhost:9716/__preview/resend with any RESEND_API_KEY:
//   emails stop here and show at /__preview/mailbox. Made-up people only.
//   Open http://localhost:9716/__app/ and join the community "http://localhost:9716".

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer, request as httpRequest } from "node:http";
import { connect } from "node:net";
import { extname, join, normalize, resolve } from "node:path";

const PORTAL = new URL(process.env.PORTAL ?? "http://localhost:9715");
const PORT = Number(process.env.PORT ?? 9716);
const APP_DIR = resolve(process.env.APP_DIR ?? join(import.meta.dirname, "..", "dist-web"));
const APP_PATH = "/__app";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".ico": "image/x-icon", ".ttf": "font/ttf", ".svg": "image/svg+xml" };

const listeners = new Set();
const received = [];
const mailbox = [];

async function readBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

// Resend's send API, answered here: the email is kept for /__preview/mailbox and goes nowhere.
async function receiveEmail(request, response) {
  try {
    const email = JSON.parse(await readBody(request));
    mailbox.unshift({ at: new Date().toISOString(), to: email.to, subject: email.subject, text: email.text });
  } catch {}
  response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ id: crypto.randomUUID() }));
}

function showMailbox(response) {
  const escape = (value) => String(value ?? "").replace(/[&<>]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[character]);
  const items = mailbox.map((email) => `<article><h2>${escape(email.subject)}</h2><p>To ${escape([email.to].flat().join(", "))} · ${escape(email.at)}</p><pre>${escape(email.text)}</pre></article>`).join("");
  response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" });
  response.end(`<!doctype html><meta charset="utf-8"><title>Preview mailbox</title><style>body{font:15px system-ui;margin:24px;max-width:720px}pre{white-space:pre-wrap;background:#f4f2ec;padding:12px}</style><h1>Preview mailbox</h1>${items || "<p>No email yet.</p>"}`);
}

function serveApp(request, response) {
  const relative = decodeURIComponent(new URL(request.url, "http://x").pathname.slice(APP_PATH.length)) || "/";
  let file = normalize(join(APP_DIR, relative));
  if (!file.startsWith(APP_DIR)) return void response.writeHead(403).end();
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(APP_DIR, "index.html");
  response.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
  createReadStream(file).pipe(response);
}

// Expo's push API, answered here: every message is kept and sent on to the app as a banner.
async function receivePush(request, response) {
  let messages = [];
  try {
    const parsed = JSON.parse(await readBody(request));
    messages = Array.isArray(parsed) ? parsed : [parsed];
  } catch {}
  for (const message of messages) {
    received.push({ at: new Date().toISOString(), ...message });
    const event = `data: ${JSON.stringify({ title: message.title ?? "", body: message.body ?? "", data: message.data ?? {} })}\n\n`;
    for (const listener of listeners) listener.write(event);
  }
  response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ data: messages.map(() => ({ status: "ok", id: crypto.randomUUID() })) }));
}

function streamPushes(request, response) {
  response.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
  response.write(": connected\n\n");
  listeners.add(response);
  request.on("close", () => listeners.delete(response));
}

// The portal refuses to be framed (X-Frame-Options, frame-ancestors). Only here, on this computer, it may be framed
// by its own address, as the phone's web view shows it.
function allowSameOriginFrame(headers) {
  delete headers["x-frame-options"];
  const policy = headers["content-security-policy"];
  if (typeof policy === "string") headers["content-security-policy"] = policy.replace(/frame-ancestors [^;]+/, "frame-ancestors 'self'");
  return headers;
}

function proxy(request, response) {
  const upstream = httpRequest(
    { host: PORTAL.hostname, port: PORTAL.port, method: request.method, path: request.url, headers: { ...request.headers, host: `localhost:${PORT}` } },
    (answer) => {
      response.writeHead(answer.statusCode ?? 502, allowSameOriginFrame({ ...answer.headers }));
      answer.pipe(response);
    },
  );
  upstream.on("error", () => {
    if (!response.headersSent) response.writeHead(502, { "Content-Type": "text/plain" });
    response.end("The portal isn't running.");
  });
  request.pipe(upstream);
}

const server = createServer((request, response) => {
  const path = new URL(request.url, "http://x").pathname;
  if (path === APP_PATH || path.startsWith(`${APP_PATH}/`)) return serveApp(request, response);
  if (path === "/__preview/expo-push" && request.method === "POST") return void receivePush(request, response);
  if (path === "/__preview/push-events") return streamPushes(request, response);
  if (path === "/__preview/resend/emails" && request.method === "POST") return void receiveEmail(request, response);
  if (path === "/__preview/mailbox.json") return void response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(mailbox, null, 2));
  if (path === "/__preview/mailbox") return showMailbox(response);
  if (path === "/__preview/pushes") return void response.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(received, null, 2));
  return proxy(request, response);
});

// Next's dev server reloads over a websocket; pass it through.
server.on("upgrade", (request, socket, head) => {
  const upstream = connect(Number(PORTAL.port), PORTAL.hostname, () => {
    upstream.write(`${request.method} ${request.url} HTTP/1.1\r\n${Object.entries(request.headers).map(([key, value]) => `${key}: ${value}`).join("\r\n")}\r\n\r\n`);
    upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on("error", () => socket.destroy());
  socket.on("error", () => upstream.destroy());
});

server.listen(PORT, "127.0.0.1", () => console.log(`Phone app preview: http://localhost:${PORT}${APP_PATH}/  (portal ${PORTAL.origin})`));
