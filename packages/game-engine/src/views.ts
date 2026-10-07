import type {
  CardView,
  HistoryLine,
  PlayerGameView,
  TurnHistorySnapshot,
  TurnRecord,
} from "@blind-guides/shared";
import {
  buildAllHandClueHistories,
  buildCardTurnMetadata,
  buildHistoryLines,
  buildPlayedTurnLookup,
  buildRecentTurnSummaries,
  findLatestClueMatchedIds,
  slotLabel,
} from "@blind-guides/shared";
import type { GameState } from "@blind-guides/shared";
import { getCurrentPlayer } from "./state.js";

export type BuildViewOptions = {
  gameId: string;
  inviteCode: string;
  viewerId: string;
  hostId: string;
  status: "lobby" | "playing" | "finished";
  turnHistory: TurnRecord[];
  privateNotes: string;
};

function toCardView(
  state: GameState,
  cardId: string,
  slotIndex: number,
  hidden: boolean,
  highlighted: boolean,
): CardView {
  const label = slotLabel(slotIndex);
  if (hidden) {
    return { id: cardId, hidden: true, slotLabel: label, highlighted };
  }
  const card = state.cardById[cardId]!;
  return {
    id: card.id,
    colorId: card.colorId,
    number: card.number,
    slotLabel: label,
    highlighted,
  };
}

function slotsToCardViews(
  state: GameState,
  slots: (string | null)[],
  hidden: boolean,
  highlightIds: Set<string>,
): CardView[] {
  return slots.map((cardId, slotIndex) => {
    const label = slotLabel(slotIndex);
    if (cardId === null) {
      return { empty: true, slotIndex, slotLabel: label };
    }
    return toCardView(state, cardId, slotIndex, hidden, highlightIds.has(cardId));
  });
}

export function buildPlayerView(
  state: GameState,
  options: BuildViewOptions,
): PlayerGameView {
  const current =
    state.phase === "playing" ? getCurrentPlayer(state) : null;

  const highlightIds = new Set(findLatestClueMatchedIds(options.turnHistory));

  const showOwnCards = state.rules.openHand;
  const yourSlots = state.hands[options.viewerId] ?? [];

  const yourHand = slotsToCardViews(
    state,
    yourSlots,
    !showOwnCards,
    highlightIds,
  );

  const otherHands: Record<string, CardView[]> = {};
  for (const player of state.players) {
    if (player.id === options.viewerId) continue;
    const slots = state.hands[player.id] ?? [];
    otherHands[player.id] = slotsToCardViews(state, slots, false, highlightIds);
  }

  const recentTurns = buildRecentTurnSummaries(
    options.turnHistory,
    state.players,
    state.rules.colors,
    current?.id ?? null,
  );

  const historyLines: HistoryLine[] = buildHistoryLines(
    options.turnHistory,
    state.players,
    state.rules.colors,
  );

  const cardTurns = buildCardTurnMetadata(options.turnHistory);
  const playedTurns = buildPlayedTurnLookup(options.turnHistory);
  const handClueHistories = buildAllHandClueHistories(
    options.turnHistory,
    state,
    state.rules.colors,
  );

  const turnOrder = state.players.map((player, index) => ({
    playerId: player.id,
    displayName: player.displayName,
    position: index + 1,
  }));

  return {
    gameId: options.gameId,
    inviteCode: options.inviteCode,
    playerId: options.viewerId,
    isHost: options.viewerId === options.hostId,
    isYourTurn: current?.id === options.viewerId,
    status: options.status,
    rules: state.rules,
    players: state.players,
    currentPlayerId: current?.id ?? null,
    currentPlayerName: current?.displayName ?? null,
    actionsRemaining: state.actionsRemainingThisTurn,
    yourHand,
    otherHands,
    played: state.played,
    discard: state.discard.map((c) => ({
      id: c.id,
      colorId: c.colorId,
      number: c.number,
    })),
    deckCount: state.deck.length,
    pointers: state.pointers,
    stumbles: state.stumbles,
    phase: state.phase,
    lossReason: state.lossReason,
    turnNumber: state.turnNumber,
    paused: state.paused,
    turnHistory: options.turnHistory.map((record) => ({
      index: record.index,
      turnNumber: record.turnNumber,
      events: record.events,
    })),
    historyLines,
    recentTurns,
    turnOrder,
    cardTurns,
    playedTurns,
    handClueHistories,
    privateNotes: options.privateNotes,
    canUndo:
      !state.rules.ranked &&
      options.status !== "lobby" &&
      options.turnHistory.length > 1,
  };
}

export function buildHistorySnapshot(
  turnHistory: TurnRecord[],
  recordIndex: number,
  viewerId: string,
  gameFinished: boolean,
): TurnHistorySnapshot | null {
  const record = turnHistory[recordIndex];
  if (!record?.state) return null;

  const snapshotState = record.state;
  const prefix = turnHistory.slice(0, recordIndex + 1);
  const current =
    snapshotState.phase === "playing" ? getCurrentPlayer(snapshotState) : null;

  const showOwnCards = snapshotState.rules.openHand || gameFinished;
  const hands: Record<string, CardView[]> = {};
  for (const player of snapshotState.players) {
    const slots = snapshotState.hands[player.id] ?? [];
    const hidden = player.id === viewerId && !showOwnCards;
    hands[player.id] = slotsToCardViews(snapshotState, slots, hidden, new Set());
  }

  const handClueHistories = buildAllHandClueHistories(
    prefix,
    snapshotState,
    snapshotState.rules.colors,
  );
  const cardTurns = buildCardTurnMetadata(prefix);
  const playedTurns = buildPlayedTurnLookup(prefix);

  const turnOrder = snapshotState.players.map((player, index) => ({
    playerId: player.id,
    displayName: player.displayName,
    position: index + 1,
  }));

  return {
    index: record.index,
    turnNumber: record.turnNumber,
    pointers: snapshotState.pointers,
    stumbles: snapshotState.stumbles,
    deckCount: snapshotState.deck.length,
    played: snapshotState.played,
    discard: snapshotState.discard.map((c) => ({
      id: c.id,
      colorId: c.colorId,
      number: c.number,
    })),
    hands,
    handClueHistories,
    cardTurns,
    playedTurns,
    currentPlayerId: current?.id ?? null,
    phase: snapshotState.phase,
    turnOrder,
    events: record.events,
  };
}
