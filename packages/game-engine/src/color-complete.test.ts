import { describe, expect, it } from "vitest";
import { createStandardColor, createStandardRules } from "@blind-guides/shared";
import { applyAction } from "./actions.js";
import { createInitialState } from "./state.js";
import { createRng } from "./test-utils.js";

describe("color completion bonus", () => {
  const players = [
    { id: "p1", displayName: "Alice" },
    { id: "p2", displayName: "Bob" },
  ];

  it("gains a pointer when completing a color", () => {
    const rules = createStandardRules({
      colors: [createStandardColor("red", "Red", "#e74c3c")],
      handSize: 1,
      maxPointers: 8,
    });

    let state = createInitialState({
      rules,
      players,
      seedRng: createRng(5),
    });

    state = {
      ...state,
      pointers: 7,
      played: { red: [1, 2, 3, 4] },
    };

    const five = Object.values(state.cardById).find(
      (c) => c.colorId === "red" && c.number === 5,
    )!;
    state.hands.p1 = [five.id];

    const result = applyAction(state, {
      type: "PLAY_CARD",
      playerId: "p1",
      cardId: five.id,
    });

    expect(result.state.pointers).toBe(8);
    expect(result.events.some((e) => e.type === "POINTER_GAINED")).toBe(true);
  });
});
