/** Effects that can fire on play, discard, or misplay. Order does not matter. */
export type GameEffect =
  | "PLAY_TO_PILE"
  | "DISCARD"
  | "GAIN_POINTER"
  | "STUMBLE"
  | "AUTO_PLAY_IF_PLAYABLE"
  | "GAIN_POINTER_IF_SAME_NUMBER_NOT_PLAYED";

export type PlayabilityPreset =
  | { type: "standard" }
  | { type: "reverse" }
  | { type: "any_order" }
  | { type: "after_color_complete"; colorId: string };

/** Which color clues a single rank matches, used by ClueMatchRule "by_rank". */
export type RankColorRule =
  | { mode: "only"; colorIds: string[] }
  | { mode: "all_except"; colorIds: string[] };

export type ClueMatchRule =
  | { type: "standard" }
  | { type: "number_only" }
  | { type: "color_only" }
  | { type: "every_color" }
  | { type: "specific_colors"; colorIds: string[] }
  | { type: "every_number" }
  | {
      type: "by_rank";
      /** Color-clue matching rule per printed number on the card. */
      colorsByRank: Partial<Record<number, RankColorRule>>;
      /** The single number clue value every card of this suit matches, regardless of its own printed number. `null` means no number clue ever matches. */
      numberMatch: number | null;
    };

export type ColorConfig = {
  id: string;
  displayName: string;
  /** CSS color for UI (e.g. "#e74c3c") */
  displayColor: string;
  numbers: { value: number; count: number }[];
  playability: PlayabilityPreset;
  onPlay: GameEffect[];
  onDiscard: GameEffect[];
  onMisplay: GameEffect[];
  clueMatching: ClueMatchRule;
  canBeClued: boolean;
};

export type GameRules = {
  colors: ColorConfig[];
  maxPointers: number;
  maxStumbles: number;
  handSize: number;
  /** 1–5 actions per turn */
  actionsPerTurn: number;
  openHand: boolean;
  ranked: boolean;
};

export type CardInstance = {
  id: string;
  colorId: string;
  number: number;
};

export type PlayerInfo = {
  id: string;
  displayName: string;
};

export type GamePhase = "playing" | "won" | "lost";

export type PlayedPile = Record<string, number[]>;

export type GameState = {
  rules: GameRules;
  players: PlayerInfo[];
  currentPlayerIndex: number;
  actionsRemainingThisTurn: number;
  /** Card ids in draw order (top = end of array) */
  deck: string[];
  /** playerId -> fixed slots; null = empty slot (card played/discarded, not yet replaced) */
  hands: Record<string, (string | null)[]>;
  played: PlayedPile;
  discard: CardInstance[];
  pointers: number;
  stumbles: number;
  phase: GamePhase;
  lossReason?: string;
  turnNumber: number;
  cardById: Record<string, CardInstance>;
  /** Cards removed from current player's hand this turn (for end-of-turn draw) */
  slotsVacatedThisTurn: number;
  paused: boolean;
};

export type ColorClue = { kind: "color"; colorId: string };
export type NumberClue = { kind: "number"; number: number };
export type Clue = ColorClue | NumberClue;

export type PlayCardAction = {
  type: "PLAY_CARD";
  playerId: string;
  cardId: string;
};

export type DiscardCardAction = {
  type: "DISCARD_CARD";
  playerId: string;
  cardId: string;
};

export type GiveClueAction = {
  type: "GIVE_CLUE";
  playerId: string;
  targetPlayerId: string;
  clue: Clue;
};

export type EndTurnAction = {
  type: "END_TURN";
  playerId: string;
};

export type PauseAction = {
  type: "PAUSE";
  playerId: string;
};

export type ResumeAction = {
  type: "RESUME";
  playerId: string;
};

export type UndoAction = {
  type: "UNDO";
  playerId: string;
};

export type GameAction =
  | PlayCardAction
  | DiscardCardAction
  | GiveClueAction
  | EndTurnAction
  | PauseAction
  | ResumeAction
  | UndoAction;

export type GameEvent =
  | { type: "CARD_PLAYED"; card: CardInstance; playerId: string; slotLabel: string }
  | {
      type: "CARD_DISCARDED";
      card: CardInstance;
      playerId: string;
      slotLabel: string;
      /** True when the card was discarded due to a failed play attempt */
      misplay?: boolean;
    }
  | {
      type: "CLUE_GIVEN";
      fromPlayerId: string;
      toPlayerId: string;
      clue: Clue;
      matchedCardIds: string[];
      matchedSlotLabels: string[];
    }
  | { type: "POINTER_GAINED"; amount: number }
  | { type: "POINTER_SPENT"; amount: number }
  | { type: "STUMBLED"; amount: number }
  | { type: "CARDS_DRAWN"; playerId: string; cardIds: string[] }
  | { type: "TURN_ENDED"; playerId: string; turnNumber: number }
  | { type: "TURN_STARTED"; playerId: string; turnNumber: number }
  | { type: "GAME_WON" }
  | { type: "GAME_LOST"; reason: string }
  | { type: "IMPOSSIBILITY_DETECTED"; reason: string }
  | { type: "GAME_PAUSED"; playerId: string }
  | { type: "GAME_RESUMED"; playerId: string };

export type ActionResult = {
  state: GameState;
  events: GameEvent[];
  error?: string;
};

export type RecentTurnEntry = {
  playerId: string;
  playerName: string;
  lines: string[];
  isInProgress: boolean;
};

export type TurnOrderEntry = {
  playerId: string;
  displayName: string;
  position: number;
};

export type CardTurnInfo = {
  drawnTurn?: number;
  discardedTurn?: number;
  playedTurn?: number;
  misplay?: boolean;
};

export type CardClueHistory = {
  matched: string[];
  failed: string[];
};
