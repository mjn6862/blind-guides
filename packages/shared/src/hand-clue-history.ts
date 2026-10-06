import type { Clue, ColorConfig, GameState, CardClueHistory } from "./types.js";
import type { TurnRecord } from "./protocol.js";
import { formatClue } from "./history-format.js";

/** Normalize clues from JSON (number may arrive as string). */
export function normalizeClue(clue: Clue): Clue {
  if (clue.kind === "number") {
    const n =
      typeof clue.number === "string" ? Number(clue.number) : clue.number;
    return { kind: "number", number: n };
  }
  return clue;
}

/** Keep first occurrence of each clue label. */
export function uniqueClueLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const label of labels) {
    if (!seen.has(label)) {
      seen.add(label);
      unique.push(label);
    }
  }
  return unique;
}

/**
 * For each card currently in a player's hand, list clues given to that player
 * that matched or failed to match that card (while it was in hand).
 */
export function buildHandClueHistory(
  turnHistory: TurnRecord[],
  playerId: string,
  currentHandCardIds: string[],
  colors: ColorConfig[],
): Record<string, CardClueHistory> {
  const currentIds = new Set(currentHandCardIds);
  const history: Record<string, CardClueHistory> = {};

  for (const cardId of currentHandCardIds) {
    history[cardId] = { matched: [], failed: [] };
  }

  let stateBefore: GameState | null = null;

  for (const record of turnHistory) {
    for (const event of record.events) {
      if (
        event.type === "CLUE_GIVEN" &&
        event.toPlayerId === playerId &&
        stateBefore
      ) {
        const handIds = (stateBefore.hands[playerId] ?? []).filter(
          (id): id is string => id !== null,
        );
        const clueLabel = formatClue(normalizeClue(event.clue), colors);

        for (const cardId of currentIds) {
          if (!handIds.includes(cardId)) {
            continue;
          }
          const entry = history[cardId];
          if (!entry) {
            continue;
          }
          if (event.matchedCardIds.includes(cardId)) {
            entry.matched.push(clueLabel);
          } else {
            entry.failed.push(clueLabel);
          }
        }
      }
    }
    stateBefore = record.state ?? stateBefore;
  }

  for (const entry of Object.values(history)) {
    entry.matched = uniqueClueLabels(entry.matched);
    entry.failed = uniqueClueLabels(entry.failed);
  }

  return history;
}

export function buildAllHandClueHistories(
  turnHistory: TurnRecord[],
  state: GameState,
  colors: ColorConfig[],
): Record<string, Record<string, CardClueHistory>> {
  const byPlayer: Record<string, Record<string, CardClueHistory>> = {};

  for (const player of state.players) {
    const handIds = (state.hands[player.id] ?? []).filter(
      (id): id is string => id !== null,
    );
    byPlayer[player.id] = buildHandClueHistory(
      turnHistory,
      player.id,
      handIds,
      colors,
    );
  }

  return byPlayer;
}
