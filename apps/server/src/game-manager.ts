import type { WebSocket } from "ws";
import type {
  ClientMessage,
  GameAction,
  GameRules,
  LobbyView,
  PlayerInfo,
  ServerMessage,
  TurnRecord,
} from "@blind-guides/shared";
import {
  applyPlayerOrderAction,
  buildGameExport,
  createStandardRules,
  findPlayerByDisplayName,
  orderPlayersByIds,
  syncPlayerOrder,
  validateGameExport,
  type PlayerOrderAction,
} from "@blind-guides/shared";
import type { GameExport } from "@blind-guides/shared";
import {
  applyAction,
  buildHistorySnapshot,
  buildPlayerView,
  createInitialState,
} from "@blind-guides/game-engine";
import type { GameState, TurnHistorySnapshot } from "@blind-guides/shared";
import { newId, newInviteCode } from "./ids.js";
import { loadGame, saveGame, type PersistedGame } from "./persistence.js";

type PlayerSession = {
  playerId: string;
  sessionToken: string;
  displayName: string;
  socket: WebSocket | null;
};

export type GameRoom = {
  gameId: string;
  inviteCode: string;
  hostId: string;
  status: "lobby" | "playing" | "finished";
  rules: GameRules;
  players: PlayerInfo[];
  playerOrder: string[];
  joinOrder: string[];
  sessions: Map<string, PlayerSession>;
  tokenToPlayerId: Map<string, string>;
  state: GameState | null;
  turnHistory: TurnRecord[];
  notes: Record<string, string>;
  rosterLocked: boolean;
};

const rooms = new Map<string, GameRoom>();
const roomsByInvite = new Map<string, string>();

function toPersisted(room: GameRoom): PersistedGame {
  const sessions: Record<string, string> = {};
  for (const [token, playerId] of room.tokenToPlayerId) {
    sessions[token] = playerId;
  }
  return {
    gameId: room.gameId,
    inviteCode: room.inviteCode,
    hostId: room.hostId,
    status: room.status,
    rules: room.rules,
    players: room.players,
    playerOrder: room.playerOrder,
    joinOrder: room.joinOrder,
    state: room.state ?? undefined,
    turnHistory: room.turnHistory,
    sessions,
    notes: room.notes,
    rosterLocked: room.rosterLocked,
  };
}

function viewOptions(room: GameRoom, viewerId: string) {
  return {
    gameId: room.gameId,
    inviteCode: room.inviteCode,
    viewerId,
    hostId: room.hostId,
    status: room.status,
    turnHistory: room.turnHistory,
    privateNotes: room.notes[viewerId] ?? "",
  };
}

async function persist(room: GameRoom): Promise<void> {
  await saveGame(toPersisted(room));
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function lobbyView(room: GameRoom, playerId: string): LobbyView {
  const orderedPlayers = orderPlayersByIds(room.players, room.playerOrder);
  return {
    gameId: room.gameId,
    inviteCode: room.inviteCode,
    playerId,
    isHost: playerId === room.hostId,
    status: room.status,
    players: orderedPlayers,
    playerOrder: [...room.playerOrder],
    rules: room.rules,
  };
}

export function broadcastRoom(room: GameRoom): void {
  for (const session of room.sessions.values()) {
    if (!session.socket) continue;

    if (room.status === "lobby") {
      send(session.socket, {
        type: "LOBBY",
        lobby: lobbyView(room, session.playerId),
      });
      continue;
    }

    if (!room.state) continue;

    send(session.socket, {
      type: "GAME_STATE",
      view: buildPlayerView(room.state, viewOptions(room, session.playerId)),
    });
  }
}

export function createGame(displayName: string): {
  room: GameRoom;
  playerId: string;
  sessionToken: string;
} {
  const gameId = newId();
  const inviteCode = newInviteCode();
  const playerId = newId();
  const sessionToken = newId();
  const rules = createStandardRules();

  const room: GameRoom = {
    gameId,
    inviteCode,
    hostId: playerId,
    status: "lobby",
    rules,
    players: [{ id: playerId, displayName }],
    playerOrder: [playerId],
    joinOrder: [playerId],
    sessions: new Map(),
    tokenToPlayerId: new Map([[sessionToken, playerId]]),
    state: null,
    turnHistory: [],
    notes: {},
    rosterLocked: false,
  };

  room.sessions.set(playerId, {
    playerId,
    sessionToken,
    displayName,
    socket: null,
  });

  rooms.set(gameId, room);
  roomsByInvite.set(inviteCode, gameId);
  void persist(room);

  return { room, playerId, sessionToken };
}

export function getRoom(gameId: string): GameRoom | undefined {
  return rooms.get(gameId);
}

export function getRoomByInvite(inviteCode: string): GameRoom | undefined {
  const gameId = roomsByInvite.get(inviteCode.toUpperCase());
  return gameId ? rooms.get(gameId) : undefined;
}

export function joinGame(
  room: GameRoom,
  displayName: string,
): { playerId: string; sessionToken: string } | { error: string } {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return { error: "Enter your name" };
  }

  const existing = findPlayerByDisplayName(room.players, trimmed);
  if (existing) {
    return rejoinPlayer(room, existing);
  }

  if (room.rosterLocked || room.status !== "lobby") {
    return {
      error:
        room.status === "lobby"
          ? "This game was restored from a save — rejoin with the same display name you used before."
          : "Game already started — rejoin with the same display name you used before.",
    };
  }

  if (room.players.length >= 10) {
    return { error: "Game is full (max 10 players)" };
  }

  const playerId = newId();
  const sessionToken = newId();

  room.players.push({ id: playerId, displayName: trimmed });
  const synced = syncPlayerOrder(room.players, room.playerOrder, room.joinOrder);
  room.playerOrder = synced.playerOrder;
  room.joinOrder = synced.joinOrder;
  room.sessions.set(playerId, {
    playerId,
    sessionToken,
    displayName: trimmed,
    socket: null,
  });
  room.tokenToPlayerId.set(sessionToken, playerId);
  void persist(room);
  broadcastRoom(room);

  return { playerId, sessionToken };
}

