import type {
  CardClueHistory,
  CardTurnInfo,
  GameAction,
  GameEvent,
  GameRules,
  GameState,
  PlayerInfo,
  RecentTurnEntry,
  TurnOrderEntry,
} from "./types.js";

export type CardView =
  | { empty: true; slotIndex: number; slotLabel: string }
  | { id: string; hidden: true; slotLabel: string; highlighted?: boolean }
  | { id: string; colorId: string; number: number; slotLabel: string; highlighted?: boolean };

export type TurnRecord = {
  index: number;
  turnNumber: number;
  events: GameEvent[];
  /** Full snapshots are kept server-side; omitted on wire to clients. */
  state?: GameState;
};

export type HistoryLine = {
  index: number;
  turnNumber: number;
  summary: string;
};

/** Read-only game board at a point in turn history (all hands visible). */
export type TurnHistorySnapshot = {
  index: number;
  turnNumber: number;
  pointers: number;
  stumbles: number;
  deckCount: number;
  played: Record<string, number[]>;
  discard: { id: string; colorId: string; number: number }[];
  hands: Record<string, CardView[]>;
  handClueHistories: Record<string, Record<string, CardClueHistory>>;
  cardTurns: Record<string, CardTurnInfo>;
  playedTurns: Record<string, number>;
  currentPlayerId: string | null;
  phase: GameState["phase"];
  turnOrder: TurnOrderEntry[];
  events: GameEvent[];
};

export type PlayerGameView = {
  gameId: string;
  inviteCode: string;
  playerId: string;
  isHost: boolean;
  isYourTurn: boolean;
  status: "lobby" | "playing" | "finished";
  rules: GameRules;
  players: PlayerInfo[];
  currentPlayerId: string | null;
  actionsRemaining: number;
  yourHand: CardView[];
  otherHands: Record<string, CardView[]>;
  played: Record<string, number[]>;
  discard: { id: string; colorId: string; number: number }[];
  deckCount: number;
  pointers: number;
  stumbles: number;
  phase: GameState["phase"] | null;
  lossReason?: string;
  turnNumber: number;
  paused: boolean;
  turnHistory: TurnRecord[];
  historyLines: HistoryLine[];
  recentTurns: RecentTurnEntry[];
  turnOrder: TurnOrderEntry[];
  cardTurns: Record<string, CardTurnInfo>;
  playedTurns: Record<string, number>;
  handClueHistories: Record<string, Record<string, CardClueHistory>>;
  privateNotes: string;
  currentPlayerName: string | null;
  /** Casual games only — undo the last action batch. */
  canUndo: boolean;
};

export type LobbyView = {
  gameId: string;
  inviteCode: string;
  playerId: string;
  isHost: boolean;
  status: "lobby" | "playing" | "finished";
  /** Players in turn order (first player goes first). */
  players: PlayerInfo[];
  playerOrder: string[];
  rules: GameRules;
};

export type ServerMessage =
  | { type: "LOBBY"; lobby: LobbyView }
  | { type: "GAME_STATE"; view: PlayerGameView }
  | { type: "ERROR"; message: string };

export type ClientMessage =
  | { type: "ACTION"; action: GameAction }
  | { type: "RESUME" }
  | { type: "SAVE_NOTES"; notes: string };

export type CreateGameRequest = {
  displayName: string;
  /** Required when the server has HOST_PASSWORD set. */
  hostPassword?: string;
};

export type PublicConfigResponse = {
  requireHostPassword: boolean;
};

export type CreateGameResponse = {
  gameId: string;
  inviteCode: string;
  playerId: string;
  sessionToken: string;
};

export type JoinGameRequest = {
  displayName: string;
};

export type JoinGameResponse = {
  playerId: string;
  sessionToken: string;
};

export type GameInfoResponse = {
  gameId: string;
  inviteCode: string;
  status: "lobby" | "playing" | "finished";
  players: PlayerInfo[];
  rules: GameRules;
};

export type ImportGameRequest = {
  displayName: string;
  hostPassword?: string;
  export: unknown;
};

export type ImportGameResponse = {
  gameId: string;
  inviteCode: string;
  playerId: string;
  sessionToken: string;
};
