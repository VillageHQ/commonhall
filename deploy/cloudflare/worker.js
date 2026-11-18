// The commonhall.ai Worker: serves the static landing page (`site/`) and takes the "Schedule a call" form.
// POST /api/signup checks the fields like the page does, keeps the request in D1 and emails it to the team.
// Answers 201 { ok, emailSent: false }, 400 { errors: { field: message } } for a field, or { error } for the rest
// (the contract in site/README.md).

const LIMIT_PER_HOUR = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === "/api/signup") {
      if (request.method !== "POST") return json({ ok: false }, 405, { Allow: "POST" });
      return signup(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};

async function signup(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "Send the form as JSON." }, 400);
  }
  if (!body || typeof body !== "object") return json({ ok: false, error: "Send the form as JSON." }, 400);

  // A robot filled the hidden field: answer like a success, keep nothing.
  if (text(body.website)) return json({ ok: true, emailSent: false }, 201);

  const { values, errors } = check(body);
  if (Object.keys(errors).length > 0) return json({ ok: false, errors }, 400);

  const visitor = await hash(request.headers.get("cf-connecting-ip") || "unknown");
  const since = new Date(Date.now() - 3600_000).toISOString();
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM signups WHERE visitor = ? AND created_at > ?")
    .bind(visitor, since).first();
  if (recent && recent.n >= LIMIT_PER_HOUR) {
    return json({ ok: false, error: "Too many requests from here. Try again in an hour." }, 429);
  }

  const createdAt = new Date().toISOString();
  const row = await env.DB.prepare(
    "INSERT INTO signups (created_at, name, email, community, members, plan, visitor) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
  ).bind(createdAt, values.name, values.email, values.community, values.members, values.plan, visitor).first();

  try {
    await env.EMAIL.send({
      to: env.SIGNUP_TO,
      from: { email: env.SIGNUP_FROM, name: "Commonhall website" },
      replyTo: values.email,
      subject: `Call request: ${values.community} (${values.members} members)`,
      text: [
        "A new call request came in on commonhall.ai.",
        "",
        `Name: ${values.name}`,
        `Email: ${values.email}`,
        `Fund or community: ${values.community}`,
        `Members: ${values.members}`,
        `Plan: ${values.plan}`,
        `Received: ${createdAt}`,
        "",
        "Reply to this email to answer them.",
      ].join("\n"),
    });
    await env.DB.prepare("UPDATE signups SET notified = 1 WHERE id = ?").bind(row.id).run();
  } catch (error) {
    // The request is saved either way; a failed notice stays visible as notified = 0.
    console.error("signup notice failed", row.id, error && (error.code || error.message));
  }
  return json({ ok: true, emailSent: false }, 201);
}

function check(body) {
  const errors = {};
  const name = text(body.name);
  const email = text(body.email);
  const community = text(body.community);
  const members = Number(body.members);
  if (!name || name.length > 120) errors.name = "Add your name so we know who to answer.";
  if (!community || community.length > 160) errors.community = "Add the fund or community the portal is for.";
  if (!EMAIL_PATTERN.test(email) || email.length > 254) {
    errors.email = "That doesn't look like an email address. Check for a missing @ or dot.";
  }
  if (!Number.isInteger(members) || members < 1 || members > 1000000) {
    errors.members = "Add roughly how many members, as a number.";
  }
  // The page has one plan to ask about.
  return { values: { name, email, community, members, plan: "managed" }, errors };
}

function text(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function hash(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers },
  });
}
