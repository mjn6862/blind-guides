import { describe, expect, it } from "vitest";
import {
  applyPlayerOrderAction,
  orderPlayersByIds,
  shufflePlayerIds,
} from "./player-order.js";

const players = [
  { id: "host", displayName: "Host" },
  { id: "b", displayName: "Bob" },
  { id: "c", displayName: "Carol" },
];

describe("orderPlayersByIds", () => {
  it("orders by id list", () => {
    const ordered = orderPlayersByIds(players, ["c", "host", "b"]);
    expect(ordered.map((p) => p.id)).toEqual(["c", "host", "b"]);
  });
});

describe("applyPlayerOrderAction", () => {
  it("randomizes order", () => {
    const order = applyPlayerOrderAction(
      players,
      ["host", "b", "c"],
      ["host", "b", "c"],
      { type: "randomize" },
      () => 0,
    );
    expect(order).toHaveLength(3);
    expect(new Set(order)).toEqual(new Set(["host", "b", "c"]));
  });

  it("moves a player up", () => {
    const order = applyPlayerOrderAction(
      players,
      ["host", "b", "c"],
      ["host", "b", "c"],
      { type: "move", playerId: "b", direction: "up" },
    );
    expect(order).toEqual(["b", "host", "c"]);
  });
});

describe("shufflePlayerIds", () => {
  it("returns a permutation", () => {
    const shuffled = shufflePlayerIds(["a", "b", "c"], () => 0.99);
    expect(shuffled.sort()).toEqual(["a", "b", "c"]);
  });
});
