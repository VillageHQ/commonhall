// The upload check: plain patterns for the secrets people paste by mistake. It looks for well-known key formats, private
// key blocks, and `.env`-style lines that give a secret-looking name a value. It never calls anything; a hit refuses the
// upload, naming the file and the line.

export type SecretFinding = { file: string; line: number; what: string };

type TokenPattern = { what: string; pattern: RegExp };

const TOKEN_PATTERNS: readonly TokenPattern[] = [
  { what: "a private key", pattern: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----/ },
  { what: "an AWS access key", pattern: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/ },
  { what: "a GitHub token", pattern: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{22,})\b/ },
  { what: "a Slack token", pattern: /\bxox[abposr]-[A-Za-z0-9-]{10,}/ },
  { what: "a Slack webhook", pattern: /https:\/\/hooks\.slack\.com\/services\/T[A-Za-z0-9]+\/B[A-Za-z0-9]+\/[A-Za-z0-9]{12,}/ },
  { what: "a Stripe key", pattern: /\b(?:sk|rk)_live_[A-Za-z0-9]{16,}\b/ },
  { what: "an AI provider key", pattern: /\bsk-(?:ant-|proj-|svcacct-|admin-)?[A-Za-z0-9_-]{20,}/ },
  { what: "a Google API key", pattern: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { what: "a SendGrid key", pattern: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}/ },
  { what: "a Twilio key", pattern: /\bSK[0-9a-f]{32}\b/ },
  { what: "a password in a link", pattern: /\b[a-z][a-z0-9+.-]*:\/\/[^\s:/@]+:[^\s:/@]{6,}@[^\s/]+/i },
];

// A name that says "this is a secret", as an env var or a config key: OPENAI_API_KEY, db_password, "clientSecret".
const SECRET_NAME = /(?:api[_-]?key|secret|token|passw(?:or)?d|pwd|private[_-]?key|credentials?|auth[_-]?key|access[_-]?key)/i;
// NAME=value, NAME: value, export NAME="value", "name": "value".
const ASSIGNMENT = /^\s*(?:export\s+)?["']?([A-Za-z_][A-Za-z0-9_.-]*)["']?\s*[=:]\s*["']?([^"'\s#,;]+)/;
const ENV_FILE = /(?:^|\/)\.env(?:\.[A-Za-z0-9_-]+)?$|\.env$/i;
// A template next to the real file only names the settings, so it gets the ordinary rules.
const ENV_TEMPLATE = /\.env\.(?:example|sample|template|dist)$/i;
const MINIMUM_VALUE_LENGTH = 8;

// Words and shapes that mean "fill this in", not a real secret.
const PLACEHOLDER = /(?:your|example|placeholder|changeme|change_me|replace|dummy|sample|redacted|password|secret|xxxx|\*\*\*|\.\.\.|<|>|\$\{|\{\{|process\.env|os\.environ|getenv|env\()/i;
const PLAIN_VALUE = /^(?:none|null|nil|undefined|true|false|yes|no|on|off|todo)$/i;

function isPlaceholder(value: string) {
  if (PLACEHOLDER.test(value) || PLAIN_VALUE.test(value)) return true;
  // One character over and over (sk-aaaaaaaa…), or too few distinct characters to be random.
  return new Set(value.toLowerCase()).size < 5;
}

function findToken(line: string) {
  for (const { what, pattern } of TOKEN_PATTERNS) {
    const match = pattern.exec(line);
    if (match && (what === "a private key" || !isPlaceholder(match[0]))) return what;
  }
  return null;
}

function findAssignment(line: string, isEnvFile: boolean) {
  const match = ASSIGNMENT.exec(line);
  if (!match) return null;
  const [, name = "", value = ""] = match;
  if (isEnvFile) {
    // In a .env file every line with a value counts, as the file's whole job is to hold settings.
    return value && !isPlaceholder(value) ? "a .env line with a value" : null;
  }
  if (!SECRET_NAME.test(name) || value.length < MINIMUM_VALUE_LENGTH || isPlaceholder(value)) return null;
  return "a secret setting with a value";
}

export function scanTextForSecrets(file: string, text: string): SecretFinding | null {
  const isEnvFile = ENV_FILE.test(file) && !ENV_TEMPLATE.test(file);
  const lines = text.split(/\r\n|\r|\n/);
  for (const [index, line] of lines.entries()) {
    const what = findToken(line) ?? findAssignment(line, isEnvFile);
    if (what) return { file, line: index + 1, what };
  }
  return null;
}

export function describeSecretFinding({ file, line, what }: SecretFinding) {
  return `“${file}” line ${line} looks like ${what}. Take it out and upload again. Nothing was saved.`;
}
