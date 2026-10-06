import type {
  ActionResult,
  GameAction,
  GameEvent,
  GameState,
} from "@blind-guides/shared";
import { getMatchingCardsInHand, isValidClue } from "./clues.js";
import { normalizeClue } from "@blind-guides/shared";
import { getSlotLabelsForCards, handContains } from "./hands.js";
import { resolveCardAction } from "./effects.js";
import { getImpossibilityReason } from "./impossibility.js";
import { isGameWon } from "./playability.js";
import {
  advanceToNextPlayer,
  drawCardsForPlayer,
  getCurrentPlayer,
} from "./state.js";

export function applyAction(state: GameState, action: GameAction): ActionResult {
  if (state.phase !== "playing") {
    return { state, events: [], error: "Game is already over" };
  }

  switch (action.type) {
    case "PAUSE":
      return applyPause(state, action);
    case "RESUME":
      return applyResume(state, action);
    case "PLAY_CARD":
      return applyPlayCard(state, action);
    case "DISCARD_CARD":
      return applyDiscardCard(state, action);
    case "GIVE_CLUE":
      return applyGiveClue(state, action);
    case "END_TURN":
      return applyEndTurn(state, action);
    default:
      return { state, events: [], error: "Unknown action" };
  }
}

function applyPause(
  state: GameState,
  action: Extract<GameAction, { type: "PAUSE" }>,
): ActionResult {
  if (state.paused) {
    return { state, events: [], error: "Game is already paused" };
  }

  const hostId = state.players[0]?.id;
  if (action.playerId !== hostId) {
    return { state, events: [], error: "Only the host can pause" };
  }

  return {
    state: { ...state, paused: true },
    events: [{ type: "GAME_PAUSED", playerId: action.playerId }],
  };
}

function applyResume(
  state: GameState,
  action: Extract<GameAction, { type: "RESUME" }>,
): ActionResult {
  if (!state.paused) {
    return { state, events: [], error: "Game is not paused" };
  }

  const hostId = state.players[0]?.id;
  if (action.playerId !== hostId) {
    return { state, events: [], error: "Only the host can resume" };
  }

  return {
    state: { ...state, paused: false },
    events: [{ type: "GAME_RESUMED", playerId: action.playerId }],
  };
}

function assertCanAct(
  state: GameState,
  playerId: string,
): string | undefined {
  if (state.paused) {
    return "Game is paused";
  }
  const current = getCurrentPlayer(state);
  if (current.id !== playerId) {
    return "Not your turn";
  }
  if (state.actionsRemainingThisTurn <= 0) {
    return "No actions remaining; end your turn";
  }
  return undefined;
}

function applyPlayCard(
  state: GameState,
  action: Extract<GameAction, { type: "PLAY_CARD" }>,
): ActionResult {
  const block = assertCanAct(state, action.playerId);
  if (block) return { state, events: [], error: block };

  const hand = state.hands[action.playerId] ?? [];
  if (!handContains(hand, action.cardId)) {
    return { state, events: [], error: "Card not in hand" };
  }

  const card = state.cardById[action.cardId];
  if (!card) {
    return { state, events: [], error: "Unknown card" };
  }

  const { state: afterEffects, events: effectEvents } = resolveCardAction(
    state,
    card,
    action.playerId,
    true,
  );

  return finalizeAction(afterEffects, effectEvents, action.playerId, {
    checkImpossibility: true,
  });
}

function applyDiscardCard(
  state: GameState,
  action: Extract<GameAction, { type: "DISCARD_CARD" }>,
): ActionResult {
  const block = assertCanAct(state, action.playerId);
  if (block) return { state, events: [], error: block };

  const hand = state.hands[action.playerId] ?? [];
  if (!handContains(hand, action.cardId)) {
    return { state, events: [], error: "Card not in hand" };
  }

  const card = state.cardById[action.cardId];
  if (!card) {
    return { state, events: [], error: "Unknown card" };
  }

  const { state: afterEffects, events: effectEvents } = resolveCardAction(
    state,
    card,
    action.playerId,
    false,
  );

  return finalizeAction(afterEffects, effectEvents, action.playerId, {
    checkImpossibility: true,
  });
}

