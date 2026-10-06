import { createServer } from "node:http";
import { getRequestListener } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { WebSocketServer } from "ws";
import type { ClientMessage, GameRules, PlayerOrderAction } from "@blind-guides/shared";
import {
  attachSocket,
  createGame,
  detachSocket,
  exportGame,
  findRoomByToken,
  getRoom,
  getRoomByInvite,
  getHistorySnapshot,
  handleClientMessage,
  importGame,
  joinGame,
  loadRoomFromDisk,
  startGame,
  updateGameRules,
  updatePlayerOrder,
} from "./game-manager.js";
import { resolveCorsOrigin } from "./cors.js";
import { isHostPasswordRequired, verifyHostPassword } from "./host-auth.js";
import { mountStaticApp, shouldServeStatic } from "./static.js";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: (origin) => resolveCorsOrigin(origin),
  }),
);

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/config", (c) =>
  c.json({ requireHostPassword: isHostPasswordRequired() }),
);

app.post("/api/games", async (c) => {
  const body = await c.req.json<{ displayName?: string; hostPassword?: string }>();
  if (!body.displayName?.trim()) {
    return c.json({ error: "displayName is required" }, 400);
  }

  if (!verifyHostPassword(body.hostPassword)) {
    return c.json({ error: "Invalid host password" }, 403);
  }

  const { room, playerId, sessionToken } = createGame(body.displayName.trim());
  return c.json({
    gameId: room.gameId,
    inviteCode: room.inviteCode,
    playerId,
    sessionToken,
  });
});

app.post("/api/games/import", async (c) => {
  const body = await c.req.json<{
    displayName?: string;
    hostPassword?: string;
    export?: unknown;
  }>();

  if (!body.displayName?.trim()) {
    return c.json({ error: "displayName is required" }, 400);
  }
  if (body.export === undefined) {
    return c.json({ error: "export is required" }, 400);
  }

  if (!verifyHostPassword(body.hostPassword)) {
    return c.json({ error: "Invalid host password" }, 403);
  }

  const result = importGame(body.displayName.trim(), body.export);
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({
    gameId: result.room.gameId,
    inviteCode: result.room.inviteCode,
    playerId: result.playerId,
    sessionToken: result.sessionToken,
  });
});

