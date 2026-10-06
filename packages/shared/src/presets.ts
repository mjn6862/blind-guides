import type { ColorConfig, GameRules } from "./types.js";
import {
  createStandardColor,
  createStandardRules,
  STANDARD_EFFECTS,
  STANDARD_NUMBERS,
} from "./defaults.js";

export type ColorPresetId =
  | "rainbow"
  | "backpedal"
  | "ghost"
  | "opposite_day"
  | "gas_guzzler"
  | "rainno"
  | "ghostno";

export type ColorPreset = {
  id: ColorPresetId;
  name: string;
  description: string;
  config: ColorConfig;
};

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: "rainbow",
    name: "Rainbow",
    description: "Cannot be clued; matches all color clues and number clues by value",
    config: {
      id: "rainbow",
      displayName: "Rainbow",
      displayColor: "#9b59b6",
      numbers: STANDARD_NUMBERS.map((n) => ({ ...n })),
      playability: { type: "standard" },
      onPlay: [...STANDARD_EFFECTS.onPlay],
      onDiscard: [...STANDARD_EFFECTS.onDiscard],
      onMisplay: [...STANDARD_EFFECTS.onMisplay],
      clueMatching: { type: "every_color" },
      canBeClued: false,
    },
  },
  {
    id: "backpedal",
    name: "Backpedal",
    description: "Reverse play order; 1×1, 2×2, 3×2, 4×2, 5×3",
    config: {
      id: "backpedal",
      displayName: "Black",
      displayColor: "#1a1a2e",
      numbers: [
        { value: 1, count: 1 },
        { value: 2, count: 2 },
        { value: 3, count: 2 },
        { value: 4, count: 2 },
        { value: 5, count: 3 },
      ],
      playability: { type: "reverse" },
      onPlay: [...STANDARD_EFFECTS.onPlay],
      onDiscard: [...STANDARD_EFFECTS.onDiscard],
      onMisplay: [...STANDARD_EFFECTS.onMisplay],
      clueMatching: { type: "standard" },
      canBeClued: true,
    },
  },
  {
    id: "ghost",
    name: "Ghost",
    description: "Cannot be clued; otherwise standard",
    config: {
      id: "ghost",
      displayName: "Gray",
      displayColor: "#95a5a6",
      numbers: STANDARD_NUMBERS.map((n) => ({ ...n })),
      playability: { type: "standard" },
      onPlay: [...STANDARD_EFFECTS.onPlay],
      onDiscard: [...STANDARD_EFFECTS.onDiscard],
      onMisplay: [...STANDARD_EFFECTS.onMisplay],
      clueMatching: { type: "standard" },
      canBeClued: false,
    },
  },
  {
    id: "opposite_day",
    name: "Opposite Day",
    description: "Misplay gains a pointer; discard is a stumble",
    config: {
      id: "opposite_day",
      displayName: "Pink",
      displayColor: "#fd79a8",
      numbers: STANDARD_NUMBERS.map((n) => ({ ...n })),
      playability: { type: "standard" },
      onPlay: [...STANDARD_EFFECTS.onPlay],
      onDiscard: ["DISCARD", "STUMBLE"],
      onMisplay: ["DISCARD", "GAIN_POINTER"],
      clueMatching: { type: "standard" },
      canBeClued: true,
    },
  },
  {
    id: "gas_guzzler",
    name: "Gas Guzzler",
    description: "Discard may gain a pointer if that number isn't on the played pile yet",
    config: {
      id: "gas_guzzler",
      displayName: "Forest Green",
      displayColor: "#228b22",
      numbers: STANDARD_NUMBERS.map((n) => ({ ...n })),
      playability: { type: "standard" },
      onPlay: [...STANDARD_EFFECTS.onPlay],
      onDiscard: ["DISCARD", "GAIN_POINTER_IF_SAME_NUMBER_NOT_PLAYED"],
      onMisplay: [...STANDARD_EFFECTS.onMisplay],
      clueMatching: { type: "standard" },
      canBeClued: true,
    },
  },
  {
    id: "rainno",
    name: "RainNo",
    description:
      "Every card matches only a 5 clue; each rank matches its own set of color clues",
    config: {
      id: "rainno",
      displayName: "Orange",
      displayColor: "#e67e22",
      numbers: STANDARD_NUMBERS.map((n) => ({ ...n })),
      playability: { type: "standard" },
      onPlay: [...STANDARD_EFFECTS.onPlay],
      onDiscard: [...STANDARD_EFFECTS.onDiscard],
      onMisplay: [...STANDARD_EFFECTS.onMisplay],
      clueMatching: {
        type: "by_rank",
        numberMatch: 5,
        colorsByRank: {
          1: { mode: "only", colorIds: ["rainno", "gas_guzzler", "green"] },
          2: { mode: "only", colorIds: ["rainno", "opposite_day", "red"] },
          3: { mode: "only", colorIds: ["rainno"] },
          4: { mode: "all_except", colorIds: ["rainno"] },
          5: { mode: "only", colorIds: ["rainno", "backpedal", "blue"] },
        },
      },
      canBeClued: true,
    },
  },
  {
    id: "ghostno",
    name: "GhostNo",
    description:
      "Every card matches no numbers at all; each rank matches its own set of color clues",
    config: {
      id: "ghostno",
      displayName: "Sky Blue",
      displayColor: "#87ceeb",
      numbers: STANDARD_NUMBERS.map((n) => ({ ...n })),
      playability: { type: "standard" },
      onPlay: [...STANDARD_EFFECTS.onPlay],
      onDiscard: [...STANDARD_EFFECTS.onDiscard],
      onMisplay: [...STANDARD_EFFECTS.onMisplay],
      clueMatching: {
        type: "by_rank",
        numberMatch: null,
        colorsByRank: {
          1: { mode: "only", colorIds: ["ghostno", "gas_guzzler", "green"] },
          2: { mode: "only", colorIds: ["ghostno", "opposite_day", "red"] },
          3: { mode: "only", colorIds: ["ghostno"] },
          4: { mode: "all_except", colorIds: ["ghostno"] },
          5: { mode: "only", colorIds: ["ghostno", "backpedal", "blue"] },
        },
      },
      canBeClued: true,
    },
  },
];

