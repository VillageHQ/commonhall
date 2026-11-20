// The words and controls table from capture.mjs's inventory.json. Run from the repo root after capture.mjs.
import { readFileSync, writeFileSync } from "node:fs";
// TABLE_DIR picks the capture folder (the re-study's is .ai/tmp/restudy); the default is the first study's.
const DIR = process.env.TABLE_DIR ?? ".ai/tmp/simplify-study";
const j = JSON.parse(readFileSync(`${DIR}/inventory.json`, "utf8"));
const P = {
  "/today": "Home: asks you could help with, intros waiting, profile check, your asks, perks, jobs, library, new members",
  "/asks": "Asks & updates board: post an ask, browse asks and updates",
  "/ask": "Post an ask (form)",
  "/search": "Search the members' networks (needs your own Village connection)",
  "/directory": "Every member, with filters",
  "/jobs": "Open jobs at portfolio companies",
  "/jobs/yours": "Redirects to My profile",
  "/intros": "Intro asks waiting for you and the ones you sent",
  "/inbox": "Private messages",
  "/rooms": "Live voice rooms: live now, coming up, start one, \"I'm available\"",
  "/perks": "Perks marketplace",
  "/library": "AI library: skills, agents, prompts shared across the portfolio",
  "/library/leaderboard": "Library leaderboard",
  "/library/new": "Share a library item (form)",
  "/me": "My profile: card, privacy, booking link, my network, links to email/alerts/data",
  "/me/alerts": "Alerts: device, kinds, quiet hours, muted members",
  "/me/data": "Your data: what the app holds, export, delete",
  "/me/email": "Email settings",
  "/me/network": "Connect your own network (Village)",
  "/feed": "Community feed (posts, replies, reactions)",
  "/welcome": "Redirects to Today (onboarding done)",
  "/start": "Redirects to Today",
  "/search/ask": "Redirects to Search",
  "/admin": "Console home: what needs you",
  "/admin/report": "Partner report",
  "/admin/intros": "Intro log",
  "/admin/members": "Members list",
  "/admin/invites": "Invites",
  "/admin/asks": "Asks moderation and digest",
  "/admin/digest": "Weekly email preview",
  "/admin/announcements": "Announcements",
  "/admin/jobs": "Job board set up",
  "/admin/settings": "Settings: branding (+ Advanced)",
  "/admin/setup": "Setup checklist",
  "/admin/start": "Guided first run",
  "/admin/features": "Switch features on and off",
  "/admin/rooms": "Rooms set up (LiveKit)",
  "/admin/perks": "Perks set up",
  "/admin/calls": "Calls booked with mentors",
  "/admin/weekly-email": "Redirects to the weekly email preview",
  "/admin/mail": "Mail sending log",
  "/admin/health": "Redirects to Partner report",
  "/admin/audit": "Audit log",
  "/admin/import": "Import members",
  "/admin/links": "Links",
  "/admin/reports": "Reported asks",
  "/admin/village": "Village connection",
};
const purpose = (r) => P[r] ?? (r.startsWith("/asks/") ? "One ask" : r.startsWith("/intros/new") ? "Ask for an intro (form)" : r.startsWith("/intros/") ? "One intro ask" : r.startsWith("/inbox/") ? "One conversation" : r.startsWith("/people/") ? "A member's profile" : r.startsWith("/library/") ? "One library item" : r.startsWith("/messages/new") ? "Write a message (form)" : r.includes("(joined)") ? "Inside a live room after Join" : r.startsWith("/rooms/") ? "One room" : r.startsWith("/admin/members/") ? "One member (admin)" : "");
const short = (r) => r.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/g, "[id]").replace(/\?.*$/, "");
const lines = ["| Screen | Role | Words (phone / desktop) | Controls (phone / desktop) | Purpose |", "|---|---|---|---|---|"];
let seen = new Set();
for (const r of [...j.member, ...j.admin]) {
  const s = short(r.route);
  const redirected = r.desktop && r.desktop.finalPath !== r.route.replace(/\?.*$/, "") && !r.route.includes("[");
  if (r.desktop && (r.desktop.status === 404)) continue; // reached later with a target
  if (redirected && !/^\/[a-z-]+\/[0-9a-f]{8}/.test(r.route)) { lines.push(`| \`${s}\` | ${r.role} | – | – | ${purpose(r.route)} |`); continue; }
  if (seen.has(s + r.role)) continue; seen.add(s + r.role);
  const w = r.desktop ? `${r.phone.words} / ${r.desktop.words}` : `${r.phone.words} / –`;
  const c = r.desktop ? `${r.phone.controls} / ${r.desktop.controls}` : `${r.phone.controls} / –`;
  lines.push(`| \`${s}\` | ${r.role} | ${w} | ${c} | ${purpose(r.route)} |`);
}
for (const r of j.pub) lines.push(`| \`${r.route}\` | signed out | ${r.phone.words} / – | ${r.phone.controls} / – | ${r.route === "/signin" ? "Sign in" : "Public job board"} |`);
writeFileSync(`${DIR}/table.md`, lines.join("\n") + "\n");
const real = [...j.member, ...j.admin].filter((r) => r.desktop && r.desktop.status === 200 && r.desktop.finalPath === r.route.replace(/\?.*$/, ""));
const sum = (role) => { const rs = real.filter((r) => r.role === role); return { screens: rs.length, words: rs.reduce((a, r) => a + r.desktop.words, 0), controls: rs.reduce((a, r) => a + r.desktop.controls, 0), median: rs.map((r) => r.desktop.words).sort((a, b) => a - b)[Math.floor(rs.length / 2)] }; };
console.log(JSON.stringify({ member: sum("member"), admin: sum("admin") }));
