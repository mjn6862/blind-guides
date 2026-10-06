import type { GameRules, GameState, PlayerInfo } from "./types.js";
import type { TurnRecord } from "./protocol.js";

export const GAME_EXPORT_VERSION = 2;

export type GameExport = {
  version: number;
  exportedAt: string;
  /** Original invite code (reference only; import generates a new one). */
  inviteCode: string;
  hostId: string;
  status: "lobby" | "playing" | "finished";
  rules: GameRules;
  players: PlayerInfo[];
  playerOrder: string[];
  joinOrder: string[];
  state?: GameState;
  turnHistory: TurnRecord[];
  notes: Record<string, string>;
};

export function buildGameExport(data: {
  inviteCode: string;
  hostId: string;
  status: "lobby" | "playing" | "finished";
  rules: GameRules;
  players: PlayerInfo[];
  playerOrder: string[];
  joinOrder: string[];
  state?: GameState;
  turnHistory: TurnRecord[];
  notes: Record<string, string>;
}): GameExport {
  return {
    version: GAME_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    inviteCode: data.inviteCode,
    hostId: data.hostId,
    status: data.status,
    rules: data.rules,
    players: data.players,
    playerOrder: data.playerOrder,
    joinOrder: data.joinOrder,
    state: data.state,
    turnHistory: data.turnHistory,
    notes: data.notes,
  };
}

export function validateGameExport(raw: unknown): { ok: true; export: GameExport } | { error: string } {
  if (!raw || typeof raw !== "object") {
    return { error: "Invalid export file" };
  }

  const data = raw as Partial<GameExport>;

  if (data.version !== GAME_EXPORT_VERSION) {
    return {
      error: `Unsupported export version (expected ${GAME_EXPORT_VERSION})`,
    };
  }

  if (!data.hostId || typeof data.hostId !== "string") {
    return { error: "Export is missing host information" };
  }

  if (!Array.isArray(data.players) || data.players.length === 0) {
    return { error: "Export has no players" };
  }

  if (!data.rules || !Array.isArray(data.rules.colors) || data.rules.colors.length === 0) {
    return { error: "Export has invalid rules" };
  }

  const status = data.status;
  if (status !== "lobby" && status !== "playing" && status !== "finished") {
    return { error: "Export has invalid game status" };
  }

  if (!Array.isArray(data.playerOrder) || !Array.isArray(data.joinOrder)) {
    return { error: "Export is missing player order" };
  }

  if (!Array.isArray(data.turnHistory)) {
    return { error: "Export is missing turn history" };
  }

  if (status !== "lobby" && !data.state) {
    return { error: "Export is missing game state" };
  }

  const host = data.players.find((p) => p.id === data.hostId);
  if (!host) {
    return { error: "Export host is not in the player list" };
  }

  return {
    ok: true,
    export: {
      version: GAME_EXPORT_VERSION,
      exportedAt:
        typeof data.exportedAt === "string" ? data.exportedAt : new Date(0).toISOString(),
      inviteCode: typeof data.inviteCode === "string" ? data.inviteCode : "",
      hostId: data.hostId,
      status,
      rules: data.rules,
      players: data.players,
      playerOrder: data.playerOrder,
      joinOrder: data.joinOrder,
      state: data.state,
      turnHistory: data.turnHistory,
      notes: typeof data.notes === "object" && data.notes !== null ? data.notes : {},
    },
  };
}

export function findPlayerByDisplayName(
  players: PlayerInfo[],
  displayName: string,
): PlayerInfo | undefined {
  const normalized = displayName.trim().toLowerCase();
  return players.find((p) => p.displayName.trim().toLowerCase() === normalized);
}
