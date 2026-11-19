import { inflateRawSync } from "node:zlib";

// Reads the files inside a zip, so the secret check can look inside it too. Only what a zip from any common tool uses:
// stored or deflated entries, no encryption. Anything else is refused, because what can't be checked isn't stored.

export type ZipEntry = { name: string; bytes: Buffer };
export type ZipReading = { entries: ZipEntry[] } | { problem: string };

const END_OF_DIRECTORY = 0x06054b50;
const DIRECTORY_ENTRY = 0x02014b50;
const LOCAL_HEADER = 0x04034b50;
const END_RECORD_BYTES = 22;
const MAXIMUM_COMMENT_BYTES = 0xffff;
const STORED = 0;
const DEFLATED = 8;
const ENCRYPTED_FLAG = 0x1;
// Unpacked, a zip may hold at most this much in all, so a small zip can't unfold into gigabytes.
export const MAXIMUM_UNPACKED_BYTES = 50 * 1024 * 1024;
const MAXIMUM_ENTRIES = 2000;

const BROKEN = "can’t be opened as a zip";

function findEndOfDirectory(zip: Buffer) {
  const earliest = Math.max(0, zip.length - END_RECORD_BYTES - MAXIMUM_COMMENT_BYTES);
  for (let offset = zip.length - END_RECORD_BYTES; offset >= earliest; offset -= 1) {
    if (zip.readUInt32LE(offset) === END_OF_DIRECTORY) return offset;
  }
  return -1;
}

export function readZip(zip: Buffer): ZipReading {
  if (zip.length < END_RECORD_BYTES) return { problem: BROKEN };
  const end = findEndOfDirectory(zip);
  if (end < 0) return { problem: BROKEN };
  const count = zip.readUInt16LE(end + 10);
  let offset = zip.readUInt32LE(end + 16);
  if (count > MAXIMUM_ENTRIES) return { problem: "holds too many files to check" };
  const entries: ZipEntry[] = [];
  let unpacked = 0;
  try {
    for (let index = 0; index < count; index += 1) {
      if (zip.readUInt32LE(offset) !== DIRECTORY_ENTRY) return { problem: BROKEN };
      const flags = zip.readUInt16LE(offset + 8);
      const method = zip.readUInt16LE(offset + 10);
      const compressedSize = zip.readUInt32LE(offset + 20);
      const size = zip.readUInt32LE(offset + 24);
      const nameLength = zip.readUInt16LE(offset + 28);
      const extraLength = zip.readUInt16LE(offset + 30);
      const commentLength = zip.readUInt16LE(offset + 32);
      const localOffset = zip.readUInt32LE(offset + 42);
      const name = zip.subarray(offset + 46, offset + 46 + nameLength).toString("utf8");
      offset += 46 + nameLength + extraLength + commentLength;
      if (name.endsWith("/")) continue;
      if (flags & ENCRYPTED_FLAG) return { problem: "is locked with a password, so it can’t be checked" };
      if (method !== STORED && method !== DEFLATED) return { problem: "uses a kind of packing that can’t be checked" };
      unpacked += size;
      if (unpacked > MAXIMUM_UNPACKED_BYTES) return { problem: "is too large once unpacked to check" };
      if (zip.readUInt32LE(localOffset) !== LOCAL_HEADER) return { problem: BROKEN };
      const dataStart = localOffset + 30 + zip.readUInt16LE(localOffset + 26) + zip.readUInt16LE(localOffset + 28);
      const data = zip.subarray(dataStart, dataStart + compressedSize);
      const bytes = method === STORED ? Buffer.from(data) : inflateRawSync(data, { maxOutputLength: Math.max(size, 1) });
      entries.push({ name, bytes });
    }
  } catch {
    return { problem: BROKEN };
  }
  return { entries };
}
