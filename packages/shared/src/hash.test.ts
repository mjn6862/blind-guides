import { describe, expect, it } from "vitest";
import { createStandardRules } from "./defaults.js";
import { canonicalizeRules, hashRules } from "./hash.js";

describe("hashRules", () => {
  it("produces stable hashes for identical rules", () => {
    const a = createStandardRules();
    const b = createStandardRules();
    expect(hashRules(a)).toBe(hashRules(b));
  });

  it("changes hash when rules differ", () => {
    const a = createStandardRules();
    const b = createStandardRules({ handSize: 4 });
    expect(hashRules(a)).not.toBe(hashRules(b));
  });

  it("canonicalizes color order", () => {
    const rules = createStandardRules();
    const reversed = {
      ...rules,
      colors: [...rules.colors].reverse(),
    };
    expect(canonicalizeRules(rules)).toBe(canonicalizeRules(reversed));
  });
});
