export function exportFilename(inviteCode: string, exportedAt: string): string {
  const stamp = exportedAt.slice(0, 10);
  return `blind-guides-${inviteCode}-${stamp}.json`;
}

export async function downloadGameExport(
  gameId: string,
  sessionToken: string,
): Promise<void> {
  const res = await fetch(
    `/api/games/${gameId}/export?sessionToken=${encodeURIComponent(sessionToken)}`,
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : "Failed to export game",
    );
  }

  const filename =
    typeof data.inviteCode === "string" && typeof data.exportedAt === "string"
      ? exportFilename(data.inviteCode, data.exportedAt)
      : "blind-guides-export.json";

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
