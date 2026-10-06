import type { GameState } from "@blind-guides/shared";
import { getColorConfig, getConfiguredNumbers, getTotalCopies } from "./deck.js";
import { isNumberPlayedInColor } from "./playability.js";

/**
 * Returns a human-readable reason if the team can no longer complete every color.
 * Checked after discards and misplays.
 */
export function getImpossibilityReason(state: GameState): string | undefined {
  for (const color of state.rules.colors) {
    const required = getConfiguredNumbers(color);
    for (const number of required) {
      if (isNumberPlayedInColor(state, color.id, number)) {
        continue;
      }

      const totalCopies = getTotalCopies(color, number);
      if (totalCopies === 0) {
        return `${color.displayName} requires ${number} but none exist in the deck configuration`;
      }

      const discardedCopies = state.discard.filter(
        (c) => c.colorId === color.id && c.number === number,
      ).length;

      const onPile = isNumberPlayedInColor(state, color.id, number) ? 1 : 0;
      const remainingCopies = totalCopies - discardedCopies - onPile;
      if (remainingCopies <= 0) {
        return `All copies of ${color.displayName} ${number} are gone`;
      }
    }
  }

  return undefined;
}

export function isColorInRules(state: GameState, colorId: string): boolean {
  return getColorConfig(state.rules, colorId) !== undefined;
}
