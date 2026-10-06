import { describe, expect, it } from "vitest";
import {
  createStandardColor,
  createStandardRules,
  type CardInstance,
  type GameState,
} from "@blind-guides/shared";
import { applyAction } from "./actions.js";
import { isPlayable } from "./playability.js";
import { createInitialState, getCurrentPlayer } from "./state.js";
import { createRng } from "./test-utils.js";

const players = [
  { id: "p1", displayName: "Alice" },
  { id: "p2", displayName: "Bob" },
  { id: "p3", displayName: "Carol" },
];

function startGame(seed = 42) {
  return createInitialState({
    rules: createStandardRules(),
    players,
    seedRng: createRng(seed),
  });
}

function cardInHand(
  state: GameState,
  playerId: string,
  predicate: (c: CardInstance) => boolean,
): string {
  const hand = state.hands[playerId] ?? [];
  for (const id of hand) {
    if (id === null) continue;
    const card = state.cardById[id]!;
    if (predicate(card)) return id;
  }
  throw new Error(`No matching card in ${playerId}'s hand`);
}

function findCard(predicate: (c: CardInstance) => boolean): (state: GameState) => CardInstance {
  return (state) => {
    for (const card of Object.values(state.cardById)) {
      if (predicate(card)) return card;
    }
    throw new Error("No matching card in deck");
  };
}

describe("createInitialState", () => {
  it("deals hands and starts with full pointers and no stumbles", () => {
    const state = startGame();
    expect(state.phase).toBe("playing");
    expect(state.pointers).toBe(8);
    expect(state.stumbles).toBe(0);
    expect(state.players).toHaveLength(3);
    for (const player of players) {
      expect(state.hands[player.id]).toHaveLength(5);
    }
  });

  it("rejects invalid player counts", () => {
    expect(() =>
      createInitialState({
        rules: createStandardRules(),
        players: [{ id: "solo", displayName: "Solo" }],
      }),
    ).toThrow(/2–10 players/);
  });

  it("uses player array order for first player", () => {
    const reversed = [...players].reverse();
    const state = createInitialState({
      rules: createStandardRules(),
      players: reversed,
      seedRng: createRng(1),
    });
    expect(state.players[0]!.id).toBe("p3");
    expect(getCurrentPlayer(state).id).toBe("p3");
  });
});

describe("playability", () => {
  it("requires lower numbers first (standard)", () => {
    const state = startGame();
    const card = findCard((c) => c.colorId === "red" && c.number === 2)(state);
    expect(isPlayable(state, card)).toBe(false);

    const next = {
      ...state,
      played: { ...state.played, red: [1] },
    };
    expect(isPlayable(next, card)).toBe(true);
  });

  it("supports any_order preset", () => {
    const rules = createStandardRules({
      colors: [
        createStandardColor("red", "Red", "#e74c3c"),
      ].map((c) => ({ ...c, playability: { type: "any_order" as const } })),
    });
    const state = createInitialState({
      rules,
      players: players.slice(0, 2),
      seedRng: createRng(1),
    });
    const five = findCard((c) => c.colorId === "red" && c.number === 5)(state);
    expect(isPlayable(state, five)).toBe(true);
  });
});

