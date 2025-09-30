/**
 * Integration tests for MCP protocol interaction
 * Tests the full flow from MCP tool call through to storage
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { promises as fs } from "node:fs";
import path from "node:path";

import { registerTools } from "../src/tools.js";
import { __resetStorageCacheForTests } from "../src/storage.js";

const TEST_DATA_DIR = path.join(
  process.cwd(),
  "tests",
  "__fixtures__",
  `integration-${Date.now()}`
);

async function cleanup() {
  await fs.rm(TEST_DATA_DIR, { recursive: true, force: true });
}

async function ensureDir() {
  await fs.mkdir(TEST_DATA_DIR, { recursive: true });
}

// Mock MCP server for integration testing
class IntegrationMockServer {
  public tools: Map<string, any> = new Map();
  public resourceUpdates: string[] = [];
  public resourceListChanged = false;

  tool(name: string, description: string, argsOrHandler?: any, maybeHandler?: any): void {
    const handler = maybeHandler !== undefined ? maybeHandler : argsOrHandler;
    const args = maybeHandler !== undefined ? argsOrHandler : {};
    this.tools.set(name, { name, description, args, handler });
  }

  // Mock the server.server property for resource updates
  server = {
    sendResourceUpdated: async ({ uri }: { uri: string }) => {
      this.resourceUpdates.push(uri);
    },
  };

  sendResourceListChanged() {
    this.resourceListChanged = true;
  }

  async callTool(name: string, args: any) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }
    return tool.handler(args);
  }
}

describe("MCP Protocol Integration", () => {
  beforeEach(async () => {
    process.env.INSOMNIA_APP_DATA_DIR = TEST_DATA_DIR;
    process.env.INSOMNIA_MCP_PROJECT_ID = "proj_integration_test";
    __resetStorageCacheForTests();
    await cleanup();
    await ensureDir();
  });

  afterEach(async () => {
    await cleanup();
    delete process.env.INSOMNIA_APP_DATA_DIR;
    delete process.env.INSOMNIA_MCP_PROJECT_ID;
    __resetStorageCacheForTests();
  });

  it("should register all expected tools", () => {
    const mockServer = new IntegrationMockServer();
    registerTools(mockServer as any);

    const expectedTools = [
      "list_collections",
      "create_collection",
      "get_collection",
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
    ];

    expect(mockServer.tools.size).toBe(expectedTools.length);
    expectedTools.forEach((toolName) => {
      expect(mockServer.tools.has(toolName)).toBe(true);
    });
  });

  it("should complete full workflow: create collection, folder, and request", async () => {
    const mockServer = new IntegrationMockServer();
    registerTools(mockServer as any);

    // Step 1: Create collection
    const createCollectionResult = await mockServer.callTool("create_collection", {
      name: "Test API",
      description: "Integration test collection",
    });

    expect(createCollectionResult.content[0].text).toContain("✅ Created collection");
    expect(createCollectionResult.content[0].text).toContain("Test API");
    expect(mockServer.resourceListChanged).toBe(true);

    // Extract collection ID from response
    const collectionIdMatch =
      createCollectionResult.content[0].text.match(/Collection ID: (wrk_\w+)/);
    expect(collectionIdMatch).toBeTruthy();
    const collectionId = collectionIdMatch![1];

    // Step 2: Create folder
    const createFolderResult = await mockServer.callTool("create_folder", {
      collectionId,
      name: "API Endpoints",
      description: "Main endpoints",
    });

    expect(createFolderResult.content[0].text).toContain("✅ Created folder");
    expect(createFolderResult.content[0].text).toContain("API Endpoints");
    expect(mockServer.resourceUpdates).toContain(`insomnia://collection/${collectionId}`);

    // Extract folder ID
    const folderIdMatch = createFolderResult.content[0].text.match(/Folder ID: (fld_\w+)/);
    expect(folderIdMatch).toBeTruthy();
    const folderId = folderIdMatch![1];

    // Step 3: Create request in folder
    const createRequestResult = await mockServer.callTool("create_request", {
      collectionId,
      folderId,
      name: "Get Users",
      method: "GET",
      url: "https://api.example.com/users",
      headers: [{ name: "Authorization", value: "Bearer {{token}}" }],
    });

    expect(createRequestResult.content[0].text).toContain("✅ Created request");
    expect(createRequestResult.content[0].text).toContain("Get Users");
    expect(createRequestResult.content[0].text).toContain("GET");
    expect(createRequestResult.content[0].text).toContain("https://api.example.com/users");

    // Step 4: Verify collection contains all items
    const getCollectionResult = await mockServer.callTool("get_collection", {
      collectionId,
    });

    const collectionData = JSON.parse(getCollectionResult.content[0].text);
    expect(collectionData.name).toBe("Test API");
    expect(collectionData.folders).toHaveLength(1);
    expect(collectionData.folders[0].name).toBe("API Endpoints");
    expect(collectionData.requests).toHaveLength(1);
    expect(collectionData.requests[0].name).toBe("Get Users");
  });

  it("should handle tool errors gracefully", async () => {
    const mockServer = new IntegrationMockServer();
    registerTools(mockServer as any);

    // Try to get non-existent collection
    await expect(
      mockServer.callTool("get_collection", {
        collectionId: "wrk_nonexistent",
      })
    ).rejects.toThrow("Collection wrk_nonexistent not found");
  });

  it("should validate required fields", async () => {
    const mockServer = new IntegrationMockServer();
    registerTools(mockServer as any);

    // Try to create request without required fields
    await expect(
      mockServer.callTool("create_request", {
        collectionId: "wrk_test",
        // Missing: name, method, url
      })
    ).rejects.toThrow();
  });

  it("should handle environment variables", async () => {
    const mockServer = new IntegrationMockServer();
    registerTools(mockServer as any);

    // Create collection
    const createResult = await mockServer.callTool("create_collection", {
      name: "Env Test",
    });

    const collectionIdMatch = createResult.content[0].text.match(/Collection ID: (wrk_\w+)/);
    const collectionId = collectionIdMatch![1];

    // Set environment variable
    await mockServer.callTool("set_environment_variable", {
      collectionId,
      key: "baseUrl",
      value: "https://api.example.com",
    });

    // Get environment
    const envResult = await mockServer.callTool("get_environment", {
      collectionId,
    });

    const envData = JSON.parse(envResult.content[0].text);
    expect(envData.variables.baseUrl).toBe("https://api.example.com");

    // Get specific variable
    const varResult = await mockServer.callTool("get_environment_variable", {
      collectionId,
      key: "baseUrl",
    });

    expect(varResult.content[0].text).toContain("https://api.example.com");
  });

  it("should update and delete requests", async () => {
    const mockServer = new IntegrationMockServer();
    registerTools(mockServer as any);

    // Setup: Create collection and request
    const createCollectionResult = await mockServer.callTool("create_collection", {
      name: "Update Test",
    });
    const collectionIdMatch =
      createCollectionResult.content[0].text.match(/Collection ID: (wrk_\w+)/);
    const collectionId = collectionIdMatch![1];

    const createRequestResult = await mockServer.callTool("create_request", {
      collectionId,
      name: "Original Name",
      method: "GET",
      url: "https://api.example.com/v1",
    });
    const requestIdMatch = createRequestResult.content[0].text.match(/Request ID: (req_\w+)/);
    const requestId = requestIdMatch![1];

    // Update request
    const updateResult = await mockServer.callTool("update_request", {
      collectionId,
      requestId,
      name: "Updated Name",
      method: "POST",
      url: "https://api.example.com/v2",
    });

    expect(updateResult.content[0].text).toContain("✅ Updated request");
    expect(updateResult.content[0].text).toContain("Updated Name");

    // Verify update
    const getResult = await mockServer.callTool("get_request", {
      collectionId,
      requestId,
    });
    const requestData = JSON.parse(getResult.content[0].text);
    expect(requestData.name).toBe("Updated Name");
    expect(requestData.method).toBe("POST");

    // Delete request
    const deleteResult = await mockServer.callTool("delete_request", {
      collectionId,
      requestId,
    });

    expect(deleteResult.content[0].text).toContain("✅ Deleted request");

    // Verify deletion
    await expect(
      mockServer.callTool("get_request", {
        collectionId,
        requestId,
      })
    ).rejects.toThrow();
  });
});
