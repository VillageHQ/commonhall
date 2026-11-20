import { LIBRARY_KINDS, LIBRARY_LIMITS, parseLibraryLink, readFileExtension, type LibraryKind } from "./contract.ts";
import { scanTextForSecrets, type SecretFinding } from "./rules-secrets.ts";

// The share form's defaults (round 7): one box takes a paste, a link or a file; the kind is guessed from it and shown
// for a one-tap fix; the one-line pitch comes from the paste when left empty. Pure, so the form and the server agree.

// What the one box holds: a single link becomes the item's link; anything else is the item's text.
export function splitShareBox(box: string): { text: string; link: string } {
  const trimmed = box.trim();
  return parseLibraryLink(trimmed) ? { text: "", link: trimmed } : { text: box, link: "" };
}

type KindClue = { kind: LibraryKind; words: RegExp };

// Words in the title or the paste that name a kind outright. The first that matches wins.
const KIND_WORDS: readonly KindClue[] = [
  { kind: LIBRARY_KINDS.toolConnection, words: /\b(?:mcp|connector|tool connection|integration)\b/i },
  { kind: LIBRARY_KINDS.agent, words: /\b(?:agents?|subagents?)\b/i },
  { kind: LIBRARY_KINDS.skill, words: /\b(?:skills?|skill\.md)\b/i },
  { kind: LIBRARY_KINDS.automation, words: /\b(?:automations?|zapier|n8n|make\.com|workflows?|cron)\b/i },
  { kind: LIBRARY_KINDS.playbook, words: /\b(?:playbooks?|checklists?|runbooks?|how we)\b/i },
  { kind: LIBRARY_KINDS.prompt, words: /\b(?:prompts?|system message)\b/i },
];

function guessFromFiles(fileNames: readonly string[]): LibraryKind | null {
  if (fileNames.length === 0) return null;
  const names = fileNames.map((name) => name.toLowerCase());
  if (names.some((name) => /(?:^|\/)skill\.md$/.test(name))) return LIBRARY_KINDS.skill;
  if (names.some((name) => /agent/.test(name))) return LIBRARY_KINDS.agent;
  const extensions = new Set(names.map((name) => readFileExtension(name)));
  if (extensions.has("zip")) return LIBRARY_KINDS.skill;
  if (extensions.has("py") || extensions.has("js") || extensions.has("ts")) return LIBRARY_KINDS.automation;
  if (extensions.has("json") || extensions.has("yaml") || extensions.has("yml")) return LIBRARY_KINDS.toolConnection;
  return null;
}

// The kind a member most likely means: the words they used first, then the files they attached, then what the box
// holds (a paste is a prompt, a lone link a tool connection). A prompt when nothing says otherwise.
export function guessLibraryKind({ title, text, link, fileNames }: { title: string; text: string; link: string; fileNames: readonly string[] }): LibraryKind {
  const said = KIND_WORDS.find(({ words }) => words.test(title)) ?? null;
  if (said) return said.kind;
  const fromFiles = guessFromFiles(fileNames);
  if (fromFiles) return fromFiles;
  if (!text.trim() && link.trim()) return LIBRARY_KINDS.toolConnection;
  const inText = KIND_WORDS.find(({ words }) => words.test(text.slice(0, 400))) ?? null;
  return inText?.kind ?? LIBRARY_KINDS.prompt;
}

function cutToPitch(line: string) {
  const plain = line.replace(/\s+/g, " ").trim();
  return plain.length <= LIBRARY_LIMITS.pitchLength ? plain : `${plain.slice(0, LIBRARY_LIMITS.pitchLength - 1).trimEnd()}…`;
}

// The card's one line when the member left it empty: the paste's first line with words in it (a heading's # and a
// list's dash taken off), else the link without https://, else the files' names, else the title.
export function derivePitch({ title, text, link, fileNames }: { title: string; text: string | null; link: string | null; fileNames: readonly string[] }) {
  for (const line of (text ?? "").split(/\r\n|\r|\n/)) {
    const words = line.replace(/^\s*(?:#+|[-*>]|\d+[.)])\s*/, "").trim();
    if (/[\p{L}\p{N}]/u.test(words)) return cutToPitch(words);
  }
  if (link) return cutToPitch(link.replace(/^https?:\/\//, "").replace(/\/$/, ""));
  if (fileNames.length > 0) return cutToPitch(fileNames.join(", "));
  return cutToPitch(title);
}

type PastedPart = { label: string; text: string | null };

// The secret scan for typed and pasted words, the same patterns as for files: a hit names the part and the line.
export function scanPastedText(parts: readonly PastedPart[]): SecretFinding | null {
  for (const { label, text } of parts) {
    if (!text) continue;
    const finding = scanTextForSecrets(label, text);
    if (finding) return finding;
  }
  return null;
}

export function describePastedSecret({ file, line, what }: SecretFinding) {
  return `${file}, line ${line}, looks like ${what}. Take it out and share again. Nothing was saved.`;
}
