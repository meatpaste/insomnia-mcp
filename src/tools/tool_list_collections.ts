import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { listCollections } from "../storage.js";

export function registerListCollectionsTool(server: McpServer): void {
  server.tool("list_collections", "List all available Insomnia collections", async () => {
    const collections = await listCollections();
    return {
      content: [
        {
          type: "text" as const,
          text: JSON.stringify(
            collections.map((collection) => ({
              id: collection.id,
              name: collection.name,
              description: collection.description,
              requestCount: collection.requests.length,
              updatedAt: collection.updatedAt,
            })),
            null,
            2
          ),
        },
      ],
    };
  });
}
