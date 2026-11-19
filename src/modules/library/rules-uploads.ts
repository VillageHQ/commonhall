import { LIBRARY_ERROR_CODES, LIBRARY_LIMITS, LIBRARY_TOO_LARGE_MESSAGE, LIBRARY_WRONG_TYPE_MESSAGE, readFileExtension, type LibraryUpload } from "./contract.ts";
import { describeSecretFinding, scanTextForSecrets } from "./rules-secrets.ts";
import { readZip } from "./rules-zip.ts";

// Every check an upload passes before anything is stored: the type, the size, and the secret scan (inside zips too).

export type UploadProblem = { code: string; message: string };

const BINARY_SAMPLE_BYTES = 8000;

function looksBinary(bytes: Buffer) {
  return bytes.subarray(0, BINARY_SAMPLE_BYTES).includes(0);
}

function scanFile(name: string, bytes: Buffer): UploadProblem | null {
  const finding = looksBinary(bytes) ? null : scanTextForSecrets(name, bytes.toString("utf8"));
  return finding ? { code: LIBRARY_ERROR_CODES.secret, message: describeSecretFinding(finding) } : null;
}

export function checkUploads(files: readonly LibraryUpload[]): UploadProblem | null {
  if (files.length > LIBRARY_LIMITS.filesPerVersion) {
    return { code: LIBRARY_ERROR_CODES.tooLarge, message: `Share at most ${LIBRARY_LIMITS.filesPerVersion} files at once. A zip can hold more.` };
  }
  let total = 0;
  for (const { name, bytes } of files) {
    if (!readFileExtension(name)) return { code: LIBRARY_ERROR_CODES.wrongType, message: `“${name}”: ${LIBRARY_WRONG_TYPE_MESSAGE}` };
    if (name.length > LIBRARY_LIMITS.fileNameLength) return { code: LIBRARY_ERROR_CODES.wrongType, message: `“${name.slice(0, 40)}…” has too long a name.` };
    total += bytes.byteLength;
    if (bytes.byteLength > LIBRARY_LIMITS.maximumBytes || total > LIBRARY_LIMITS.maximumBytes) {
      return { code: LIBRARY_ERROR_CODES.tooLarge, message: `“${name}” is too large. ${LIBRARY_TOO_LARGE_MESSAGE}` };
    }
  }
  for (const { name, bytes } of files) {
    if (readFileExtension(name) !== "zip") {
      const problem = scanFile(name, bytes);
      if (problem) return problem;
      continue;
    }
    const zip = readZip(bytes);
    if ("problem" in zip) return { code: LIBRARY_ERROR_CODES.wrongType, message: `“${name}” ${zip.problem}. Nothing was saved.` };
    for (const entry of zip.entries) {
      const problem = scanFile(`${name}/${entry.name}`, entry.bytes);
      if (problem) return problem;
    }
  }
  return null;
}
