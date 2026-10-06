import type { CardTurnInfo, ColorConfig, GameEvent, PlayerInfo } from "./types.js";
import type { HistoryLine, TurnRecord } from "./protocol.js";
import { formatGameEvent, isDisplayableHistoryEvent } from "./history-format.js";

function allEvents(turnHistory: TurnRecord[]): GameEvent[] {
  return turnHistory.flatMap((record) => record.events);
}

function setCardMeta(
  map: Map<string, CardTurnInfo>,
  cardId: string,
  patch: Partial<CardTurnInfo>,
): void {
  const existing = map.get(cardId) ?? {};
  map.set(cardId, { ...existing, ...patch });
}

/** Reconstruct per-card turn metadata by walking the event log in order. */
export function buildCardTurnMetadata(
  turnHistory: TurnRecord[],
): Record<string, CardTurnInfo> {
  const meta = new Map<string, CardTurnInfo>();
  let activeTurn = 1;
  let drawTurn = 1;

  for (const event of allEvents(turnHistory)) {
    switch (event.type) {
      case "TURN_STARTED":
        activeTurn = event.turnNumber;
        break;
      case "CARD_PLAYED":
        setCardMeta(meta, event.card.id, { playedTurn: activeTurn });
        break;
      case "CARD_DISCARDED":
        setCardMeta(meta, event.card.id, {
          discardedTurn: activeTurn,
          misplay: event.misplay,
        });
        break;
      case "TURN_ENDED":
        drawTurn = event.turnNumber;
        break;
      case "CARDS_DRAWN":
        for (const cardId of event.cardIds) {
          setCardMeta(meta, cardId, { drawnTurn: drawTurn });
        }
        break;
      default:
        break;
    }
  }

  return Object.fromEntries(meta);
}

/** Lookup played turn by color and number (at most one of each on the pile). */
export function buildPlayedTurnLookup(
  turnHistory: TurnRecord[],
): Record<string, number> {
  const lookup: Record<string, number> = {};
  let activeTurn = 1;

  for (const event of allEvents(turnHistory)) {
    if (event.type === "TURN_STARTED") {
      activeTurn = event.turnNumber;
    } else if (event.type === "CARD_PLAYED") {
      lookup[`${event.card.colorId}:${event.card.number}`] = activeTurn;
    }
  }

  return lookup;
}

export function buildHistoryLines(
  turnHistory: TurnRecord[],
  players: PlayerInfo[],
  colors: ColorConfig[],
): HistoryLine[] {
  let activeTurn = 1;
  let index = 0;
  const lines: HistoryLine[] = [];

  for (const event of allEvents(turnHistory)) {
    if (event.type === "TURN_STARTED") {
      activeTurn = event.turnNumber;
    }
    if (!isDisplayableHistoryEvent(event)) {
      continue;
    }
    const summary = formatGameEvent(event, players, colors);
    if (summary) {
      lines.push({ index: index++, turnNumber: activeTurn, summary });
    }
  }

  return lines;
}

export function cardDrawTooltip(info: CardTurnInfo | undefined): string {
  if (info?.drawnTurn !== undefined) {
    return `Drawn on turn ${info.drawnTurn}`;
  }
  return "Opening hand (dealt at game start)";
}

export function cardDiscardTooltip(info: CardTurnInfo | undefined): string {
  if (!info?.discardedTurn) {
    return "Discarded";
  }
  const base = `Discarded on turn ${info.discardedTurn}`;
  return info.misplay ? `${base} (misplay)` : base;
}

export function cardPlayedTooltip(turn: number | undefined): string {
  return turn !== undefined ? `Played on turn ${turn}` : "Played";
}