export function getColorPreset(id: ColorPresetId): ColorPreset {
  const preset = COLOR_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown preset: ${id}`);
  return preset;
}

export function cloneColorConfig(color: ColorConfig): ColorConfig {
  return {
    ...color,
    numbers: color.numbers.map((n) => ({ ...n })),
    onPlay: [...color.onPlay],
    onDiscard: [...color.onDiscard],
    onMisplay: [...color.onMisplay],
    clueMatching: cloneClueMatching(color.clueMatching),
  };
}

function cloneClueMatching(clueMatching: ColorConfig["clueMatching"]): ColorConfig["clueMatching"] {
  if (clueMatching.type === "specific_colors") {
    return { ...clueMatching, colorIds: [...clueMatching.colorIds] };
  }
  if (clueMatching.type === "by_rank") {
    return {
      ...clueMatching,
      colorsByRank: Object.fromEntries(
        Object.entries(clueMatching.colorsByRank).map(([rank, rule]) => [
          rank,
          { ...rule!, colorIds: [...rule!.colorIds] },
        ]),
      ),
    };
  }
  return { ...clueMatching };
}

export function buildDefaultLobbyRules(): GameRules {
  return createStandardRules();
}

export const STANDARD_COLOR_IDS = ["red", "yellow", "green", "blue", "white"] as const;

export function buildColorsFromSelection(
  standardIds: string[],
  presetIds: ColorPresetId[],
  presetDisplayColors?: Partial<Record<ColorPresetId, string>>,
): ColorConfig[] {
  const colors: ColorConfig[] = [];
  for (const id of standardIds) {
    const std = createStandardColor(
      id,
      id.charAt(0).toUpperCase() + id.slice(1),
      id === "white" ? "#cbd5e0" : getStandardDisplayColor(id),
    );
    colors.push(cloneColorConfig(std));
  }
  for (const presetId of presetIds) {
    const config = cloneColorConfig(getColorPreset(presetId).config);
    const customColor = presetDisplayColors?.[presetId];
    if (customColor) {
      config.displayColor = customColor;
    }
    colors.push(config);
  }
  return colors;
}

function getStandardDisplayColor(id: string): string {
  const map: Record<string, string> = {
    red: "#e74c3c",
    yellow: "#f1c40f",
    green: "#2ecc71",
    blue: "#3498db",
    white: "#cbd5e0",
  };
  return map[id] ?? "#718096";
}
