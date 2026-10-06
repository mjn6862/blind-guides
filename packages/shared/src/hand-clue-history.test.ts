import { describe, expect, it } from "vitest";
import { uniqueClueLabels } from "./hand-clue-history.js";

describe("uniqueClueLabels", () => {
  it("removes duplicate clue labels", () => {
    expect(uniqueClueLabels(["5", "Red", "5", "5"])).toEqual(["5", "Red"]);
  });
});
