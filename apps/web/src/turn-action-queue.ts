import type { ColorConfig, GameEvent, PlayerInfo, TurnRecord } from "@blind-guides/shared";
import { formatClue } from "@blind-guides/shared";

export type TurnAnimationStep =
  | {
      type: "card_action";
      playerName: string;
      verb: "played" | "discarded" | "misplayed";
      card: { id: string; colorId: string; number: number };
      slotLabel: string;
      colorDisplayName: string;
      colorHex: string;
      destination: "played" | "discard";
    }
  | { type: "pointer_gained"; amount: number }
  | { type: "pointer_spent"; amount: number }
  | { type: "stumbled"; amount: number }
  | { type: "cards_drawn"; playerName: string; count: number }
  | { type: "clue"; fromName: string; toName: string; clueText: string };

function playerName(players: PlayerInfo[], id: string): string {
  return players.find((p) => p.id === id)?.displayName ?? "Unknown";
}

function colorMeta(colors: ColorConfig[], colorId: string) {
  const color = colors.find((c) => c.id === colorId);
  return {
    displayName: color?.displayName ?? colorId,
    hex: color?.displayColor ?? "#2d3748",
  };
}

export function eventsToAnimationSteps(
  events: GameEvent[],
  players: PlayerInfo[],
  colors: ColorConfig[],
): TurnAnimationStep[] {
  const steps: TurnAnimationStep[] = [];

  for (const event of events) {
    switch (event.type) {
      case "CARD_PLAYED": {
        const meta = colorMeta(colors, event.card.colorId);
        steps.push({
          type: "card_action",
          playerName: playerName(players, event.playerId),
          verb: "played",
          card: event.card,
          slotLabel: event.slotLabel,
          colorDisplayName: meta.displayName,
          colorHex: meta.hex,
          destination: "played",
        });
        break;
      }
      case "CARD_DISCARDED": {
        const meta = colorMeta(colors, event.card.colorId);
        steps.push({
          type: "card_action",
          playerName: playerName(players, event.playerId),
          verb: event.misplay ? "misplayed" : "discarded",
          card: event.card,
          slotLabel: event.slotLabel,
          colorDisplayName: meta.displayName,
          colorHex: meta.hex,
          destination: "discard",
        });
        break;
      }
      case "POINTER_GAINED":
        steps.push({ type: "pointer_gained", amount: event.amount });
        break;
      case "POINTER_SPENT":
        steps.push({ type: "pointer_spent", amount: event.amount });
        break;
      case "STUMBLED":
        steps.push({ type: "stumbled", amount: event.amount });
        break;
      case "CARDS_DRAWN":
        steps.push({
          type: "cards_drawn",
          playerName: playerName(players, event.playerId),
          count: event.cardIds.length,
        });
        break;
      case "CLUE_GIVEN":
        steps.push({
          type: "clue",
          fromName: playerName(players, event.fromPlayerId),
          toName: playerName(players, event.toPlayerId),
          clueText: formatClue(event.clue, colors),
        });
        break;
      default:
        break;
    }
  }

  return steps;
}

export function newHistoryAnimationSteps(
  prevLength: number,
  turnHistory: TurnRecord[],
  players: PlayerInfo[],
  colors: ColorConfig[],
): TurnAnimationStep[] {
  if (turnHistory.length <= prevLength) {
    return [];
  }
  return turnHistory
    .slice(prevLength)
    .flatMap((record) => eventsToAnimationSteps(record.events, players, colors));
}
