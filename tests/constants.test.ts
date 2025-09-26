import { describe, expect, it } from "vitest";
import { SERVER_INFO, SERVER_INSTRUCTIONS } from "../src/constants.js";

describe("constants", () => {
  it("exports SERVER_INFO with required fields", () => {
    expect(SERVER_INFO).toBeDefined();
    expect(SERVER_INFO.name).toBeDefined();
    expect(SERVER_INFO.version).toBeDefined();
    expect(typeof SERVER_INFO.name).toBe("string");
    expect(typeof SERVER_INFO.version).toBe("string");
  });

  it("exports SERVER_INSTRUCTIONS as string", () => {
    expect(SERVER_INSTRUCTIONS).toBeDefined();
    expect(typeof SERVER_INSTRUCTIONS).toBe("string");
    expect(SERVER_INSTRUCTIONS.length).toBeGreaterThan(0);
  });

  it("has meaningful server info values", () => {
    expect(SERVER_INFO.name).toMatch(/insomnia/i);
    expect(SERVER_INFO.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});