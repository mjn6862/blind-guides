import type {
  Clue,
  ColorConfig,
  GameEvent,
  PlayerInfo,
  RecentTurnEntry,
} from "./types.js";
import type { TurnRecord } from "./protocol.js";
import { formatSlotList, slotLabel } from "./slots.js";

function playerName(players: PlayerInfo[], id: string): string {
  return players.find((p) => p.id === id)?.displayName ?? "Unknown";
}

function colorName(colors: ColorConfig[], colorId: string): string {
  return colors.find((c) => c.id === colorId)?.displayName ?? colorId;
}

function formatCardDescription(
  card: { colorId: string; number: number },
  colors: ColorConfig[],
): string {
  return `a ${colorName(colors, card.colorId)} ${card.number}`;
}

export function formatClue(clue: Clue, colors: ColorConfig[]): string {
  if (clue.kind === "color") {
    return colorName(colors, clue.colorId);
  }
  return String(clue.number);
}

function formatClueEvent(
  event: Extract<GameEvent, { type: "CLUE_GIVEN" }>,
  players: PlayerInfo[],
  colors: ColorConfig[],
): string {
  const from = playerName(players, event.fromPlayerId);
  const to = playerName(players, event.toPlayerId);
  const clueText = formatClue(event.clue, colors);
  const slots =
    event.matchedSlotLabels.length > 0
      ? formatSlotList(event.matchedSlotLabels)
      : formatSlotList(event.matchedCardIds.map((_, i) => slotLabel(i)));
  return `${from} → ${to}: ${clueText} - ${slots.charAt(0).toUpperCase() + slots.slice(1)} matched`;
}

export function isDisplayableHistoryEvent(event: GameEvent): boolean {
  return event.type !== "TURN_STARTED" && event.type !== "TURN_ENDED";
}

export function formatGameEvent(
  event: GameEvent,
  players: PlayerInfo[],
  colors: ColorConfig[],
): string {
  switch (event.type) {
    case "CARD_PLAYED": {
      const who = playerName(players, event.playerId);
      const cardDesc = formatCardDescription(event.card, colors);
      if (event.slotLabel) {
        return `${who} played card ${event.slotLabel}, ${cardDesc}`;
      }
      return `${who} played ${cardDesc}`;
    }
    case "CARD_DISCARDED": {
      const who = playerName(players, event.playerId);
      const cardDesc = formatCardDescription(event.card, colors);
      const verb = event.misplay ? "misplayed" : "discarded";
      if (event.slotLabel) {
        return `${who} ${verb} card ${event.slotLabel}, ${cardDesc}`;
      }
      return `${who} ${verb} ${cardDesc}`;
    }
    case "CLUE_GIVEN":
      return formatClueEvent(event, players, colors);
    case "POINTER_GAINED":
      return `Gained ${event.amount} pointer${event.amount === 1 ? "" : "s"}`;
    case "POINTER_SPENT":
      return `Spent ${event.amount} pointer${event.amount === 1 ? "" : "s"}`;
    case "STUMBLED":
      return event.amount === 1 ? "Stumbled" : `Stumbled ${event.amount} times`;
    case "CARDS_DRAWN": {
      const who = playerName(players, event.playerId);
      return `${who} drew ${event.cardIds.length} card${event.cardIds.length === 1 ? "" : "s"}`;
    }
    case "TURN_ENDED":
    case "TURN_STARTED":
      return "";
    case "GAME_WON":
      return "Team won!";
    case "GAME_LOST":
      return `Team lost: ${event.reason}`;
    case "IMPOSSIBILITY_DETECTED":
      return `Impossible to win: ${event.reason}`;
    case "GAME_PAUSED": {
      const who = playerName(players, event.playerId);
      return `${who} paused the game`;
    }
    case "GAME_RESUMED": {
      const who = playerName(players, event.playerId);
      return `${who} resumed the game`;
    }
    default:
      return "Unknown event";
  }
}

const TURN_EVENT_TYPES = new Set([
  "CARD_PLAYED",
  "CARD_DISCARDED",
  "CLUE_GIVEN",
  "POINTER_GAINED",
  "POINTER_SPENT",
  "STUMBLED",
  "CARDS_DRAWN",
]);

function isTurnEvent(event: GameEvent): boolean {
  return TURN_EVENT_TYPES.has(event.type);
}

type TurnBlock = {
  playerId: string;
  events: GameEvent[];
  inProgress: boolean;
  order: number;
};

/** One entry per player (their latest turn), sorted most-recent turn first. */
export function buildRecentTurnSummaries(
  turnHistory: TurnRecord[],
  players: PlayerInfo[],
  colors: ColorConfig[],
  currentPlayerId: string | null,
): RecentTurnEntry[] {
  const lastTurnByPlayer = new Map<string, TurnBlock>();
  let current: TurnBlock | null = null;
  let turnOrder = 0;

  const allEvents = turnHistory.flatMap((r) => r.events);

  for (const event of allEvents) {
    if (event.type === "TURN_STARTED") {
      current = { playerId: event.playerId, events: [], inProgress: true, order: 0 };
    } else if (event.type === "TURN_ENDED") {
      if (current && current.playerId === event.playerId) {
        current.inProgress = false;
        current.order = turnOrder++;
        if (current.events.length > 0) {
          lastTurnByPlayer.set(event.playerId, current);
        }
      }
      current = null;
    } else if (isTurnEvent(event) && current) {
      current.events.push(event);
    }
  }

  if (current && current.events.length > 0) {
    lastTurnByPlayer.set(current.playerId, {
      ...current,
      inProgress: currentPlayerId === current.playerId,
      order: turnOrder,
    });
  }

  return Array.from(lastTurnByPlayer.values())
    .sort((a, b) => b.order - a.order)
    .map((turn) => ({
      playerId: turn.playerId,
      playerName: playerName(players, turn.playerId),
      lines: turn.events
        .map((e) => formatGameEvent(e, players, colors))
        .filter((line) => line.length > 0),
      isInProgress: turn.inProgress,
    }));
}

export function findLatestClueMatchedIds(
  turnHistory: TurnRecord[],
): string[] {
  for (let i = turnHistory.length - 1; i >= 0; i--) {
    for (let j = turnHistory[i]!.events.length - 1; j >= 0; j--) {
      const event = turnHistory[i]!.events[j]!;
      if (event.type === "CLUE_GIVEN") {
        return event.matchedCardIds;
      }
    }
  }
  return [];
}
