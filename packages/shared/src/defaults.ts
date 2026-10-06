import type { ColorConfig, GameRules } from "./types.js";

export const STANDARD_NUMBERS: { value: number; count: number }[] = [
  { value: 1, count: 3 },
  { value: 2, count: 2 },
  { value: 3, count: 2 },
  { value: 4, count: 2 },
  { value: 5, count: 1 },
];

export const STANDARD_COLOR_NAMES = [
  { id: "red", displayName: "Red", displayColor: "#e74c3c" },
  { id: "yellow", displayName: "Yellow", displayColor: "#f1c40f" },
  { id: "green", displayName: "Green", displayColor: "#2ecc71" },
  { id: "blue", displayName: "Blue", displayColor: "#3498db" },
  { id: "white", displayName: "White", displayColor: "#cbd5e0" },
] as const;

export const STANDARD_EFFECTS = {
  onPlay: ["PLAY_TO_PILE"] as const,
  onDiscard: ["DISCARD", "GAIN_POINTER"] as const,
  onMisplay: ["DISCARD", "STUMBLE"] as const,
};

export function createStandardColor(
  id: string,
  displayName: string,
  displayColor: string,
): ColorConfig {
  return {
    id,
    displayName,
    displayColor,
    numbers: STANDARD_NUMBERS.map((n) => ({ ...n })),
    playability: { type: "standard" },
    onPlay: [...STANDARD_EFFECTS.onPlay],
    onDiscard: [...STANDARD_EFFECTS.onDiscard],
    onMisplay: [...STANDARD_EFFECTS.onMisplay],
    clueMatching: { type: "standard" },
    canBeClued: true,
  };
}

export function createStandardColors(): ColorConfig[] {
  return STANDARD_COLOR_NAMES.map((c) =>
    createStandardColor(c.id, c.displayName, c.displayColor),
  );
}

export function createStandardRules(overrides: Partial<GameRules> = {}): GameRules {
  return {
    colors: createStandardColors(),
    maxPointers: 8,
    maxStumbles: 3,
    handSize: 5,
    actionsPerTurn: 1,
    openHand: false,
    ranked: false,
    ...overrides,
  };
}
