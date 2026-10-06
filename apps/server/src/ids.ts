import { randomBytes } from "node:crypto";

export function newId(): string {
  return crypto.randomUUID();
}

export function newInviteCode(): string {
  return randomBytes(4).toString("hex").toUpperCase();
}