function rejoinPlayer(
  room: GameRoom,
  player: PlayerInfo,
): { playerId: string; sessionToken: string } {
  for (const [token, playerId] of [...room.tokenToPlayerId.entries()]) {
    if (playerId === player.id) {
      room.tokenToPlayerId.delete(token);
    }
  }

  const sessionToken = newId();
  room.tokenToPlayerId.set(sessionToken, player.id);
  room.sessions.set(player.id, {
    playerId: player.id,
    sessionToken,
    displayName: player.displayName,
    socket: null,
  });
  void persist(room);
  broadcastRoom(room);

  return { playerId: player.id, sessionToken };
}

export function updateGameRules(
  room: GameRoom,
  requesterId: string,
  rules: GameRules,
): { ok: true } | { error: string } {
  if (requesterId !== room.hostId) {
    return { error: "Only the host can change rules" };
  }
  if (room.status !== "lobby") {
    return { error: "Cannot change rules after the game has started" };
  }
  if (rules.colors.length === 0) {
    return { error: "At least one color is required" };
  }
  if (rules.actionsPerTurn < 1 || rules.actionsPerTurn > 5) {
    return { error: "actionsPerTurn must be between 1 and 5" };
  }
  if (rules.handSize < 1 || rules.handSize > 20) {
    return { error: "handSize must be between 1 and 20" };
  }

  room.rules = rules;
  void persist(room);
  broadcastRoom(room);
  return { ok: true };
}

export function updatePlayerOrder(
  room: GameRoom,
  requesterId: string,
  action: PlayerOrderAction,
): { ok: true; playerOrder: string[] } | { error: string } {
  if (requesterId !== room.hostId) {
    return { error: "Only the host can change turn order" };
  }
  if (room.status !== "lobby") {
    return { error: "Cannot change turn order after the game has started" };
  }

  try {
    room.playerOrder = applyPlayerOrderAction(
      room.players,
      room.playerOrder,
      room.joinOrder,
      action,
    );
    void persist(room);
    broadcastRoom(room);
    return { ok: true, playerOrder: [...room.playerOrder] };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Failed to update turn order",
    };
  }
}

export function exportGame(
  room: GameRoom,
  requesterId: string,
): { export: GameExport } | { error: string } {
  if (requesterId !== room.hostId) {
    return { error: "Only the host can export the game" };
  }

  const gameExport = buildGameExport({
    inviteCode: room.inviteCode,
    hostId: room.hostId,
    status: room.status,
    rules: room.rules,
    players: room.players,
    playerOrder: room.playerOrder,
    joinOrder: room.joinOrder,
    state: room.state ?? undefined,
    turnHistory: room.turnHistory,
    notes: room.notes,
  });

  return { export: gameExport };
}

