import { describe, expect, it } from "vitest";
import { createStandardRules } from "./defaults.js";
import { buildGameExport, validateGameExport } from "./game-export.js";

describe("game-export", () => {
  const rules = createStandardRules();

  it("round-trips a valid export", () => {
    const payload = buildGameExport({
      inviteCode: "ABCD12",
      hostId: "host-1",
      status: "playing",
      rules,
      players: [
        { id: "host-1", displayName: "Alice" },
        { id: "p2", displayName: "Bob" },
      ],
      playerOrder: ["host-1", "p2"],
      joinOrder: ["host-1", "p2"],
      state: {
        rules,
        players: [
          { id: "host-1", displayName: "Alice" },
          { id: "p2", displayName: "Bob" },
        ],
        phase: "playing",
        turnNumber: 1,
        currentPlayerIndex: 0,
        actionsRemainingThisTurn: 2,
        hands: { "host-1": [], p2: [] },
        cardById: {},
        deck: [],
        discard: [],
        played: {},
        pointers: 8,
        stumbles: 0,
        slotsVacatedThisTurn: 0,
        paused: false,
      },
      turnHistory: [{ index: 0, turnNumber: 1, events: [] }],
      notes: { "host-1": "note" },
    });

    const validated = validateGameExport(payload);
    expect("error" in validated).toBe(false);
    if ("error" in validated) return;
    expect(validated.export.players).toHaveLength(2);
    expect(validated.export.notes["host-1"]).toBe("note");
  });

  it("rejects unsupported versions", () => {
    const result = validateGameExport({ version: 99 });
    expect(result).toEqual({ error: "Unsupported export version (expected 2)" });
  });
});
