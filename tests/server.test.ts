import { describe, expect, it } from "vitest";
import { createServer } from "../src/server.js";
import { SERVER_INFO } from "../src/constants.js";

describe("server", () => {
  it("creates an MCP server instance", () => {
    const server = createServer();
    expect(server).toBeDefined();
    // McpServer doesn't expose name/version directly, they're in SERVER_INFO
    expect(SERVER_INFO.name).toBeDefined();
    expect(SERVER_INFO.version).toBeDefined();
  });

  it("has proper server info configuration", () => {
    createServer();
    expect(SERVER_INFO.name).toMatch(/insomnia/i);
    expect(SERVER_INFO.version).toBeDefined();
  });
});
