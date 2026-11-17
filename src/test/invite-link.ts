// The token in an invite link (Commonhall's /invite?token=…).
export function readInviteToken(link: string | undefined): string {
  if (!link) return "";
  return new URL(link).searchParams.get("token") ?? "";
}