function applyGiveClue(
  state: GameState,
  action: Extract<GameAction, { type: "GIVE_CLUE" }>,
): ActionResult {
  const block = assertCanAct(state, action.playerId);
  if (block) return { state, events: [], error: block };

  if (state.pointers <= 0) {
    return { state, events: [], error: "No pointers available" };
  }

  if (action.targetPlayerId === action.playerId) {
    return { state, events: [], error: "Cannot clue yourself" };
  }

  if (!state.hands[action.targetPlayerId]) {
    return { state, events: [], error: "Unknown target player" };
  }

  const clueCheck = isValidClue(state, action.clue, action.targetPlayerId);
  if (!clueCheck.valid) {
    return { state, events: [], error: clueCheck.reason ?? "Invalid clue" };
  }

  const matched = getMatchingCardsInHand(
    state,
    action.targetPlayerId,
    action.clue,
  );

  const normalizedClue = normalizeClue(action.clue);

  const targetHand = state.hands[action.targetPlayerId] ?? [];
  const matchedIds = matched.map((c) => c.id);

  const events: GameEvent[] = [
    {
      type: "CLUE_GIVEN",
      fromPlayerId: action.playerId,
      toPlayerId: action.targetPlayerId,
      clue: normalizedClue,
      matchedCardIds: matchedIds,
      matchedSlotLabels: getSlotLabelsForCards(targetHand, matchedIds),
    },
    { type: "POINTER_SPENT", amount: 1 },
  ];

  let next: GameState = {
    ...state,
    pointers: state.pointers - 1,
    actionsRemainingThisTurn: state.actionsRemainingThisTurn - 1,
  };

  return finalizeAction(next, events, action.playerId, {
    checkImpossibility: false,
  });
}

function applyEndTurn(
  state: GameState,
  action: Extract<GameAction, { type: "END_TURN" }>,
): ActionResult {
  const current = getCurrentPlayer(state);
  if (current.id !== action.playerId) {
    return { state, events: [], error: "Not your turn" };
  }

  return endTurn(state, action.playerId);
}

type FinalizeOptions = {
  checkImpossibility: boolean;
};

function finalizeAction(
  state: GameState,
  events: GameEvent[],
  playerId: string,
  options: FinalizeOptions,
): ActionResult {
  let next: GameState = {
    ...state,
    actionsRemainingThisTurn: state.actionsRemainingThisTurn - 1,
  };

  const allEvents = [...events];

  if (isGameWon(next)) {
    return {
      state: { ...next, phase: "won" },
      events: [...allEvents, { type: "GAME_WON" }],
    };
  }

  if (next.stumbles >= next.rules.maxStumbles) {
    return {
      state: { ...next, phase: "lost", lossReason: "The team stumbled into a pit." },
      events: [
        ...allEvents,
        { type: "GAME_LOST", reason: "The team stumbled into a pit." },
      ],
    };
  }

  if (options.checkImpossibility) {
    const reason = getImpossibilityReason(next);
    if (reason) {
      return {
        state: { ...next, phase: "lost", lossReason: reason },
        events: [
          ...allEvents,
          { type: "IMPOSSIBILITY_DETECTED", reason },
          { type: "GAME_LOST", reason },
        ],
      };
    }
  }

  if (next.actionsRemainingThisTurn <= 0) {
    return endTurn(next, playerId, allEvents);
  }

  return { state: next, events: allEvents };
}

function endTurn(
  state: GameState,
  playerId: string,
  priorEvents: GameEvent[] = [],
): ActionResult {
  const events: GameEvent[] = [
    ...priorEvents,
    { type: "TURN_ENDED", playerId, turnNumber: state.turnNumber },
  ];

  const { state: afterDraw, drawnIds } = drawCardsForPlayer(state, playerId);
  if (drawnIds.length > 0) {
    events.push({ type: "CARDS_DRAWN", playerId, cardIds: drawnIds });
  }

  let next = advanceToNextPlayer(afterDraw);
  const nextPlayer = getCurrentPlayer(next);

  events.push({
    type: "TURN_STARTED",
    playerId: nextPlayer.id,
    turnNumber: next.turnNumber,
  });

  if (isGameWon(next)) {
    return {
      state: { ...next, phase: "won" },
      events: [...events, { type: "GAME_WON" }],
    };
  }

  return { state: next, events };
}