describe("applyAction", () => {
  it("plays a legal card onto the pile", () => {
    const state = startGame();
    const current = state.players[state.currentPlayerIndex]!;
    const cardId = cardInHand(state, current.id, (c) => isPlayable(state, c));

    const result = applyAction(state, {
      type: "PLAY_CARD",
      playerId: current.id,
      cardId,
    });

    expect(result.error).toBeUndefined();
    expect(result.events.some((e) => e.type === "CARD_PLAYED")).toBe(true);
    const played = result.events.find((e) => e.type === "CARD_PLAYED");
    expect(played?.type === "CARD_PLAYED" && result.state.played[played.card.colorId]).toContain(
      played.card.number,
    );
    expect(result.state.hands[current.id]).not.toContain(cardId);
  });

  it("misplay discards and adds a stumble", () => {
    const state = startGame();
    const current = state.players[state.currentPlayerIndex]!;
    const cardId = cardInHand(
      state,
      current.id,
      (c) => !isPlayable(state, c),
    );

    const result = applyAction(state, {
      type: "PLAY_CARD",
      playerId: current.id,
      cardId,
    });

    expect(result.error).toBeUndefined();
    expect(result.events.some((e) => e.type === "CARD_DISCARDED")).toBe(true);
    expect(result.events.some((e) => e.type === "STUMBLED")).toBe(true);
    expect(result.state.stumbles).toBe(1);
  });

  it("discard gains a pointer", () => {
    const state = startGame();
    state.pointers = 5;
    const anyCard = state.hands.p1[0]!;

    const result = applyAction(
      { ...state, pointers: 5 },
      { type: "DISCARD_CARD", playerId: "p1", cardId: anyCard },
    );

    expect(result.state.pointers).toBe(6);
    expect(result.events.some((e) => e.type === "POINTER_GAINED")).toBe(true);
  });

  it("rejects clues that match no cards", () => {
    const state = startGame();
    const result = applyAction(state, {
      type: "GIVE_CLUE",
      playerId: "p1",
      targetPlayerId: "p2",
      clue: { kind: "number", number: 99 },
    });
    expect(result.error).toMatch(/at least one card/);
  });

  it("gives a valid clue and spends a pointer", () => {
    const state = startGame();
    const p2Hand = state.hands.p2!.map((id) => state.cardById[id]!);
    const targetNumber = p2Hand[0]!.number;

    const result = applyAction(state, {
      type: "GIVE_CLUE",
      playerId: "p1",
      targetPlayerId: "p2",
      clue: { kind: "number", number: targetNumber },
    });

    expect(result.error).toBeUndefined();
    expect(result.state.pointers).toBe(7);
    expect(result.events.some((e) => e.type === "CLUE_GIVEN")).toBe(true);
  });

  it("detects impossibility after discarding the last copy", () => {
    const rules = createStandardRules({
      colors: [
        {
          ...createStandardColor("red", "Red", "#e74c3c"),
          numbers: [{ value: 1, count: 1 }],
        },
      ],
      handSize: 1,
      maxPointers: 0,
    });

    let state = createInitialState({
      rules,
      players: players.slice(0, 2),
      seedRng: createRng(99),
    });

    const redOne = cardInHand(state, "p1", (c) => c.colorId === "red" && c.number === 1);
    const result = applyAction(state, {
      type: "DISCARD_CARD",
      playerId: "p1",
      cardId: redOne,
    });

    expect(result.state.phase).toBe("lost");
    expect(result.events.some((e) => e.type === "IMPOSSIBILITY_DETECTED")).toBe(true);
  });

  it("ends the game when all colors are complete", () => {
    const rules = createStandardRules({
      colors: [
        {
          ...createStandardColor("red", "Red", "#e74c3c"),
          numbers: [{ value: 1, count: 3 }],
        },
      ],
      handSize: 1,
    });

    let state = createInitialState({
      rules,
      players: players.slice(0, 2),
      seedRng: createRng(7),
    });

    state = {
      ...state,
      played: { red: [] },
      hands: { p1: [], p2: state.hands.p2 },
    };

    const redOne = Object.values(state.cardById).find(
      (c) => c.colorId === "red" && c.number === 1,
    )!;
    state.hands.p1 = [redOne.id];

    const result = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: redOne.id,
    });

    expect(result.state.phase).toBe("won");
    expect(result.events.some((e) => e.type === "GAME_WON")).toBe(true);
  });

  it("supports multiple actions per turn", () => {
    const rules = createStandardRules({ actionsPerTurn: 2, handSize: 5 });
    let state = createInitialState({
      rules,
      players: players.slice(0, 2),
      seedRng: createRng(3),
    });

    expect(state.actionsRemainingThisTurn).toBe(2);

    const card1 = state.hands.p1!.find((id) => id !== null)!;
    const card1Index = state.hands.p1!.indexOf(card1);
    let result = applyAction(state, {
      type: "DISCARD_CARD",
      playerId: "p1",
      cardId: card1,
    });
    expect(result.state.actionsRemainingThisTurn).toBe(1);
    expect(result.state.currentPlayerIndex).toBe(0);
    expect(result.state.hands.p1![card1Index]).toBeNull();

    const card2 = result.state.hands.p1!.find((id) => id !== null)!;
    result = applyAction(result.state, {
      type: "DISCARD_CARD",
      playerId: "p1",
      cardId: card2,
    });
    expect(result.state.currentPlayerIndex).toBe(1);
    expect(result.state.actionsRemainingThisTurn).toBe(2);
    expect(result.events.some((e) => e.type === "TURN_ENDED")).toBe(true);
  });

  it("keeps vacated hand slots until draw", () => {
    const state = createInitialState({
      rules: createStandardRules({ actionsPerTurn: 2 }),
      players: players.slice(0, 2),
      seedRng: createRng(42),
    });
    const current = state.players[state.currentPlayerIndex]!;
    const cardId = state.hands[current.id]!.find((id) => id !== null)!;
    const slotIndex = state.hands[current.id]!.indexOf(cardId);
    const result = applyAction(state, {
      type: "DISCARD_CARD",
      playerId: current.id,
      cardId,
    });
    expect(result.state.hands[current.id]![slotIndex]).toBeNull();
    expect(result.state.hands[current.id]!.filter((id) => id !== null).length).toBe(
      state.rules.handSize - 1,
    );
  });

  it("only host can pause and resume", () => {
    const state = startGame();
    const denied = applyAction(state, {
      type: "PAUSE",
      playerId: "p2",
    });
    expect(denied.error).toMatch(/host/);

    const paused = applyAction(state, { type: "PAUSE", playerId: "p1" });
    expect(paused.state.paused).toBe(true);

    const blocked = applyAction(paused.state, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: state.hands.p1[0]!,
    });
    expect(blocked.error).toMatch(/paused/);
  });
});
