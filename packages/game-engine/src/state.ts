import type { GameRules, GameState, PlayerInfo } from "@blind-guides/shared";
import { buildDeck, buildDeckDeterministic, resetCardCounter } from "./deck.js";
import { createEmptyHand } from "./hands.js";
import { fillVacatedSlots } from "./hands.js";

export type CreateGameOptions = {
  rules: GameRules;
  players: PlayerInfo[];
  /** Optional RNG in [0,1) for deterministic deck order in tests */
  seedRng?: () => number;
};

export function createInitialState(options: CreateGameOptions): GameState {
  const { rules, players } = options;

  if (players.length < 2 || players.length > 10) {
    throw new Error("Blind Guides requires 2–10 players");
  }

  if (rules.actionsPerTurn < 1 || rules.actionsPerTurn > 5) {
    throw new Error("actionsPerTurn must be between 1 and 5");
  }

  resetCardCounter();
  const { deck, cardById } = options.seedRng
    ? buildDeckDeterministic(rules, options.seedRng)
    : buildDeck(rules);

  const hands: Record<string, (string | null)[]> = {};
  for (const player of players) {
    hands[player.id] = createEmptyHand(rules.handSize);
  }

  let remainingDeck = [...deck];
  const handSize = rules.handSize;

  for (let slot = 0; slot < handSize; slot++) {
    for (const player of players) {
      if (remainingDeck.length === 0) break;
      hands[player.id]![slot] = remainingDeck.pop()!;
    }
  }

  const played: Record<string, number[]> = {};
  for (const color of rules.colors) {
    played[color.id] = [];
  }

  return {
    rules,
    players,
    currentPlayerIndex: 0,
    actionsRemainingThisTurn: rules.actionsPerTurn,
    deck: remainingDeck,
    hands,
    played,
    discard: [],
    pointers: rules.maxPointers,
    stumbles: 0,
    phase: "playing",
    turnNumber: 1,
    cardById,
    slotsVacatedThisTurn: 0,
    paused: false,
  };
}

export function getCurrentPlayer(state: GameState): PlayerInfo {
  return state.players[state.currentPlayerIndex]!;
}

export function drawCardsForPlayer(state: GameState, playerId: string): {
  state: GameState;
  drawnIds: string[];
} {
  const slots = state.slotsVacatedThisTurn;
  if (slots === 0) {
    return { state, drawnIds: [] };
  }

  const { hand, deck, drawnIds } = fillVacatedSlots(
    state.hands[playerId] ?? [],
    state.deck,
    slots,
  );

  return {
    state: {
      ...state,
      deck,
      hands: { ...state.hands, [playerId]: hand },
      slotsVacatedThisTurn: 0,
    },
    drawnIds,
  };
}

export function advanceToNextPlayer(state: GameState): GameState {
  const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;

  return {
    ...state,
    currentPlayerIndex: nextIndex,
    actionsRemainingThisTurn: state.rules.actionsPerTurn,
    turnNumber: state.turnNumber + 1,
    slotsVacatedThisTurn: 0,
  };
}