app.get("/api/games/:gameId/export", async (c) => {
  const gameId = c.req.param("gameId");
  const room = getRoom(gameId) ?? (await loadRoomFromDisk(gameId));
  if (!room) {
    return c.json({ error: "Game not found" }, 404);
  }

  const sessionToken = c.req.query("sessionToken");
  const playerId = sessionToken
    ? room.tokenToPlayerId.get(sessionToken)
    : undefined;
  if (!playerId) {
    return c.json({ error: "Invalid session" }, 401);
  }

  const result = exportGame(room, playerId);
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  const stamp = result.export.exportedAt.slice(0, 10);
  const filename = `blind-guides-${result.export.inviteCode}-${stamp}.json`;
  return c.json(result.export, 200, {
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
});

app.post("/api/games/:gameId/join", async (c) => {
  const gameId = c.req.param("gameId");
  const room = getRoom(gameId) ?? (await loadRoomFromDisk(gameId));
  if (!room) {
    return c.json({ error: "Game not found" }, 404);
  }

  const body = await c.req.json<{ displayName?: string }>();
  if (!body.displayName?.trim()) {
    return c.json({ error: "displayName is required" }, 400);
  }

  const result = joinGame(room, body.displayName.trim());
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  return c.json(result);
});

app.post("/api/games/join-by-code", async (c) => {
  const body = await c.req.json<{ inviteCode?: string; displayName?: string }>();
  if (!body.inviteCode?.trim() || !body.displayName?.trim()) {
    return c.json({ error: "inviteCode and displayName are required" }, 400);
  }

  const room = getRoomByInvite(body.inviteCode.trim());
  if (!room) {
    return c.json({ error: "Invalid invite code" }, 404);
  }

  const result = joinGame(room, body.displayName.trim());
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({ gameId: room.gameId, ...result });
});

app.put("/api/games/:gameId/rules", async (c) => {
  const gameId = c.req.param("gameId");
  const room = getRoom(gameId) ?? (await loadRoomFromDisk(gameId));
  if (!room) {
    return c.json({ error: "Game not found" }, 404);
  }

  const body = await c.req.json<{ sessionToken?: string; rules?: GameRules }>();
  const playerId = body.sessionToken
    ? room.tokenToPlayerId.get(body.sessionToken)
    : undefined;
  if (!playerId) {
    return c.json({ error: "Invalid session" }, 401);
  }
  if (!body.rules) {
    return c.json({ error: "rules is required" }, 400);
  }

  const result = updateGameRules(room, playerId, body.rules);
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({ ok: true, rules: room.rules });
});

app.put("/api/games/:gameId/player-order", async (c) => {
  const gameId = c.req.param("gameId");
  const room = getRoom(gameId) ?? (await loadRoomFromDisk(gameId));
  if (!room) {
    return c.json({ error: "Game not found" }, 404);
  }

  const body = await c.req.json<{
    sessionToken?: string;
    action?: PlayerOrderAction;
  }>();
  const playerId = body.sessionToken
    ? room.tokenToPlayerId.get(body.sessionToken)
    : undefined;
  if (!playerId) {
    return c.json({ error: "Invalid session" }, 401);
  }
  if (!body.action) {
    return c.json({ error: "action is required" }, 400);
  }

  const result = updatePlayerOrder(room, playerId, body.action);
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({ ok: true, playerOrder: result.playerOrder });
});

app.post("/api/games/:gameId/start", async (c) => {
  const gameId = c.req.param("gameId");
  const room = getRoom(gameId) ?? (await loadRoomFromDisk(gameId));
  if (!room) {
    return c.json({ error: "Game not found" }, 404);
  }

  const body = await c.req.json<{ sessionToken?: string }>();
  const playerId = body.sessionToken
    ? room.tokenToPlayerId.get(body.sessionToken)
    : undefined;
  if (!playerId) {
    return c.json({ error: "Invalid session" }, 401);
  }

  const result = startGame(room, playerId);
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  return c.json({ ok: true });
});

app.get("/api/games/:gameId/history/:index", async (c) => {
  const gameId = c.req.param("gameId");
  const room = getRoom(gameId) ?? (await loadRoomFromDisk(gameId));
  if (!room) {
    return c.json({ error: "Game not found" }, 404);
  }

  const sessionToken = c.req.query("sessionToken");
  const playerId = sessionToken
    ? room.tokenToPlayerId.get(sessionToken)
    : undefined;
  if (!playerId) {
    return c.json({ error: "Invalid session" }, 401);
  }

  const index = Number(c.req.param("index"));
  const result = getHistorySnapshot(room, index);
  if ("error" in result) {
    return c.json({ error: result.error }, 400);
  }

  return c.json(result);
});

app.get("/api/games/:gameId", async (c) => {
  const gameId = c.req.param("gameId");
  const room = getRoom(gameId) ?? (await loadRoomFromDisk(gameId));
  if (!room) {
    return c.json({ error: "Game not found" }, 404);
  }

  return c.json({
    gameId: room.gameId,
    inviteCode: room.inviteCode,
    status: room.status,
    players: room.players,
    rules: room.rules,
  });
});

if (shouldServeStatic()) {
  mountStaticApp(app);
}

const PORT = Number(process.env.PORT ?? 3001);

const server = createServer(getRequestListener(app.fetch));
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", async (socket, req) => {
  const url = new URL(req.url ?? "", `http://localhost:${PORT}`);
  const sessionToken = url.searchParams.get("sessionToken");

  if (!sessionToken) {
    socket.close(1008, "sessionToken required");
    return;
  }

  if (!findRoomByToken(sessionToken)) {
    const { readdir, readFile } = await import("node:fs/promises");
    const pathMod = await import("node:path");
    const dir = pathMod.join(process.cwd(), "data", "games");
    try {
      const files = await readdir(dir);
      for (const file of files) {
        if (!file.endsWith(".json")) continue;
        const raw = await readFile(pathMod.join(dir, file), "utf8");
        const data = JSON.parse(raw) as {
          gameId: string;
          sessions: Record<string, string>;
        };
        if (data.sessions[sessionToken]) {
          await loadRoomFromDisk(data.gameId);
          break;
        }
      }
    } catch {
      // no saved games yet
    }
  }

  const attached = attachSocket(sessionToken, socket);
  if ("error" in attached) {
    socket.close(1008, attached.error);
    return;
  }

  socket.on("message", (data) => {
    try {
      const message = JSON.parse(String(data)) as ClientMessage;
      void handleClientMessage(sessionToken, message);
    } catch {
      socket.send(JSON.stringify({ type: "ERROR", message: "Invalid message" }));
    }
  });

  socket.on("close", () => {
    detachSocket(sessionToken);
  });
});

server.listen(PORT, () => {
  console.log(`Blind Guides server listening on http://localhost:${PORT}`);
});
