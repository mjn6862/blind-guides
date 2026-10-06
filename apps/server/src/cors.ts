const LOCAL_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"];

/** Hostnames used by common tunnel providers (https origins only). */
const TUNNEL_HOST_PATTERNS = [
  /\.ngrok-free\.app$/i,
  /\.ngrok\.io$/i,
  /\.trycloudflare\.com$/i,
  /\.cloudflare\.com$/i,
];

function extraOriginsFromEnv(): string[] {
  const raw = process.env.CORS_ORIGINS;
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function isTunnelOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== "http:" && protocol !== "https:") return false;
    return TUNNEL_HOST_PATTERNS.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

function tunnelsAllowed(): boolean {
  if (process.env.CORS_ALLOW_TUNNELS === "true") return true;
  if (process.env.CORS_ALLOW_TUNNELS === "false") return false;
  return process.env.NODE_ENV !== "production";
}

export function resolveCorsOrigin(origin: string | undefined): string | null {
  const allowed = new Set([...LOCAL_ORIGINS, ...extraOriginsFromEnv()]);

  if (!origin) {
    return LOCAL_ORIGINS[0] ?? null;
  }

  if (allowed.has(origin)) {
    return origin;
  }

  if (tunnelsAllowed() && isTunnelOrigin(origin)) {
    return origin;
  }

  return null;
}
