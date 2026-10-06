import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { GameRules, GameState, PlayerInfo } from "@blind-guides/shared";
import type { TurnRecord } from "@blind-guides/shared";

export type PersistedGame = {
  gameId: string;
  inviteCode: string;
  hostId: string;
  status: "lobby" | "playing" | "finished";
  rules: GameRules;
  players: PlayerInfo[];
  /** Turn order in lobby (player ids); first id goes first when the game starts. */
  playerOrder: string[];
  /** Chronological join order for resetting turn order. */
  joinOrder: string[];
  state?: GameState;
  turnHistory: TurnRecord[];
  sessions: Record<string, string>;
  notes: Record<string, string>;
  /** Imported games only allow rejoin by display name, not new players. */
  rosterLocked?: boolean;
};

const DATA_DIR = path.join(process.cwd(), "data", "games");

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

function filePath(gameId: string): string {
  return path.join(DATA_DIR, `${gameId}.json`);
}

export async function saveGame(game: PersistedGame): Promise<void> {
  await ensureDataDir();
  await writeFile(filePath(game.gameId), JSON.stringify(game, null, 2), "utf8");
}

export async function loadGame(gameId: string): Promise<PersistedGame | null> {
  try {
    const raw = await readFile(filePath(gameId), "utf8");
    return JSON.parse(raw) as PersistedGame;
  } catch {
    return null;
  }
}
