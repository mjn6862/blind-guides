import { describe, expect, it } from "vitest";
import { buildRecentTurnSummaries, formatGameEvent } from "./history-format.js";
import { slotLabel } from "./slots.js";

describe("slotLabel", () => {
  it("maps indices to letters", () => {
    expect(slotLabel(0)).toBe("A");
    expect(slotLabel(1)).toBe("B");
    expect(slotLabel(4)).toBe("E");
  });
});

describe("formatGameEvent", () => {
  const players = [
    { id: "p1", displayName: "Alice" },
    { id: "p2", displayName: "Bob" },
  ];
  const colors = [
    {
      id: "red",
      displayName: "Red",
      displayColor: "#f00",
      numbers: [],
      playability: { type: "standard" as const },
      onPlay: [],
      onDiscard: [],
      onMisplay: [],
      clueMatching: { type: "standard" as const },
      canBeClued: true,
    },
    {
      id: "yellow",
      displayName: "Yellow",
      displayColor: "#ff0",
      numbers: [],
      playability: { type: "standard" as const },
      onPlay: [],
      onDiscard: [],
      onMisplay: [],
      clueMatching: { type: "standard" as const },
      canBeClued: true,
    },
  ];

  it("formats play with slot label and card", () => {
    const text = formatGameEvent(
      {
        type: "CARD_PLAYED",
        playerId: "p1",
        slotLabel: "B",
        card: { id: "c1", colorId: "red", number: 3 },
      },
      players,
      colors,
    );
    expect(text).toBe("Alice played card B, a Red 3");
  });

  it("formats misplay separately from discard", () => {
    const text = formatGameEvent(
      {
        type: "CARD_DISCARDED",
        playerId: "p1",
        slotLabel: "D",
        misplay: true,
        card: { id: "c1", colorId: "yellow", number: 2 },
      },
      players,
      colors,
    );
    expect(text).toBe("Alice misplayed card D, a Yellow 2");
  });

  it("formats clue with matched slots", () => {
    const text = formatGameEvent(
      {
        type: "CLUE_GIVEN",
        fromPlayerId: "p1",
        toPlayerId: "p2",
        clue: { kind: "color", colorId: "red" },
        matchedCardIds: ["c1", "c2", "c3"],
        matchedSlotLabels: ["B", "D", "E"],
      },
      players,
      colors,
    );
    expect(text).toBe("Alice → Bob: Red - Cards B, D, and E matched");
  });
});

describe("buildRecentTurnSummaries", () => {
  const players = [
    { id: "p1", displayName: "Alice" },
    { id: "p2", displayName: "Bob" },
  ];
  const colors = [
    {
      id: "red",
      displayName: "Red",
      displayColor: "#f00",
      numbers: [],
      playability: { type: "standard" as const },
      onPlay: [],
      onDiscard: [],
      onMisplay: [],
      clueMatching: { type: "standard" as const },
      canBeClued: true,
    },
  ];

  it("shows only the latest turn per player, most recent first", () => {
    const summaries = buildRecentTurnSummaries(
      [
        {
          index: 0,
          turnNumber: 1,
          events: [
            { type: "TURN_STARTED", playerId: "p1", turnNumber: 1 },
            {
              type: "CARD_PLAYED",
              playerId: "p1",
              slotLabel: "A",
              card: { id: "c1", colorId: "red", number: 1 },
            },
            { type: "POINTER_GAINED", amount: 1 },
            { type: "TURN_ENDED", playerId: "p1", turnNumber: 1 },
            { type: "TURN_STARTED", playerId: "p2", turnNumber: 2 },
            { type: "POINTER_SPENT", amount: 1 },
            {
              type: "CLUE_GIVEN",
              fromPlayerId: "p2",
              toPlayerId: "p1",
              clue: { kind: "number", number: 2 },
              matchedCardIds: ["c2"],
              matchedSlotLabels: ["C"],
            },
            { type: "TURN_ENDED", playerId: "p2", turnNumber: 1 },
          ],
          state: {} as never,
        },
      ],
      players,
      colors,
      "p1",
    );

    expect(summaries).toHaveLength(2);
    expect(summaries[0]!.playerName).toBe("Bob");
    expect(summaries[0]!.lines).toContain("Spent 1 pointer");
    expect(summaries[1]!.playerName).toBe("Alice");
    expect(summaries[1]!.lines).toContain("Gained 1 pointer");
  });
});