export function importGame(
  displayName: string,
  rawExport: unknown,
): { room: GameRoom; playerId: string; sessionToken: string } | { error: string } {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return { error: "displayName is required" };
  }

  const validated = validateGameExport(rawExport);
  if ("error" in validated) {
    return { error: validated.error };
  }

  const data = validated.export;
  const host = data.players.find((p) => p.id === data.hostId);
  if (!host) {
    return { error: "Export host is not in the player list" };
  }

  if (host.displayName.trim().toLowerCase() !== trimmed.toLowerCase()) {
    return {
      error: "Use the host's display name from the saved game to import it",
    };
  }

  const gameId = newId();
  const inviteCode = newInviteCode();
  const sessionToken = newId();

  const room: GameRoom = {
    gameId,
    inviteCode,
    hostId: data.hostId,
    status: data.status,
    rules: data.rules,
    players: data.players.map((p) => ({ ...p })),
    playerOrder: [...data.playerOrder],
    joinOrder: [...data.joinOrder],
    sessions: new Map(),
    tokenToPlayerId: new Map([[sessionToken, data.hostId]]),
    state: data.state ? structuredClone(data.state) : null,
    turnHistory: data.turnHistory.map((record, i) => ({
      ...record,
      index: record.index ?? i,
      state: record.state ? structuredClone(record.state) : undefined,
    })),
    notes: { ...data.notes },
    rosterLocked: true,
  };

  room.sessions.set(data.hostId, {
    playerId: data.hostId,
    sessionToken,
    displayName: host.displayName,
    socket: null,
  });

  rooms.set(gameId, room);
  roomsByInvite.set(inviteCode, gameId);
  void persist(room);

  return { room, playerId: data.hostId, sessionToken };
}

export function startGame(
  room: GameRoom,
  requesterId: string,
): { ok: true } | { error: string } {
  if (requesterId !== room.hostId) {
    return { error: "Only the host can start the game" };
  }
  if (room.status !== "lobby") {
    return { error: "Game already started" };
  }
  if (room.players.length < 2) {
    return { error: "Need at least 2 players to start" };
  }

  const synced = syncPlayerOrder(room.players, room.playerOrder, room.joinOrder);
  room.playerOrder = synced.playerOrder;
  room.joinOrder = synced.joinOrder;

  const orderedPlayers = orderPlayersByIds(room.players, room.playerOrder);

  room.state = createInitialState({
    rules: room.rules,
    players: orderedPlayers,
  });
  room.status = "playing";
  const firstPlayer = room.state.players[0]!;
  room.turnHistory.push({
    index: room.turnHistory.length,
    turnNumber: room.state.turnNumber,
    events: [
      {
        type: "TURN_STARTED",
        playerId: firstPlayer.id,
        turnNumber: room.state.turnNumber,
      },
    ],
    state: structuredClone(room.state),
  });
  void persist(room);
  broadcastRoom(room);
  return { ok: true };
}

export function attachSocket(
  sessionToken: string,
  socket: WebSocket,
): { ok: true; room: GameRoom } | { error: string } {
  const room = [...rooms.values()].find((r) =>
    r.tokenToPlayerId.has(sessionToken),
  );
  if (!room) {
    return { error: "Invalid session token" };
  }

  const playerId = room.tokenToPlayerId.get(sessionToken)!;
  const session = room.sessions.get(playerId);
  if (!session) {
    return { error: "Session not found" };
  }

  session.socket = socket;

  if (room.status === "lobby") {
    send(socket, { type: "LOBBY", lobby: lobbyView(room, playerId) });
  } else if (room.state) {
    send(socket, {
      type: "GAME_STATE",
      view: buildPlayerView(room.state, viewOptions(room, playerId)),
    });
  }

  return { ok: true, room };
}

export function detachSocket(sessionToken: string): void {
  for (const room of rooms.values()) {
    const playerId = room.tokenToPlayerId.get(sessionToken);
    if (!playerId) continue;
    const session = room.sessions.get(playerId);
    if (session) {
      session.socket = null;
    }
    return;
  }
}

export async function handleClientMessage(
  sessionToken: string,
  message: ClientMessage,
): Promise<void> {
  const room = [...rooms.values()].find((r) =>
    r.tokenToPlayerId.has(sessionToken),
  );
  if (!room) return;

  const playerId = room.tokenToPlayerId.get(sessionToken)!;

  if (message.type === "RESUME") {
    const session = room.sessions.get(playerId);
    if (session?.socket) {
      attachSocket(sessionToken, session.socket);
    }
    return;
  }

  if (message.type === "SAVE_NOTES") {
    room.notes[playerId] = message.notes;
    await persist(room);
    return;
  }

  if (message.type === "ACTION") {
    if (message.action.type === "UNDO") {
      await handleUndo(room, playerId);
      return;
    }
    await handleAction(room, playerId, message.action);
  }
}

