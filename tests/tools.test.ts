import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { registerCreateFolderTool } from "../src/tools/tool_create_folder.js";
import { registerCreateRequestTool } from "../src/tools/tool_create_request.js";
import { registerDeleteRequestTool } from "../src/tools/tool_delete_request.js";
import { registerUpdateRequestTool } from "../src/tools/tool_update_request.js";

class MockMcpServer {
  public toolCalls: Array<{
    name: string;
    description: string;
    args: Record<string, z.ZodTypeAny>;
    handler: (...args: unknown[]) => unknown;
  }> = [];

  public server = {
    sendResourceUpdated: vi.fn(),
  };

  tool(
    name: string,
    description: string,
    args: Record<string, z.ZodTypeAny>,
    handler: (...args: unknown[]) => unknown
  ): void {
    this.toolCalls.push({ name, description, args, handler });
  }
}

describe("tool schemas", () => {
  it("requires create_request mandatory fields and allows template URLs", () => {
    const server = new MockMcpServer();
    registerCreateRequestTool(server as unknown as Parameters<typeof registerCreateRequestTool>[0]);
    const call = server.toolCalls.find((item) => item.name === "create_request");
    expect(call).toBeDefined();
    const schema = z.object(call!.args);

    const valid = {
      collectionId: "wrk_1",
      name: "My Request",
      method: "GET",
      url: "{{ _.base_url }}/users",
      headers: undefined,
      body: undefined,
      folderId: null,
      description: undefined,
      preRequestScript: undefined,
      afterResponseScript: undefined,
    };
    expect(schema.safeParse(valid).success).toBe(true);

    const missingRequired = {
      folderId: null,
      url: "https://example.com",
      method: "GET",
    } as unknown;
    expect(schema.safeParse(missingRequired).success).toBe(false);
  });

  it("enforces update_request required identifiers and optional payload", () => {
    const server = new MockMcpServer();
    registerUpdateRequestTool(server as unknown as Parameters<typeof registerUpdateRequestTool>[0]);
    const call = server.toolCalls.find((item) => item.name === "update_request");
    expect(call).toBeDefined();
    const schema = z.object(call!.args);

    const minimal = {
      collectionId: "wrk_1",
      requestId: "req_1",
    };
    expect(schema.safeParse(minimal).success).toBe(true);

    const optionalPayload = {
      collectionId: "wrk_1",
      requestId: "req_1",
      url: "{{ _.base_url }}/users",
      folderId: null,
      preRequestScript: null,
    };
    expect(schema.safeParse(optionalPayload).success).toBe(true);

    const missingIds = {
      url: "https://example.com",
    } as unknown;
    expect(schema.safeParse(missingIds).success).toBe(false);
  });

  it("requires identifiers for delete_request", () => {
    const server = new MockMcpServer();
    registerDeleteRequestTool(server as unknown as Parameters<typeof registerDeleteRequestTool>[0]);
    const call = server.toolCalls.find((item) => item.name === "delete_request");
    expect(call).toBeDefined();
    const schema = z.object(call!.args);

    expect(schema.safeParse({ collectionId: "wrk_1", requestId: "req_1" }).success).toBe(true);
    expect(schema.safeParse({ collectionId: "wrk_1" }).success).toBe(false);
  });

  it("ensures create_folder requires collectionId and name but optional metadata", () => {
    const server = new MockMcpServer();
    registerCreateFolderTool(server as unknown as Parameters<typeof registerCreateFolderTool>[0]);
    const call = server.toolCalls.find((item) => item.name === "create_folder");
    expect(call).toBeDefined();
    const schema = z.object(call!.args);

    const valid = {
      collectionId: "wrk_1",
      name: "Folder",
      parentId: null,
      description: undefined,
    };
    expect(schema.safeParse(valid).success).toBe(true);

    const missingName = {
      collectionId: "wrk_1",
    } as unknown;
    expect(schema.safeParse(missingName).success).toBe(false);
  });
});
