import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest();
}

/** Returns true when HOST_PASSWORD is not configured (local dev). */
export function isHostPasswordRequired(): boolean {
  return Boolean(process.env.HOST_PASSWORD?.trim());
}

export function verifyHostPassword(provided: string | undefined): boolean {
  const expected = process.env.HOST_PASSWORD?.trim();
  if (!expected) {
    return true;
  }
  if (!provided?.trim()) {
    return false;
  }
  const a = digest(provided.trim());
  const b = digest(expected);
  return timingSafeEqual(a, b);
}
