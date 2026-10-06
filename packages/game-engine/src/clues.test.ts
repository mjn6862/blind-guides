import { describe, expect, it } from "vitest";
import { getColorPreset } from "@blind-guides/shared";
import { cardMatchesClue, getMatchingCardsInHand } from "./clues.js";
import { createInitialState } from "./state.js";
import { createRng } from "./test-utils.js";

describe("rainbow every_color clue matching", () => {
  const players = [
    { id: "p1", displayName: "Alice" },
    { id: "p2", displayName: "Bob" },
  ];

  it("matches number clues by value and all color clues", () => {
    const rainbow = getColorPreset("rainbow").config;
    const gas = getColorPreset("gas_guzzler").config;

    expect(
      cardMatchesClue(
        { id: "r1", colorId: "rainbow", number: 1 },
        { kind: "number", number: 1 },
        rainbow,
      ),
    ).toBe(true);
    expect(
      cardMatchesClue(
        { id: "r1", colorId: "rainbow", number: 1 },
        { kind: "number", number: 2 },
        rainbow,
      ),
    ).toBe(false);
    expect(
      cardMatchesClue(
        { id: "r1", colorId: "rainbow", number: 1 },
        { kind: "color", colorId: "red" },
        rainbow,
      ),
    ).toBe(true);

    let state = createInitialState({
      rules: {
        colors: [rainbow, gas],
        maxPointers: 8,
        maxStumbles: 3,
        handSize: 2,
        actionsPerTurn: 1,
        openHand: false,
        ranked: false,
      },
      players,
      seedRng: createRng(3),
    });

    const rainbowOne = Object.values(state.cardById).find(
      (c) => c.colorId === "rainbow" && c.number === 1,
    )!;
    const gasOne = Object.values(state.cardById).find(
      (c) => c.colorId === "gas_guzzler" && c.number === 1,
    )!;
    state = {
      ...state,
      hands: { ...state.hands, p2: [rainbowOne.id, gasOne.id] },
    };

    const matched = getMatchingCardsInHand(state, "p2", { kind: "number", number: 1 });
    expect(matched.map((c) => c.id).sort()).toEqual([gasOne.id, rainbowOne.id].sort());
  });

  it("matches number clues when clue number is a string (JSON edge case)", () => {
    const rainbow = getColorPreset("rainbow").config;
    const players = [
      { id: "p1", displayName: "Alice" },
      { id: "p2", displayName: "Bob" },
    ];

    let state = createInitialState({
      rules: {
        colors: [rainbow],
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

    const rainbowOne = Object.values(state.cardById).find(
      (c) => c.colorId === "rainbow" && c.number === 1,
    )!;
    state = {
      ...state,
      hands: { ...state.hands, p2: [rainbowOne.id] },
    };

    const matched = getMatchingCardsInHand(state, "p2", {
      kind: "number",
      number: "1" as unknown as number,
    });
    expect(matched).toHaveLength(1);
    expect(matched[0]!.id).toBe(rainbowOne.id);
  });
});

describe("rainno by_rank clue matching", () => {
  const rainno = getColorPreset("rainno").config;

  it("only matches the 5 number clue, regardless of the card's own number", () => {
    for (const number of [1, 2, 3, 4, 5]) {
      expect(
        cardMatchesClue(
          { id: "c1", colorId: "rainno", number },
          { kind: "number", number: 5 },
          rainno,
        ),
      ).toBe(true);
      for (const other of [1, 2, 3, 4]) {
        expect(
          cardMatchesClue(
            { id: "c1", colorId: "rainno", number },
            { kind: "number", number: other },
            rainno,
          ),
        ).toBe(false);
      }
    }
  });

  it("matches 1s to orange (self), forest green, and green", () => {
    const card = { id: "c1", colorId: "rainno", number: 1 };
    for (const colorId of ["rainno", "gas_guzzler", "green"]) {
      expect(cardMatchesClue(card, { kind: "color", colorId }, rainno)).toBe(true);
    }
    for (const colorId of ["ghostno", "opposite_day", "red", "backpedal", "blue", "yellow"]) {
      expect(cardMatchesClue(card, { kind: "color", colorId }, rainno)).toBe(false);
    }
  });

  it("matches 2s to orange (self), pink, and red", () => {
    const card = { id: "c2", colorId: "rainno", number: 2 };
    for (const colorId of ["rainno", "opposite_day", "red"]) {
      expect(cardMatchesClue(card, { kind: "color", colorId }, rainno)).toBe(true);
    }
    for (const colorId of ["ghostno", "gas_guzzler", "green", "backpedal", "blue"]) {
      expect(cardMatchesClue(card, { kind: "color", colorId }, rainno)).toBe(false);
    }
  });

  it("matches 3s to orange (self) only", () => {
    const card = { id: "c3", colorId: "rainno", number: 3 };
    expect(cardMatchesClue(card, { kind: "color", colorId: "rainno" }, rainno)).toBe(true);
    for (const colorId of ["ghostno", "gas_guzzler", "green", "opposite_day", "red", "backpedal", "blue"]) {
      expect(cardMatchesClue(card, { kind: "color", colorId }, rainno)).toBe(false);
    }
  });

  it("matches 4s to every color except orange (self)", () => {
    const card = { id: "c4", colorId: "rainno", number: 4 };
    expect(cardMatchesClue(card, { kind: "color", colorId: "rainno" }, rainno)).toBe(false);
    for (const colorId of ["ghostno", "gas_guzzler", "green", "opposite_day", "red", "backpedal", "blue", "yellow"]) {
      expect(cardMatchesClue(card, { kind: "color", colorId }, rainno)).toBe(true);
    }
  });

  it("matches 5s to orange (self), black, and blue", () => {
    const card = { id: "c5", colorId: "rainno", number: 5 };
    for (const colorId of ["rainno", "backpedal", "blue"]) {
      expect(cardMatchesClue(card, { kind: "color", colorId }, rainno)).toBe(true);
    }
    for (const colorId of ["ghostno", "gas_guzzler", "green", "opposite_day", "red"]) {
      expect(cardMatchesClue(card, { kind: "color", colorId }, rainno)).toBe(false);
    }
  });
});

describe("ghostno by_rank clue matching", () => {
  const ghostno = getColorPreset("ghostno").config;

  it("never matches any number clue", () => {
    for (const number of [1, 2, 3, 4, 5]) {
      for (const clued of [1, 2, 3, 4, 5]) {
        expect(
          cardMatchesClue(
            { id: "c1", colorId: "ghostno", number },
            { kind: "number", number: clued },
            ghostno,
          ),
        ).toBe(false);
      }
    }
  });

  it("matches 1s to sky blue (self), forest green, and green", () => {
    const card = { id: "c1", colorId: "ghostno", number: 1 };
    for (const colorId of ["ghostno", "gas_guzzler", "green"]) {
      expect(cardMatchesClue(card, { kind: "color", colorId }, ghostno)).toBe(true);
    }
    for (const colorId of ["opposite_day", "red", "backpedal", "blue", "yellow"]) {
      expect(cardMatchesClue(card, { kind: "color", colorId }, ghostno)).toBe(false);
    }
  });

  it("matches 4s to every color except sky blue (self)", () => {
    const card = { id: "c4", colorId: "ghostno", number: 4 };
    expect(cardMatchesClue(card, { kind: "color", colorId: "ghostno" }, ghostno)).toBe(false);
    for (const colorId of ["gas_guzzler", "green", "opposite_day", "red", "backpedal", "blue", "yellow"]) {
      expect(cardMatchesClue(card, { kind: "color", colorId }, ghostno)).toBe(true);
    }
  });
});
