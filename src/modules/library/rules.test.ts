import { deflateRawSync } from "node:zlib";

import { describe, expect, it } from "vitest";

import { LIBRARY_ERROR_CODES, LIBRARY_LIMITS } from "./contract";
import { scanTextForSecrets } from "./rules-secrets";
import { checkUploads } from "./rules-uploads";

// A minimal zip writer for the tests: stored or deflated entries, CRCs left at zero (the reader doesn't check them).
function makeZip(entries: { name: string; text: string }[], deflate = true) {
  const locals: Buffer[] = [];
  const directory: Buffer[] = [];
  let offset = 0;
  for (const { name, text } of entries) {
    const raw = Buffer.from(text, "utf8");
    const data = deflate ? deflateRawSync(raw) : raw;
    const nameBytes = Buffer.from(name, "utf8");
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(deflate ? 8 : 0, 8);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(raw.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(deflate ? 8 : 0, 10);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(raw.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, data);
    directory.push(central, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const directoryBytes = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directoryBytes.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directoryBytes, end]);
}

// Made-up keys in the shapes the scan knows; none is real. Built from parts so this file isn't a hit itself.
const FAKE = {
  aws: ["AKIA", "Z7Q2M4N8P1R5T3V6"].join(""),
  github: ["ghp_", "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6q7R8"].join(""),
  ai: ["sk-", "ant-", "api03-Zq8Lm2Nx7Vb4Kc9Rt6Wp3Yh"].join(""),
  stripe: ["sk_", "live_", "51HqT9gL2mKx8VbN4cR7"].join(""),
  google: ["AIza", "SyD8f7G6h5J4k3L2m1N0b9V8c7X6z5Q4w3E"].join(""),
  privateKey: ["-----BEGIN ", "RSA PRIVATE KEY-----"].join(""),
};

describe("the secret scan", () => {
  it.each([
    ["an AWS access key", `aws_access = ${FAKE.aws}`],
    ["a GitHub token", `token: ${FAKE.github}`],
    ["an AI provider key", `const client = new Client({ apiKey: "${FAKE.ai}" })`],
    ["a Stripe key", `STRIPE=${FAKE.stripe}`],
    ["a Google API key", `key=${FAKE.google}`],
    ["a private key", FAKE.privateKey],
    ["a password in a link", "DATABASE=postgres://app:Qz8vN2mK4t@db.internal:5432/app"],
    ["a secret setting with a value", 'OPENAI_API_KEY="q8Zt2Vm5Nx7Lb4Kc"'],
  ])("finds %s and names the line", (what, line) => {
    const finding = scanTextForSecrets("notes.md", `# Setup\n\n${line}\n`);
    expect(finding).toEqual({ file: "notes.md", line: 3, what });
  });

  it("counts every .env line with a value", () => {
    expect(scanTextForSecrets(".env", "# local\nREGION=eu-west-2\n")).toEqual({ file: ".env", line: 2, what: "a .env line with a value" });
    expect(scanTextForSecrets("tools/.env.local", "DEBUG=true\nPORT=3000\n")).toBeNull();
  });

  it.each([
    ["placeholders", 'OPENAI_API_KEY="your-key-here"\napi_key: <paste it>\nTOKEN=${TOKEN}\nSECRET=xxxxxxxxxxxx'],
    ["keys read from the environment", 'const key = process.env.OPENAI_API_KEY;\napi_key = os.environ["API_KEY"]'],
    ["a template next to a .env file", "OPENAI_API_KEY=\nREGION=eu-west-2"],
    ["a made-up key of one letter", "sk-aaaaaaaaaaaaaaaaaaaaaaaaaaaa"],
    ["prose about keys", "Create an API key in the dashboard and keep it in your own settings."],
  ])("passes %s", (_case, text) => {
    expect(scanTextForSecrets(_case === "a template next to a .env file" ? ".env.example" : "README.md", text)).toBeNull();
  });
});

describe("checking an upload", () => {
  it("refuses a file with a secret, naming the file and the line", () => {
    const problem = checkUploads([{ name: "agent.yaml", bytes: Buffer.from(`name: x\nopenai_api_key: ${FAKE.ai}\n`) }]);
    expect(problem?.code).toBe(LIBRARY_ERROR_CODES.secret);
    expect(problem?.message).toContain("“agent.yaml” line 2");
  });

  it("looks inside a zip, deflated or stored", () => {
    for (const deflate of [true, false]) {
      const zip = makeZip([{ name: "skill/README.md", text: "# Skill\n" }, { name: "skill/.env", text: `\nGITHUB=${FAKE.github}\n` }], deflate);
      const problem = checkUploads([{ name: "skill.zip", bytes: zip }]);
      expect(problem?.message).toContain("“skill.zip/skill/.env” line 2");
    }
    expect(checkUploads([{ name: "clean.zip", bytes: makeZip([{ name: "a.md", text: "fine" }]) }])).toBeNull();
  });

  it("refuses a broken zip, a wrong type and anything over 10 MB", () => {
    expect(checkUploads([{ name: "x.zip", bytes: Buffer.from("not a zip at all, sorry") }])?.code).toBe(LIBRARY_ERROR_CODES.wrongType);
    expect(checkUploads([{ name: "run.exe", bytes: Buffer.from("MZ") }])?.code).toBe(LIBRARY_ERROR_CODES.wrongType);
    expect(checkUploads([{ name: "big.txt", bytes: Buffer.alloc(LIBRARY_LIMITS.maximumBytes + 1, 97) }])?.code).toBe(LIBRARY_ERROR_CODES.tooLarge);
    const half = Buffer.alloc(LIBRARY_LIMITS.maximumBytes / 2 + 1, 97);
    expect(checkUploads([{ name: "a.txt", bytes: half }, { name: "b.txt", bytes: half }])?.code).toBe(LIBRARY_ERROR_CODES.tooLarge);
    expect(checkUploads([{ name: "prompt.md", bytes: Buffer.from("# A prompt") }, { name: "tool.ts", bytes: Buffer.from("export {}") }])).toBeNull();
  });
});
