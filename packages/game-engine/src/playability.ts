import type { CardInstance, ColorConfig, GameState } from "@blind-guides/shared";
import { getColorConfig, getConfiguredNumbers } from "./deck.js";

export function isColorComplete(state: GameState, colorId: string): boolean {
  const color = getColorConfig(state.rules, colorId);
  if (!color) return false;

  const required = getConfiguredNumbers(color);
  const played = state.played[colorId] ?? [];
  return required.every((n) => played.includes(n));
}

export function isNumberPlayedInColor(
  state: GameState,
  colorId: string,
  number: number,
): boolean {
  return (state.played[colorId] ?? []).includes(number);
}

export function isPlayable(
  state: GameState,
  card: CardInstance,
  colorConfig?: ColorConfig,
): boolean {
  const color = colorConfig ?? getColorConfig(state.rules, card.colorId);
  if (!color) return false;

  if (isNumberPlayedInColor(state, card.colorId, card.number)) {
    return false;
  }

  const configured = getConfiguredNumbers(color);

  switch (color.playability.type) {
    case "standard": {
      const lower = configured.filter((n) => n < card.number);
      return lower.every((n) => isNumberPlayedInColor(state, card.colorId, n));
    }
    case "reverse": {
      const higher = configured.filter((n) => n > card.number);
      return higher.every((n) => isNumberPlayedInColor(state, card.colorId, n));
    }
    case "any_order":
      return true;
    case "after_color_complete": {
      const depId = color.playability.colorId;
      return isColorComplete(state, depId);
    }
    default:
      return false;
  }
}

export function isGameWon(state: GameState): boolean {
  for (const color of state.rules.colors) {
    const required = getConfiguredNumbers(color);
    if (required.length === 0) continue;
    const played = state.played[color.id] ?? [];
    if (!required.every((n) => played.includes(n))) {
      return false;
    }
  }
  return state.rules.colors.some((c) => getConfiguredNumbers(c).length > 0);
}
