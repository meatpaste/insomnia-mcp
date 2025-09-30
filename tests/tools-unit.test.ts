import { describe, expect, it, vi } from "vitest";
import { registerTools } from "../src/tools.js";

// Mock MCP server
class MockMcpServer {
  public tools: Map<string, any> = new Map();

  tool(name: string, description: string, argsOrHandler?: any, maybeHandler?: any): void {
    // Handle both overloads:
    // tool(name, description, handler) - for tools without args
    // tool(name, description, args, handler) - for tools with args
    const handler = maybeHandler !== undefined ? maybeHandler : argsOrHandler;
    const args = maybeHandler !== undefined ? argsOrHandler : {};
    this.tools.set(name, { name, description, args, handler });
  }
}

describe("tools registration", () => {
  it("registers all expected tools", () => {
    const mockServer = new MockMcpServer();
    registerTools(mockServer as any);

    const expectedTools = [
      "list_collections",
      "create_collection",
      "create_request",
      "update_request",
      "delete_request",
      "get_request",
      "create_folder",
      "update_folder",
      "delete_folder",
      "get_folder",
      "set_environment_variable",
      "get_environment",
      "get_environment_variable",
      "get_collection",
    ];

    expect(mockServer.tools.size).toBe(expectedTools.length);

    for (const toolName of expectedTools) {
      expect(mockServer.tools.has(toolName)).toBe(true);
      const tool = mockServer.tools.get(toolName);
      expect(tool.name).toBe(toolName);
      expect(typeof tool.description).toBe("string");
      expect(tool.description.length).toBeGreaterThan(0);
      expect(typeof tool.handler).toBe("function");
    }
  });

  it("registers tools with proper schema validation", () => {
    const mockServer = new MockMcpServer();
    registerTools(mockServer as any);

    // Check specific tool schemas
    const createRequestTool = mockServer.tools.get("create_request");
    expect(createRequestTool.args.collectionId).toBeDefined();
    expect(createRequestTool.args.name).toBeDefined();
    expect(createRequestTool.args.method).toBeDefined();
    expect(createRequestTool.args.url).toBeDefined();

    const updateRequestTool = mockServer.tools.get("update_request");
    expect(updateRequestTool.args.collectionId).toBeDefined();
    expect(updateRequestTool.args.requestId).toBeDefined();

    const createFolderTool = mockServer.tools.get("create_folder");
    expect(createFolderTool.args.collectionId).toBeDefined();
    expect(createFolderTool.args.name).toBeDefined();
  });
});