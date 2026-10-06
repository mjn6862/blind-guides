import type {
  CardInstance,
  Clue,
  ColorConfig,
  GameRules,
  GameState,
} from "@blind-guides/shared";
import { normalizeClue } from "@blind-guides/shared";
import { getColorConfig } from "./deck.js";

export function cardMatchesClue(
  card: CardInstance,
  clue: Clue,
  colorConfig: ColorConfig,
): boolean {
  const normalized = normalizeClue(clue);

  switch (colorConfig.clueMatching.type) {
    case "standard":
      if (normalized.kind === "color") {
        return card.colorId === normalized.colorId;
      }
      return card.number === normalized.number;

    case "number_only":
      return normalized.kind === "number" && card.number === normalized.number;

    case "color_only":
      return normalized.kind === "color" && card.colorId === normalized.colorId;

    case "every_color":
      if (normalized.kind === "color") {
        return true;
      }
      return card.number === normalized.number;

    case "every_number":
      return normalized.kind === "number";

    case "specific_colors":
      return (
        normalized.kind === "color" &&
        colorConfig.clueMatching.colorIds.includes(normalized.colorId)
      );

    case "by_rank": {
      const rule = colorConfig.clueMatching;
      if (normalized.kind === "number") {
        return rule.numberMatch !== null && normalized.number === rule.numberMatch;
      }
      const rankRule = rule.colorsByRank[card.number];
      if (!rankRule) return false;
      const included = rankRule.colorIds.includes(normalized.colorId);
      return rankRule.mode === "only" ? included : !included;
    }

    default:
      return false;
  }
}

export function getMatchingCardsInHand(
  state: GameState,
  targetPlayerId: string,
  clue: Clue,
): CardInstance[] {
  const normalized = normalizeClue(clue);
  const hand = state.hands[targetPlayerId] ?? [];
  const matched: CardInstance[] = [];

  for (const cardId of hand) {
    if (cardId === null) continue;
    const card = state.cardById[cardId];
    if (!card) continue;
    const colorConfig = getColorConfig(state.rules, card.colorId);
    if (!colorConfig) continue;
    if (cardMatchesClue(card, normalized, colorConfig)) {
      matched.push(card);
    }
  }

  return matched;
}

export function isValidClue(
  state: GameState,
  clue: Clue,
  targetPlayerId: string,
): { valid: boolean; reason?: string } {
  const normalized = normalizeClue(clue);

  if (normalized.kind === "color") {
    const color = getColorConfig(state.rules, normalized.colorId);
    if (!color) {
      return { valid: false, reason: "Unknown color" };
    }
    if (!color.canBeClued) {
      return { valid: false, reason: "This color cannot be clued" };
    }
  }

  const matched = getMatchingCardsInHand(state, targetPlayerId, normalized);
  if (matched.length === 0) {
    return { valid: false, reason: "Clue must match at least one card" };
  }

  return { valid: true };
}

export function getCluableColorIds(rules: GameRules): string[] {
  return rules.colors.filter((c) => c.canBeClued).map((c) => c.id);
}
