import { describe, expect, it } from "vitest";
import { createStandardColor, createStandardRules } from "./defaults.js";
import { getColorPreset } from "./presets.js";
import {
  buildRulesSummary,
  describeColorRules,
  describeGlobalRules,
} from "./rules-format.js";

describe("describeGlobalRules", () => {
  it("includes core game rules", () => {
    const lines = describeGlobalRules(createStandardRules());
    expect(lines.some((line) => line.includes("Pointers"))).toBe(true);
    expect(lines.some((line) => line.includes("Completing a color"))).toBe(true);
  });
});

describe("describeColorRules", () => {
  it("summarizes standard colors briefly", () => {
    const color = createStandardColor("red", "Red", "#e74c3c");
    const lines = describeColorRules(color, [color]);
    expect(lines[0]).toBe("Standard color");
  });

  it("describes opposite day preset effects", () => {
    const color = getColorPreset("opposite_day").config;
    const lines = describeColorRules(color, [color]);
    expect(lines.some((line) => line.includes("Misplay gains a pointer"))).toBe(true);
    expect(lines.some((line) => line.includes("On discard"))).toBe(true);
    expect(lines.some((line) => line.includes("stumble"))).toBe(true);
  });

  it("describes rainno per-rank clue matching", () => {
    const rainno = getColorPreset("rainno").config;
    const ghostno = getColorPreset("ghostno").config;
    const gasGuzzler = getColorPreset("gas_guzzler").config;
    const oppositeDay = getColorPreset("opposite_day").config;
    const backpedal = getColorPreset("backpedal").config;
    const green = createStandardColor("green", "Green", "#2ecc71");
    const red = createStandardColor("red", "Red", "#e74c3c");
    const blue = createStandardColor("blue", "Blue", "#3498db");
    const allColors = [rainno, ghostno, gasGuzzler, oppositeDay, backpedal, green, red, blue];
    const lines = describeColorRules(rainno, allColors);
    const clueLine = lines.find((line) => line.includes("number clue"));
    expect(clueLine).toContain("Matches only a 5 number clue");
    expect(clueLine).toContain("1s match only Orange, Forest Green, Green");
    expect(clueLine).toContain("2s match only Orange, Pink, Red");
    expect(clueLine).toContain("3s match only Orange");
    expect(clueLine).toContain("4s match every color except Orange");
    expect(clueLine).toContain("5s match only Orange, Black, Blue");
  });

  it("describes ghostno per-rank clue matching with no number clues", () => {
    const rainno = getColorPreset("rainno").config;
    const ghostno = getColorPreset("ghostno").config;
    const gasGuzzler = getColorPreset("gas_guzzler").config;
    const oppositeDay = getColorPreset("opposite_day").config;
    const backpedal = getColorPreset("backpedal").config;
    const green = createStandardColor("green", "Green", "#2ecc71");
    const red = createStandardColor("red", "Red", "#e74c3c");
    const blue = createStandardColor("blue", "Blue", "#3498db");
    const allColors = [rainno, ghostno, gasGuzzler, oppositeDay, backpedal, green, red, blue];
    const lines = describeColorRules(ghostno, allColors);
    const clueLine = lines.find((line) => line.includes("number clue"));
    expect(clueLine).toContain("Matches no number clues");
    expect(clueLine).toContain("1s match only Sky Blue, Forest Green, Green");
    expect(clueLine).toContain("4s match every color except Sky Blue");
  });
});

describe("buildRulesSummary", () => {
  it("includes global and per-color sections", () => {
    const rules = createStandardRules({
      colors: [
        createStandardColor("red", "Red", "#e74c3c"),
        getColorPreset("rainbow").config,
      ],
    });
    const summary = buildRulesSummary(rules);
    expect(summary.global.length).toBeGreaterThan(0);
    expect(summary.colors).toHaveLength(2);
    expect(summary.colors[1]!.presetLabel).toBe("Rainbow");
  });
});
