import { describe, expect, it } from "vitest";
import { createStandardRules } from "@blind-guides/shared";
import { advanceToNextPlayer } from "./state.js";
import { createInitialState } from "./state.js";

describe("per-player turn numbers", () => {
  const players = [
    { id: "p1", displayName: "Alice" },
    { id: "p2", displayName: "Bob" },
  ];

  it("increments turn number on each player advance", () => {
    const state = createInitialState({
      rules: createStandardRules(),
      players,
      seedRng: () => 0.5,
    });

    expect(state.turnNumber).toBe(1);
    expect(state.currentPlayerIndex).toBe(0);

    const afterP2 = advanceToNextPlayer(state);
    expect(afterP2.turnNumber).toBe(2);
    expect(afterP2.currentPlayerIndex).toBe(1);

    const afterP1Again = advanceToNextPlayer(afterP2);
    expect(afterP1Again.turnNumber).toBe(3);
    expect(afterP1Again.currentPlayerIndex).toBe(0);
  });
});
