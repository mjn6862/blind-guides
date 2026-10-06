import { describe, expect, it, afterEach } from "vitest";
import { isHostPasswordRequired, verifyHostPassword } from "./host-auth.js";

describe("host-auth", () => {
  const original = process.env.HOST_PASSWORD;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.HOST_PASSWORD;
    } else {
      process.env.HOST_PASSWORD = original;
    }
  });

  it("does not require password when HOST_PASSWORD is unset", () => {
    delete process.env.HOST_PASSWORD;
    expect(isHostPasswordRequired()).toBe(false);
    expect(verifyHostPassword(undefined)).toBe(true);
    expect(verifyHostPassword("anything")).toBe(true);
  });

  it("requires matching password when HOST_PASSWORD is set", () => {
    process.env.HOST_PASSWORD = "secret-host-key";
    expect(isHostPasswordRequired()).toBe(true);
    expect(verifyHostPassword(undefined)).toBe(false);
    expect(verifyHostPassword("wrong")).toBe(false);
    expect(verifyHostPassword("secret-host-key")).toBe(true);
  });
});
