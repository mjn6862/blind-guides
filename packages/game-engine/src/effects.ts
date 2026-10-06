import type {
  CardInstance,
  GameEffect,
  GameEvent,
  GameState,
} from "@blind-guides/shared";
import { getSlotLabelForCard, removeCardFromSlots } from "./hands.js";
import { isColorComplete, isPlayable } from "./playability.js";

export type EffectContext = {
  state: GameState;
  card: CardInstance;
  playerId: string;
  wasPlayAttempt: boolean;
  playable: boolean;
};

export function applyEffects(
  ctx: EffectContext,
  effects: GameEffect[],
): { state: GameState; events: GameEvent[] } {
  let state = ctx.state;
  const events: GameEvent[] = [];
  const effectSet = new Set(effects);

  const shouldPlay =
    effectSet.has("PLAY_TO_PILE") ||
    (effectSet.has("AUTO_PLAY_IF_PLAYABLE") && ctx.playable);

  const shouldDiscard =
    effectSet.has("DISCARD") && !shouldPlay;

  if (shouldPlay) {
    const result = playCardToPile(state, ctx.card, ctx.playerId);
    state = result.state;
    events.push(...result.events);
  } else if (shouldDiscard) {
    const result = discardCard(
      state,
      ctx.card,
      ctx.playerId,
      ctx.wasPlayAttempt && !ctx.playable,
    );
    state = result.state;
    events.push(...result.events);
  }

  if (effectSet.has("GAIN_POINTER")) {
    const result = gainPointer(state);
    state = result.state;
    if (result.gained) {
      events.push({ type: "POINTER_GAINED", amount: 1 });
    }
  }

  if (effectSet.has("GAIN_POINTER_IF_SAME_NUMBER_NOT_PLAYED")) {
    const playedInColor = state.played[ctx.card.colorId] ?? [];
    if (!playedInColor.includes(ctx.card.number)) {
      const result = gainPointer(state);
      state = result.state;
      if (result.gained) {
        events.push({ type: "POINTER_GAINED", amount: 1 });
      }
    }
  }

  if (effectSet.has("STUMBLE")) {
    state = {
      ...state,
      stumbles: state.stumbles + 1,
    };
    events.push({ type: "STUMBLED", amount: 1 });
  }

  return { state, events };
}

function gainPointer(state: GameState): { state: GameState; gained: boolean } {
  const before = state.pointers;
  const next = {
    ...state,
    pointers: Math.min(state.pointers + 1, state.rules.maxPointers),
  };
  return { state: next, gained: next.pointers > before };
}

function removeCardFromHand(
  state: GameState,
  playerId: string,
  cardId: string,
): GameState {
  const hand = state.hands[playerId] ?? [];
  return {
    ...state,
    hands: {
      ...state.hands,
      [playerId]: removeCardFromSlots(hand, cardId),
    },
    slotsVacatedThisTurn:
      playerId === state.players[state.currentPlayerIndex]?.id
        ? state.slotsVacatedThisTurn + 1
        : state.slotsVacatedThisTurn,
  };
}

function playCardToPile(
  state: GameState,
  card: CardInstance,
  playerId: string,
): { state: GameState; events: GameEvent[] } {
  const hand = state.hands[playerId] ?? [];
  const label = getSlotLabelForCard(hand, card.id) ?? "?";
  const wasComplete = isColorComplete(state, card.colorId);

  let next = removeCardFromHand(state, playerId, card.id);
  const played = { ...next.played };
  const colorPlayed = [...(played[card.colorId] ?? [])];
  if (!colorPlayed.includes(card.number)) {
    colorPlayed.push(card.number);
    colorPlayed.sort((a, b) => a - b);
  }
  played[card.colorId] = colorPlayed;
  next = { ...next, played };

  const events: GameEvent[] = [
    { type: "CARD_PLAYED", card, playerId, slotLabel: label },
  ];

  if (!wasComplete && isColorComplete(next, card.colorId)) {
    const bonus = gainPointer(next);
    next = bonus.state;
    if (bonus.gained) {
      events.push({ type: "POINTER_GAINED", amount: 1 });
    }
  }

  return { state: next, events };
}

function discardCard(
  state: GameState,
  card: CardInstance,
  playerId: string,
  misplay = false,
): { state: GameState; events: GameEvent[] } {
  const hand = state.hands[playerId] ?? [];
  const label = getSlotLabelForCard(hand, card.id) ?? "?";
  const next = removeCardFromHand(state, playerId, card.id);
  return {
    state: {
      ...next,
      discard: [...next.discard, card],
    },
    events: [{ type: "CARD_DISCARDED", card, playerId, slotLabel: label, misplay }],
  };
}

export function resolveCardAction(
  state: GameState,
  card: CardInstance,
  playerId: string,
  isPlayAction: boolean,
): { state: GameState; events: GameEvent[] } {
  const playable = isPlayable(state, card);
  const effects = isPlayAction
    ? playable
      ? getColorEffects(state, card.colorId).onPlay
      : getColorEffects(state, card.colorId).onMisplay
    : getColorEffects(state, card.colorId).onDiscard;

  return applyEffects(
    { state, card, playerId, wasPlayAttempt: isPlayAction, playable },
    effects,
  );
}

function getColorEffects(
  state: GameState,
  colorId: string,
): { onPlay: GameEffect[]; onDiscard: GameEffect[]; onMisplay: GameEffect[] } {
  const color = state.rules.colors.find((c) => c.id === colorId);
  if (!color) {
    return { onPlay: [], onDiscard: ["DISCARD"], onMisplay: ["DISCARD", "STUMBLE"] };
  }
  return {
    onPlay: color.onPlay,
    onDiscard: color.onDiscard,
    onMisplay: color.onMisplay,
  };
}