async function handleUndo(room: GameRoom, playerId: string): Promise<void> {
  const session = room.sessions.get(playerId);

  if (!room.state || room.status === "lobby") {
    if (session?.socket) {
      send(session.socket, { type: "ERROR", message: "Game is not in progress" });
    }
    return;
  }

  if (room.state.rules.ranked) {
    if (session?.socket) {
      send(session.socket, { type: "ERROR", message: "Undo is only available in casual games" });
    }
    return;
  }

  if (room.turnHistory.length <= 1) {
    if (session?.socket) {
      send(session.socket, { type: "ERROR", message: "Nothing to undo" });
    }
    return;
  }

  room.turnHistory.pop();
  const last = room.turnHistory[room.turnHistory.length - 1];
  if (!last?.state) {
    if (session?.socket) {
      send(session.socket, { type: "ERROR", message: "Cannot undo" });
    }
    return;
  }

  room.state = structuredClone(last.state);
  room.status =
    room.state.phase === "won" || room.state.phase === "lost"
      ? "finished"
      : "playing";

  await persist(room);
  broadcastRoom(room);
}

export function getHistorySnapshot(
  room: GameRoom,
  index: number,
  viewerId: string,
): TurnHistorySnapshot | { error: string } {
  if (!room.state || room.status === "lobby") {
    return { error: "Game has not started" };
  }
  if (!Number.isInteger(index) || index < 0 || index >= room.turnHistory.length) {
    return { error: "Invalid history index" };
  }
  const snapshot = buildHistorySnapshot(
    room.turnHistory,
    index,
    viewerId,
    room.status === "finished",
  );
  if (!snapshot) {
    return { error: "Snapshot not available" };
  }
  return snapshot;
}

async function handleAction(
  room: GameRoom,
  playerId: string,
  action: GameAction,
): Promise<void> {
  if (!room.state || room.status !== "playing") {
    const session = room.sessions.get(playerId);
    if (session?.socket) {
      send(session.socket, { type: "ERROR", message: "Game is not in progress" });
    }
    return;
  }

  const result = applyAction(room.state, action);
  const session = room.sessions.get(playerId);

  if (result.error) {
    if (session?.socket) {
      send(session.socket, { type: "ERROR", message: result.error });
    }
    return;
  }

  room.state = result.state;

  if (result.events.length > 0) {
    room.turnHistory.push({
      index: room.turnHistory.length,
      turnNumber: room.state.turnNumber,
      events: result.events,
      state: structuredClone(room.state),
    });
  }

  if (room.state.phase === "won" || room.state.phase === "lost") {
    room.status = "finished";
  }

  await persist(room);
  broadcastRoom(room);
}

export async function restoreGamesOnStartup(): Promise<void> {
  // Games are loaded on demand when a player reconnects with a valid token.
  // Persisted files keep turn history across restarts.
  for (const room of rooms.values()) {
    await persist(room);
  }
}

export async function loadRoomFromDisk(gameId: string): Promise<GameRoom | null> {
  if (rooms.has(gameId)) {
    return rooms.get(gameId)!;
  }

  const data = await loadGame(gameId);
  if (!data) return null;

  const room: GameRoom = {
    gameId: data.gameId,
    inviteCode: data.inviteCode,
    hostId: data.hostId,
    status: data.status,
    rules: data.rules,
    players: data.players,
    playerOrder: data.playerOrder ?? data.players.map((p) => p.id),
    joinOrder: data.joinOrder ?? data.players.map((p) => p.id),
    sessions: new Map(),
    tokenToPlayerId: new Map(Object.entries(data.sessions)),
    state: data.state ?? null,
    turnHistory: data.turnHistory.map((record, i) => ({
      ...record,
      index: record.index ?? i,
    })),
    notes: data.notes ?? {},
    rosterLocked: data.rosterLocked ?? false,
  };

  for (const player of data.players) {
    const token = Object.entries(data.sessions).find(
      ([, pid]) => pid === player.id,
    )?.[0];
    if (token) {
      room.sessions.set(player.id, {
        playerId: player.id,
        sessionToken: token,
        displayName: player.displayName,
        socket: null,
      });
    }
  }

  rooms.set(gameId, room);
  roomsByInvite.set(room.inviteCode, gameId);
  return room;
}

export function getPlayerIdForToken(sessionToken: string): string | undefined {
  for (const room of rooms.values()) {
    const playerId = room.tokenToPlayerId.get(sessionToken);
    if (playerId) return playerId;
  }
  return undefined;
}

export function findRoomByToken(sessionToken: string): GameRoom | undefined {
  return [...rooms.values()].find((r) => r.tokenToPlayerId.has(sessionToken));
}
