import { STANDARD_EFFECTS, STANDARD_NUMBERS } from "./defaults.js";
import { COLOR_PRESETS } from "./presets.js";
import type {
  ClueMatchRule,
  ColorConfig,
  GameEffect,
  GameRules,
  PlayabilityPreset,
} from "./types.js";

const EFFECT_DESCRIPTIONS: Record<GameEffect, string> = {
  PLAY_TO_PILE: "add to the played pile",
  DISCARD: "discard the card",
  GAIN_POINTER: "gain 1 pointer",
  STUMBLE: "stumble",
  AUTO_PLAY_IF_PLAYABLE: "auto-play if playable",
  GAIN_POINTER_IF_SAME_NUMBER_NOT_PLAYED:
    "gain 1 pointer if that number is not on the played pile yet",
};

function numbersEqual(
  a: { value: number; count: number }[],
  b: { value: number; count: number }[],
): boolean {
  if (a.length !== b.length) return false;
  return a.every((n, i) => n.value === b[i]!.value && n.count === b[i]!.count);
}

function effectsEqual(a: GameEffect[], b: readonly GameEffect[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((effect, index) => effect === b[index]);
}

function isStandardColor(color: ColorConfig): boolean {
  return (
    numbersEqual(color.numbers, STANDARD_NUMBERS) &&
    color.playability.type === "standard" &&
    effectsEqual(color.onPlay, STANDARD_EFFECTS.onPlay) &&
    effectsEqual(color.onDiscard, STANDARD_EFFECTS.onDiscard) &&
    effectsEqual(color.onMisplay, STANDARD_EFFECTS.onMisplay) &&
    color.clueMatching.type === "standard" &&
    color.canBeClued
  );
}

export function formatCardCounts(numbers: { value: number; count: number }[]): string {
  return numbers.map((n) => `${n.count}×${n.value}`).join(", ");
}

function colorName(colors: ColorConfig[], colorId: string): string {
  return colors.find((c) => c.id === colorId)?.displayName ?? colorId;
}

export function formatPlayabilityRule(
  playability: PlayabilityPreset,
  colors: ColorConfig[],
): string {
  switch (playability.type) {
    case "standard":
      return "Play in order — lower numbers must already be on the pile";
    case "reverse":
      return "Play in reverse order — higher numbers must already be on the pile";
    case "any_order":
      return "Play in any order";
    case "after_color_complete":
      return `Cannot be played until ${colorName(colors, playability.colorId)} is complete`;
    default:
      return "Custom playability";
  }
}

export function formatClueMatchingRule(
  clueMatching: ClueMatchRule,
  canBeClued: boolean,
  colors: ColorConfig[],
): string {
  if (!canBeClued) {
    if (clueMatching.type === "every_color") {
      return "Cannot be clued; matches every color clue and number clues by value";
    }
    return "Cannot receive clues";
  }

  switch (clueMatching.type) {
    case "standard":
      return "Receives color and number clues normally";
    case "number_only":
      return "Only number clues match";
    case "color_only":
      return "Only color clues match";
    case "every_color":
      return "Matches every color clue; number clues match by value";
    case "every_number":
      return "Matches every number clue";
    case "specific_colors":
      return `Matches clues for ${clueMatching.colorIds.map((id) => colorName(colors, id)).join(", ")}`;
    case "by_rank": {
      const rankLines = Object.entries(clueMatching.colorsByRank)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([rank, rule]) => {
          const names = rule!.colorIds.map((id) => colorName(colors, id)).join(", ");
          return rule!.mode === "only"
            ? `${rank}s match only ${names}`
            : `${rank}s match every color except ${names}`;
        });
      const numberPhrase =
        clueMatching.numberMatch === null
          ? "Matches no number clues"
          : `Matches only a ${clueMatching.numberMatch} number clue`;
      return `${numberPhrase}; ${rankLines.join("; ")}`;
    }
    default:
      return "Custom clue matching";
  }
}

function formatEffectPhrase(effects: GameEffect[]): string {
  if (effects.length === 0) {
    return "nothing happens";
  }
  return effects.map((effect) => EFFECT_DESCRIPTIONS[effect]).join(", then ");
}

export function getColorPresetLabel(colorId: string): string | null {
  return COLOR_PRESETS.find((preset) => preset.id === colorId)?.name ?? null;
}

export function describeColorRules(
  color: ColorConfig,
  allColors: ColorConfig[],
): string[] {
  if (isStandardColor(color)) {
    return [
      "Standard color",
      "Play in order; discard gains 1 pointer; failed play is a stumble",
      "Receives color and number clues normally",
      `Card counts: ${formatCardCounts(color.numbers)}`,
    ];
  }

  const lines: string[] = [];
  const preset = COLOR_PRESETS.find((p) => p.id === color.id);
  if (preset) {
    lines.push(preset.description);
  }

  const counts = formatCardCounts(color.numbers);
  lines.push(
    numbersEqual(color.numbers, STANDARD_NUMBERS)
      ? `Standard card counts (${counts})`
      : `Card counts: ${counts}`,
  );
  lines.push(formatPlayabilityRule(color.playability, allColors));
  lines.push(formatClueMatchingRule(color.clueMatching, color.canBeClued, allColors));
  lines.push(`On successful play: ${formatEffectPhrase(color.onPlay)}`);
  lines.push(`On discard: ${formatEffectPhrase(color.onDiscard)}`);
  lines.push(`On misplay (failed play): ${formatEffectPhrase(color.onMisplay)}`);
  return lines;
}

export function describeGlobalRules(rules: GameRules): string[] {
  const lines = [
    `Pointers: up to ${rules.maxPointers}`,
    `Stumble limit: ${rules.maxStumbles} (stumbling ${rules.maxStumbles} times results in losing the game)`,
    `Hand size: ${rules.handSize}`,
    `${rules.actionsPerTurn} action${rules.actionsPerTurn === 1 ? "" : "s"} per turn`,
    "Cards are drawn at end of turn to refill empty hand slots",
    "Win by playing every required card in every color",
    "Completing a color gains 1 pointer (up to the max)",
    "Giving a clue spends 1 pointer",
  ];

  if (rules.openHand) {
    lines.push("Open-hand mode: you can see your own cards");
  }
  if (rules.ranked) {
    lines.push("Undo action disabled");
  }

  return lines;
}

export type ColorRulesSummary = {
  colorId: string;
  displayName: string;
  displayColor: string;
  presetLabel: string | null;
  lines: string[];
};

export function buildRulesSummary(rules: GameRules): {
  global: string[];
  colors: ColorRulesSummary[];
} {
  return {
    global: describeGlobalRules(rules),
    colors: rules.colors.map((color) => ({
      colorId: color.id,
      displayName: color.displayName,
      displayColor: color.displayColor,
      presetLabel: getColorPresetLabel(color.id),
      lines: describeColorRules(color, rules.colors),
    })),
  };
}
