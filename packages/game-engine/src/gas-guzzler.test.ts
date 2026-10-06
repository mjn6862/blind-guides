import { describe, expect, it } from "vitest";
import { getColorPreset } from "@blind-guides/shared";
import { applyAction } from "./actions.js";
import { createInitialState } from "./state.js";
import { createRng } from "./test-utils.js";

describe("Gas Guzzler", () => {
  const players = [
    { id: "p1", displayName: "Alice" },
    { id: "p2", displayName: "Bob" },
  ];

  it("gains a pointer on discard when number not yet played in color", () => {
    const gas = getColorPreset("gas_guzzler").config;
    let state = createInitialState({
      rules: {
        colors: [gas],
        maxPointers: 8,
        maxStumbles: 3,
        handSize: 1,
        actionsPerTurn: 1,
        openHand: false,
        ranked: false,
      },
      players,
      seedRng: createRng(1),
    });

    state = { ...state, pointers: 7 };

    const cardId = state.hands.p1!.find((id) => id !== null)!;
    const result = applyAction(state, {
      type: "DISCARD_CARD",
      playerId: "p1",
      cardId,
    });

    expect(result.state.pointers).toBe(8);
  });

  it("does not gain a pointer when same number already on pile", () => {
    const gas = getColorPreset("gas_guzzler").config;
    let state = createInitialState({
      rules: {
        colors: [gas],
        maxPointers: 5,
        maxStumbles: 3,
        handSize: 1,
        actionsPerTurn: 1,
        openHand: false,
        ranked: false,
      },
      players,
      seedRng: createRng(2),
    });

    state = {
      ...state,
      pointers: 5,
      played: { gas_guzzler: [1] },
    };

    const card = Object.values(state.cardById).find(
      (c) => c.colorId === "gas_guzzler" && c.number === 1,
    );
    if (!card) return;
    state.hands.p1 = [card.id];

    const result = applyAction(state, {
      type: "DISCARD_CARD",
      playerId: "p1",
      cardId: card.id,
    });

    expect(result.state.pointers).toBe(5);
  });
});
