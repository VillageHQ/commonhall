import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";

import { ImageResponse } from "next/og";

import type { Branding } from "../branding/branding.ts";
import { IMAGE_CONTENT_TYPES } from "../image-rules.ts";

// The installed app's icon, drawn from the fund's branding: its logo on paper when it has one Satori can draw (an
// uploaded PNG or JPEG, or a logo address that is a PNG, JPEG or SVG file in public/), else its first letter on its
// brand colour. Phones mask icons to circles and squircles, so the mark keeps to
// the middle 60% (the "maskable" safe zone).

export const APP_ICON_SIZES = [192, 512] as const;
export type AppIconSize = (typeof APP_ICON_SIZES)[number];

const PAPER = "#fafaf7";
const SVG_CONTENT_TYPE = "image/svg+xml";
const DRAWABLE_LOGO_TYPES: readonly string[] = [IMAGE_CONTENT_TYPES.png, IMAGE_CONTENT_TYPES.jpeg, SVG_CONTENT_TYPE];
const PUBLIC_FILE_TYPES: Record<string, string> = { ".png": IMAGE_CONTENT_TYPES.png, ".jpg": IMAGE_CONTENT_TYPES.jpeg, ".jpeg": IMAGE_CONTENT_TYPES.jpeg, ".svg": SVG_CONTENT_TYPE };
const MAXIMUM_PUBLIC_LOGO_BYTES = 512 * 1024;
const SAFE_ZONE = 0.6;
const LETTER_SCALE = 0.42;

type Logo = { bytes: Buffer; contentType: string } | null;

// A logo address set in Set up › Settings that points at a file this server ships (like /demo/northwind-logo.svg).
// Never fetched from another site: an https address keeps the letter icon.
export async function readPublicLogo(logoUrl: string | null): Promise<Logo> {
  if (!logoUrl?.startsWith("/") || logoUrl.startsWith("//")) return null;
  const path = logoUrl.split(/[?#]/)[0] ?? "";
  const contentType = PUBLIC_FILE_TYPES[extname(path).toLowerCase()];
  const root = join(process.cwd(), "public");
  const file = normalize(join(root, path));
  if (!contentType || !file.startsWith(`${root}${sep}`)) return null;
  const bytes = await readFile(file).catch(() => null);
  return bytes && bytes.byteLength <= MAXIMUM_PUBLIC_LOGO_BYTES ? { bytes, contentType } : null;
}

export function parseIconSize(value: string | null): AppIconSize {
  const size = Number(value);
  return APP_ICON_SIZES.find((allowed) => allowed === size) ?? APP_ICON_SIZES[0];
}

export function renderAppIcon(branding: Branding, logo: Logo, size: AppIconSize) {
  const canDrawLogo = logo !== null && DRAWABLE_LOGO_TYPES.includes(logo.contentType);
  const mark = Math.round(size * SAFE_ZONE);
  const letter = (branding.name.trim()[0] ?? "C").toUpperCase();
  return new ImageResponse(
    canDrawLogo ? (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: PAPER }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- Satori draws plain img elements only. */}
        <img alt="" src={`data:${logo.contentType};base64,${logo.bytes.toString("base64")}`} width={mark} height={mark} style={{ objectFit: "contain" }} />
      </div>
    ) : (
      <div
        style={{
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: branding.accentColor,
          color: PAPER,
          fontSize: Math.round(size * LETTER_SCALE),
          fontWeight: 600,
        }}
      >
        {letter}
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
