import { describe, expect, it } from "vitest";
import {
  buildCardTurnMetadata,
  buildHistoryLines,
  buildPlayedTurnLookup,
} from "./card-turn-metadata.js";

describe("buildCardTurnMetadata", () => {
  it("tracks draw, play, and discard turns from events", () => {
    const meta = buildCardTurnMetadata([
      {
        index: 0,
        turnNumber: 1,
        events: [
          { type: "TURN_STARTED", playerId: "p1", turnNumber: 1 },
          {
            type: "CARD_PLAYED",
            playerId: "p1",
            slotLabel: "A",
            card: { id: "c-play", colorId: "red", number: 1 },
          },
          { type: "TURN_ENDED", playerId: "p1", turnNumber: 1 },
          { type: "CARDS_DRAWN", playerId: "p1", cardIds: ["c-draw"] },
          { type: "TURN_STARTED", playerId: "p2", turnNumber: 2 },
          {
            type: "CARD_DISCARDED",
            playerId: "p2",
            slotLabel: "B",
            misplay: true,
            card: { id: "c-disc", colorId: "blue", number: 3 },
          },
        ],
        state: {} as never,
      },
    ]);

    expect(meta["c-play"]?.playedTurn).toBe(1);
    expect(meta["c-draw"]?.drawnTurn).toBe(1);
    expect(meta["c-disc"]?.discardedTurn).toBe(2);
    expect(meta["c-disc"]?.misplay).toBe(true);
  });
});

describe("buildPlayedTurnLookup", () => {
  it("maps color:number to played turn", () => {
    const lookup = buildPlayedTurnLookup([
      {
        index: 0,
        turnNumber: 3,
        events: [
          { type: "TURN_STARTED", playerId: "p1", turnNumber: 3 },
          {
            type: "CARD_PLAYED",
            playerId: "p1",
            slotLabel: "C",
            card: { id: "c1", colorId: "green", number: 2 },
          },
        ],
        state: {} as never,
      },
    ]);

    expect(lookup["green:2"]).toBe(3);
  });
});

describe("buildHistoryLines", () => {
  it("assigns turn numbers from TURN_STARTED boundaries", () => {
    const lines = buildHistoryLines(
      [
        {
          index: 0,
          turnNumber: 2,
          events: [
            { type: "TURN_STARTED", playerId: "p2", turnNumber: 2 },
            { type: "POINTER_SPENT", amount: 1 },
          ],
          state: {} as never,
        },
      ],
      [{ id: "p2", displayName: "Bob" }],
      [{ id: "red", displayName: "Red", displayColor: "#f00", numbers: [], playability: { type: "standard" }, onPlay: [], onDiscard: [], onMisplay: [], clueMatching: { type: "standard" }, canBeClued: true }],
    );

    expect(lines[0]?.turnNumber).toBe(2);
    expect(lines[0]?.summary).toContain("Spent 1 pointer");
  });
});
