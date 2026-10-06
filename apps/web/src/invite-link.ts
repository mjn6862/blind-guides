export function buildInviteUrl(inviteCode: string): string {
  const url = new URL(window.location.href);
  url.search = "";
  url.hash = "";
  url.searchParams.set("invite", inviteCode);
  return url.toString();
}

export function buildInviteClipboardText(inviteCode: string): string {
  const link = buildInviteUrl(inviteCode);
  return `Join my Blind Guides game.\n${link}\n\nInvite code: ${inviteCode}`;
}

export function readInviteCodeFromUrl(): string | null {
  const code = new URLSearchParams(window.location.search).get("invite");
  return code?.trim() ? code.trim().toUpperCase() : null;
}
