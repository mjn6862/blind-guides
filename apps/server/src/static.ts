import path from "node:path";
import { fileURLToPath } from "node:url";
import { serveStatic } from "@hono/node-server/serve-static";
import type { Hono } from "hono";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

export function resolveStaticRoot(): string {
  if (process.env.STATIC_DIR?.trim()) {
    return path.resolve(process.env.STATIC_DIR.trim());
  }
  return path.resolve(moduleDir, "../../web/dist");
}

export function shouldServeStatic(): boolean {
  if (process.env.SERVE_STATIC === "true") return true;
  if (process.env.SERVE_STATIC === "false") return false;
  return process.env.NODE_ENV === "production";
}

export function mountStaticApp(app: Hono): void {
  const root = resolveStaticRoot();
  app.use("/*", serveStatic({ root }));
  app.get("*", serveStatic({ root, path: "index.html" }));
}
