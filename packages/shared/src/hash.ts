import type { GameRules } from "./types.js";

/** Canonical JSON string for stable rule-set hashing. */
export function canonicalizeRules(rules: GameRules): string {
  const sorted = {
    ...rules,
    colors: [...rules.colors]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((color) => ({
        ...color,
        numbers: [...color.numbers].sort((a, b) => a.value - b.value),
        onPlay: [...color.onPlay].sort(),
        onDiscard: [...color.onDiscard].sort(),
        onMisplay: [...color.onMisplay].sort(),
        clueMatching:
          color.clueMatching.type === "specific_colors"
            ? {
                ...color.clueMatching,
                colorIds: [...color.clueMatching.colorIds].sort(),
              }
            : color.clueMatching,
      })),
  };
  return JSON.stringify(sorted);
}

/** Simple djb2 hash — sufficient for stats grouping at our scale. */
export function hashRules(rules: GameRules): string {
  const str = canonicalizeRules(rules);
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
