import { describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";

describe("server", () => {
  it("creates an MCP server instance", () => {
    const server = createServer();
    expect(server).toBeDefined();
    expect(server.name).toBeDefined();
    expect(server.version).toBeDefined();
  });

  it("has proper server info configuration", () => {
    const server = createServer();
    expect(server.name).toMatch(/insomnia/i);
    expect(server.version).toBeDefined();
  });
});